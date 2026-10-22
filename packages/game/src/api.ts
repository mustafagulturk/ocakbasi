/**
 * Skor tablosu sunucusu istemcisi. Sunucu adresi verilmemişse (VITE_API_URL) oyun tamamen çevrim dışı çalışır.
 * Oyun başında sunucudan tohum alınır, bitince tüm hamle kaydı gönderilir; sunucu oyunu yeniden oynatıp skoru doğrular.
 */
import type { RunLog } from "@ocakbasi/core";
import { API_URL } from "./config";
import { type Profile, save } from "./save";

export const online = () => !!API_URL;

export interface ScoreRow {
  rank: number;
  name: string;
  shop: string;
  score: number;
  day: number;
  finished: boolean;
}

async function req<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const p = save.profile;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.auth && p?.token) headers.authorization = `Bearer ${p.token}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL + path, { ...init, headers, signal: ctrl.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message ?? `Sunucu hatası (${res.status})`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Profil sunucuda yoksa oluşturur, varsa adını günceller. */
export async function ensurePlayer(): Promise<Profile | null> {
  const p = save.profile;
  if (!online() || !p) return null;
  if (p.playerId && p.token) {
    await req("/api/players/me", { method: "PATCH", auth: true, body: JSON.stringify({ name: p.name, shop: p.shop }) }).catch(() => {});
    return p;
  }
  const r = await req<{ id: string; token: string }>("/api/players", { method: "POST", body: JSON.stringify({ name: p.name, shop: p.shop }) });
  const yeni = { ...p, playerId: r.id, token: r.token };
  save.setProfile(yeni);
  return yeni;
}

export async function startRun(): Promise<{ runId: string; seed: number } | null> {
  if (!online()) return null;
  try {
    await ensurePlayer();
    return await req("/api/runs", { method: "POST", auth: true });
  } catch {
    return null;
  }
}

export async function finishRun(runId: string, log: RunLog) {
  return req<{ score: number; rank: number; best: boolean }>(`/api/runs/${runId}/finish`, { method: "POST", auth: true, body: JSON.stringify(log) });
}

export async function leaderboard(period: "all" | "week" = "all") {
  return req<{ rows: ScoreRow[]; me?: ScoreRow }>(`/api/leaderboard?period=${period}`, { auth: true });
}
