/**
 * API testleri gerçek bir PostgreSQL ile çalışır (TEST_DATABASE_URL). Tanımlı değilse atlanır.
 * Her test dosyası başında tablolar silinip yeniden kurulur.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { playRun } from "../../core/test/bot";
import { buildApp } from "../src/app";
import { Db } from "../src/db";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("skor API'si", () => {
  let db: Db;
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    db = Db.connect(url!);
    await db.pool.query("DROP TABLE IF EXISTS runs, players CASCADE");
    await db.migrate();
    app = buildApp({ db, minDaySeconds: 0 });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    await db?.close();
  });

  const oyuncuAc = async (name = "Mustafa", shop = "Mustafa Usta Ocakbaşı") => {
    const r = await app.inject({ method: "POST", url: "/api/players", payload: { name, shop } });
    expect(r.statusCode).toBe(201);
    return r.json() as { id: string; token: string };
  };
  const yetki = (token: string) => ({ authorization: `Bearer ${token}` });
  const oyunAc = async (token: string) => {
    const r = await app.inject({ method: "POST", url: "/api/runs", headers: { ...yetki(token), "content-type": "application/json" } });
    expect(r.statusCode).toBe(201);
    return r.json() as { runId: string; seed: number };
  };

  it("oyuncu adını temizler ve doğrular", async () => {
    const bos = await app.inject({ method: "POST", url: "/api/players", payload: { name: "   ", shop: "Dükkân" } });
    expect(bos.statusCode).toBe(400);
    const uzun = await app.inject({ method: "POST", url: "/api/players", payload: { name: "x".repeat(19), shop: "Dükkân" } });
    expect(uzun.statusCode).toBe(400);
    const { token } = await oyuncuAc("  Ali \n  Usta ", "Ali'nin   Yeri");
    const r = await app.inject({ method: "PATCH", url: "/api/players/me", headers: yetki(token), payload: { name: "Ali Usta", shop: "Yeni Yer" } });
    expect(r.json()).toMatchObject({ name: "Ali Usta", shop: "Yeni Yer" });
  });

  it("oturum olmadan oyun başlatılamaz", async () => {
    const r = await app.inject({ method: "POST", url: "/api/runs" });
    expect(r.statusCode).toBe(401);
  });

  it("doğru kayıtla skor sunucuda hesaplanır ve tabloya girer", async () => {
    const { token } = await oyuncuAc();
    const { runId, seed } = await oyunAc(token);
    const { run, log } = playRun(seed);
    const r = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: log });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ score: run.earned, rank: 1, best: true });

    const tablo = await app.inject({ method: "GET", url: "/api/leaderboard?period=week", headers: yetki(token) });
    const body = tablo.json();
    expect(body.rows[0]).toMatchObject({ rank: 1, name: "Mustafa", score: run.earned });
    expect(body.rows[0].playerId).toBeUndefined();
    expect(body.me.score).toBe(run.earned);
  });

  it("aynı oyun iki kez gönderilemez", async () => {
    const { token } = await oyuncuAc("Veli", "Veli Usta");
    const { runId, seed } = await oyunAc(token);
    const { log } = playRun(seed, 15);
    const ilk = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: log });
    expect(ilk.statusCode).toBe(200);
    const ikinci = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: log });
    expect(ikinci.statusCode).toBe(409);
  });

  it("başka tohumla oynanmış ya da oynanmış gibi yazılmış kayıt reddedilir", async () => {
    const { token } = await oyuncuAc("Hile", "Hileci");
    const { runId, seed } = await oyunAc(token);
    const baska = playRun(seed + 1).log;
    const r1 = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: baska });
    expect(r1.statusCode).toBe(400);

    const { log } = playRun(seed);
    log.days[0].actions.splice(3, 0, [log.days[0].actions[3][0], { type: "serve", seat: 0 }]);
    const r2 = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: log });
    expect(r2.statusCode).toBe(422);
  });

  it("başkasının oyunu gönderilemez", async () => {
    const a = await oyuncuAc("A", "A");
    const b = await oyuncuAc("B", "B");
    const { runId, seed } = await oyunAc(a.token);
    const r = await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(b.token), payload: playRun(seed).log });
    expect(r.statusCode).toBe(404);
  });

  it("çok hızlı bitirilen oyun reddedilir", async () => {
    const hizli = buildApp({ db });
    const { token } = await oyuncuAc("Hızlı", "Hızlı");
    const { runId, seed } = await oyunAc(token);
    const r = await hizli.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: playRun(seed).log });
    expect(r.statusCode).toBe(422);
    expect(r.json().message).toMatch(/kısa sürede/);
    await hizli.close();
  });

  it("tabloda her oyuncu en iyi oyunuyla bir kez yer alır", async () => {
    const { token, id } = await oyuncuAc("Tekrar", "Tekrar");
    for (const tepki of [12, 4]) {
      const { runId, seed } = await oyunAc(token);
      await app.inject({ method: "POST", url: `/api/runs/${runId}/finish`, headers: yetki(token), payload: playRun(seed, tepki).log });
    }
    const { rows } = await db.leaderboard("all", 50);
    expect(rows.filter((r) => r.playerId === id)).toHaveLength(1);
    const skorlar = rows.map((r) => r.score);
    expect([...skorlar].sort((x, y) => y - x)).toEqual(skorlar);
  });
});
