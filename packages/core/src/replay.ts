/**
 * Skor doğrulama: oyun kaydı (tohum + her günün hamleleri + gün arası alımlar) baştan oynatılır.
 * Kayıttaki tek bir hamle bile kurala uymazsa kayıt geçersiz sayılır; böylece skor elle yazılamaz.
 */
import type { UpgradeId } from "./data";
import { type Action, type RunState, apply, buy, createRun, endDay, startDay, step } from "./sim";

export interface DayLog {
  /** [tik, hamle] çiftleri, tik sırasına göre. */
  actions: [number, Action][];
  /** Bu günün sonunda alınan geliştirmeler. */
  buys: UpgradeId[];
}

export interface RunLog {
  v: 1;
  seed: number;
  days: DayLog[];
}

export const MAX_ACTIONS_PER_DAY = 4000;

export type ReplayResult = { ok: true; run: RunState } | { ok: false; reason: string };

export function replay(log: RunLog): ReplayResult {
  if (log?.v !== 1 || !Number.isInteger(log.seed) || !Array.isArray(log.days)) return { ok: false, reason: "Kayıt biçimi hatalı." };
  const run = createRun(log.seed);
  for (const [i, day] of log.days.entries()) {
    if (run.over || run.finished) return { ok: false, reason: "Oyun bittikten sonra hamle var." };
    if (!Array.isArray(day.actions) || day.actions.length > MAX_ACTIONS_PER_DAY) return { ok: false, reason: `${i + 1}. gün kaydı hatalı.` };
    for (let j = 0; j < day.actions.length; j++) {
      const t = day.actions[j]?.[0];
      if (!Number.isInteger(t) || t < 0 || (j > 0 && t < day.actions[j - 1][0])) return { ok: false, reason: `${i + 1}. gün hamleleri sırasız.` };
    }
    const d = startDay(run);
    let k = 0;
    while (!d.closed) {
      while (k < day.actions.length && day.actions[k][0] === d.tick) {
        const r = apply(d, day.actions[k][1]);
        if (!r.ok) return { ok: false, reason: `${i + 1}. gün, ${d.tick}. tikteki hamle geçersiz: ${r.reason}` };
        k++;
      }
      step(d);
    }
    if (k !== day.actions.length) return { ok: false, reason: `${i + 1}. gün kapandıktan sonra hamle var.` };
    endDay(d);
    for (const id of day.buys ?? []) {
      const r = buy(run, id);
      if (!r.ok) return { ok: false, reason: `Geliştirme alınamaz: ${r.reason}` };
    }
  }
  return { ok: true, run };
}
