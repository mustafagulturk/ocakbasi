/**
 * Skor tablosu API'si.
 *
 *   POST  /api/players            oyuncu kaydı → { id, token }
 *   PATCH /api/players/me         ad / dükkân adı güncelleme
 *   POST  /api/runs               yeni oyun → { runId, seed }
 *   POST  /api/runs/:id/finish    hamle kaydı gönderilir, sunucu oyunu baştan oynatıp skoru kendisi hesaplar
 *   GET   /api/leaderboard        ?period=all|week
 *
 * İstemcinin gönderdiği skora hiç güvenilmez: skor yalnızca kayıt yeniden oynatılarak bulunur.
 */
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { DAY_SECONDS, type RunLog, replay } from "@ocakbasi/core";
import Fastify, { type FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db, Player } from "./db";

export interface AppOptions {
  db: Db;
  /** İzin verilen web adresleri (virgülle). Boşsa her yerden. */
  corsOrigin?: string;
  /** Bir günün en az kaç saniyede oynanabileceği (testlerde 0). */
  minDaySeconds?: number;
  logger?: boolean;
}

// Kontrol karakterlerini atıp boşlukları sadeleştirir
const temizMetin = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "Boş olamaz.").max(max, `En fazla ${max} karakter.`));

const ProfilGovde = z.object({ name: temizMetin(18), shop: temizMetin(26) });
const RunParam = z.object({ id: z.string().uuid() });
const LeaderSorgu = z.object({ period: z.enum(["all", "week"]).default("all") });

export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}

export function buildApp(o: AppOptions) {
  const { db } = o;
  const minDaySeconds = o.minDaySeconds ?? DAY_SECONDS * 0.9;
  const app = Fastify({ logger: o.logger ?? false, bodyLimit: 512 * 1024, trustProxy: true });

  app.register(cors, { origin: o.corsOrigin ? o.corsOrigin.split(",").map((s) => s.trim()) : true });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  // Gövdesiz POST isteklerine izin ver (ör. yeni oyun başlatma)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch {
      done(new HttpError(400, "Geçersiz JSON."), undefined);
    }
  });

  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ message: err.issues[0]?.message ?? "Geçersiz istek." });
    const code = err.statusCode ?? 500;
    if (code >= 500) app.log.error(err);
    return reply.code(code).send({ message: code >= 500 ? "Sunucu hatası." : err.message });
  });

  async function oyuncu(req: FastifyRequest, zorunlu: true): Promise<Player>;
  async function oyuncu(req: FastifyRequest, zorunlu: false): Promise<Player | null>;
  async function oyuncu(req: FastifyRequest, zorunlu: boolean) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
    const p = m ? await db.playerByToken(m[1]) : null;
    if (!p && zorunlu) throw new HttpError(401, "Oturum bulunamadı.");
    return p;
  }

  app.get("/health", async () => ({ ok: true }));

  app.post("/api/players", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { name, shop } = ProfilGovde.parse(req.body);
    const p = await db.createPlayer(name, shop);
    return reply.code(201).send({ id: p.id, token: p.token });
  });

  app.patch("/api/players/me", async (req) => {
    const p = await oyuncu(req, true);
    const { name, shop } = ProfilGovde.parse(req.body);
    await db.updatePlayer(p.id, name, shop);
    return { id: p.id, name, shop };
  });

  app.post("/api/runs", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const p = await oyuncu(req, true);
    const run = await db.createRun(p.id);
    return reply.code(201).send({ runId: run.id, seed: run.seed });
  });

  app.post("/api/runs/:id/finish", async (req) => {
    const p = await oyuncu(req, true);
    const { id } = RunParam.parse(req.params);
    const run = await db.getRun(id);
    if (!run || run.playerId !== p.id) throw new HttpError(404, "Oyun bulunamadı.");
    if (run.finishedAt) throw new HttpError(409, "Bu oyun zaten gönderildi.");

    const log = req.body as RunLog;
    if (log?.seed !== run.seed) throw new HttpError(400, "Kayıt bu oyuna ait değil.");
    const r = replay(log);
    if (!r.ok) throw new HttpError(422, r.reason);
    if (!r.run.over && !r.run.finished) throw new HttpError(422, "Oyun henüz bitmemiş.");

    // Günler gerçek zamanlı akar; kayıttaki gün sayısı geçen süreden hızlı oynanamaz
    const gecen = (Date.now() - new Date(run.startedAt).getTime()) / 1000;
    if (gecen < log.days.length * minDaySeconds) throw new HttpError(422, "Oyun bu kadar kısa sürede oynanamaz.");

    const score = r.run.earned;
    const ok = await db.finishRun(id, score, r.run.history.length, r.run.finished, log);
    if (!ok) throw new HttpError(409, "Bu oyun zaten gönderildi.");

    const board = await db.leaderboard("all", 10, p.id);
    const me = board.me!;
    return { score, rank: me.rank, best: me.score === score };
  });

  app.get("/api/leaderboard", async (req) => {
    const { period } = LeaderSorgu.parse(req.query);
    const p = await oyuncu(req, false);
    const { rows, me } = await db.leaderboard(period, 10, p?.id);
    const disari = ({ playerId: _id, ...r }: (typeof rows)[number]) => r;
    return { rows: rows.map(disari), me: me ? disari(me) : undefined };
  });

  return app;
}
