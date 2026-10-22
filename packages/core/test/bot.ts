/** Testler ve denge ayarı için basit bir oyuncu: siparişlere bakıp eksikleri hazırlar, hazır olanı servis eder. */
import { PRODUCTS, type ProductId, type StationId, UPGRADES } from "../src/data";
import type { RunLog } from "../src/replay";
import { type Action, type DayState, apply, buy, createRun, endDay, startDay, step, upgradeCost } from "../src/sim";

function need(d: DayState): ProductId[] {
  const want: ProductId[] = [];
  for (const c of d.seats) if (c) want.push(...c.order);
  const have = [...d.tray];
  for (const st of Object.values(d.stations)) for (const s of st) if (s) have.push(s.product);
  return want.filter((p) => {
    const alt = p === "alinazik" && !have.includes("alinazik") ? "kusbasi" : p;
    const i = have.indexOf(alt);
    if (i === -1) return true;
    have.splice(i, 1);
    return false;
  });
}

export function think(d: DayState, reaction: number): Action | null {
  if (d.tick % reaction) return null;
  // 1) servis edilebilecek müşteri
  for (const [seat, c] of d.seats.entries()) {
    if (!c) continue;
    const kalan = [...d.tray];
    if (c.order.every((p) => { const i = kalan.indexOf(p); if (i === -1) return false; kalan.splice(i, 1); return true; })) return { type: "serve", seat };
  }
  // 2) pişeni ya da yananı al
  for (const station of Object.keys(d.stations) as StationId[]) {
    for (const [slot, s] of d.stations[station].entries()) {
      if (!s) continue;
      const p = PRODUCTS[s.product];
      const pisme = Math.round((p.cook ?? 0) * 10 * (station === "izgara" && d.run.upgrades.komur ? 0.75 : 1));
      if (s.t >= pisme && d.tray.length < d.trayCap) return { type: "take", station, slot };
    }
  }
  if (d.tray.includes("kusbasi")) return { type: "assemble" };
  // 3) eksik olanı hazırla
  for (const p of need(d)) {
    if (p === "alinazik") return { type: "cook", product: "kusbasi" };
    if (PRODUCTS[p].station) return { type: "cook", product: p };
    if (d.tray.length < d.trayCap) {
      if (p === "beyran" && d.kazan.portions === 0) return d.kazan.refill ? null : { type: "refill" };
      return { type: "grab", product: p };
    }
  }
  // 4) tepside kimsenin istemediği şey varsa at
  if (d.tray.length >= d.trayCap) return { type: "discard", index: 0 };
  return null;
}

/** Bir oyunu baştan sona oynar ve kaydını döndürür. */
export function playRun(seed: number, reaction = 6, shop = true) {
  const run = createRun(seed);
  const log: RunLog = { v: 1, seed, days: [] };
  while (!run.over && !run.finished) {
    const d = startDay(run);
    const actions: RunLog["days"][number]["actions"] = [];
    while (!d.closed) {
      const a = think(d, reaction);
      if (a && apply(d, a).ok) actions.push([d.tick, a]);
      step(d);
    }
    endDay(d);
    const buys: RunLog["days"][number]["buys"] = [];
    if (shop && !run.over && !run.finished) {
      for (const u of UPGRADES) {
        const cost = upgradeCost(run, u.id);
        if (cost != null && run.cash - cost > 300 && buy(run, u.id).ok) buys.push(u.id);
      }
    }
    log.days.push({ actions, buys });
  }
  return { run, log };
}
