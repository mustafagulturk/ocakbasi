import { describe, expect, it } from "vitest";
import { DAY_TICKS, PRODUCTS, apply, buy, createRun, replay, rng, startDay, step } from "../src";
import { playRun } from "./bot";

const until = (d: ReturnType<typeof startDay>, fn: () => boolean, max = DAY_TICKS) => {
  for (let i = 0; i < max && !fn(); i++) step(d);
};

describe("rastgele sayı üreteci", () => {
  it("aynı tohumla aynı diziyi üretir", () => {
    const a = rng(42), b = rng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });
});

describe("mutfak kuralları", () => {
  it("kebap pişer, zamanında alınırsa tepsiye gider, geç kalınırsa yanar", () => {
    const d = startDay(createRun(1));
    expect(apply(d, { type: "cook", product: "simit" }).ok).toBe(true);
    expect(d.run.cash).toBe(250 - PRODUCTS.simit.cost);
    expect(apply(d, { type: "take", station: "izgara", slot: 0 })).toMatchObject({ ok: false, reason: "Henüz pişmedi." });
    until(d, () => d.stations.izgara[0]!.t >= 60);
    expect(apply(d, { type: "take", station: "izgara", slot: 0 }).ok).toBe(true);
    expect(d.tray).toEqual(["simit"]);

    apply(d, { type: "cook", product: "simit" });
    until(d, () => d.stations.izgara[0]!.t >= 120);
    expect(apply(d, { type: "take", station: "izgara", slot: 0 })).toMatchObject({ ok: true, events: [{ type: "trash" }] });
    expect(d.stats.burnt).toBe(1);
  });

  it("henüz açılmamış yemek pişirilemez", () => {
    const d = startDay(createRun(1));
    expect(apply(d, { type: "cook", product: "lahmacun" }).ok).toBe(false);
  });

  it("eksik siparişle servis yapılamaz, tam sipariş parayı ve bahşişi getirir", () => {
    const d = startDay(createRun(7));
    until(d, () => d.seats.some(Boolean));
    const seat = d.seats.findIndex(Boolean);
    const c = d.seats[seat]!;
    expect(apply(d, { type: "serve", seat }).ok).toBe(false);
    d.tray.push(...c.order);
    const once = d.run.cash;
    const r = apply(d, { type: "serve", seat });
    expect(r.ok).toBe(true);
    const tutar = c.order.reduce((t, p) => t + PRODUCTS[p].price, 0);
    expect(d.run.cash - once).toBeGreaterThanOrEqual(tutar);
    expect(d.run.earned).toBe(d.run.cash - once);
    expect(d.seats[seat]).toBeNull();
  });

  it("sabrı tükenen müşteri bir kalp götürür, kalpler bitince oyun biter", () => {
    const d = startDay(createRun(3));
    until(d, () => d.run.over);
    expect(d.run.over).toBe(true);
    expect(d.run.hearts).toBe(0);
    expect(d.closed).toBe(true);
  });

  it("geliştirme parası yetmezse ve gün gelmeden alınamaz", () => {
    const run = createRun(1);
    expect(buy(run, "komur").ok).toBe(false);
    expect(buy(run, "izgara").ok).toBe(false);
    run.cash = 2000;
    expect(buy(run, "izgara").ok).toBe(true);
    expect(run.upgrades.izgara).toBe(1);
    expect(startDay(run).stations.izgara).toHaveLength(3);
  });
});

describe("skor doğrulama", () => {
  it("oynanan oyunun kaydı baştan oynatılınca aynı skoru verir", () => {
    const { run, log } = playRun(12345);
    expect(run.history.length).toBeGreaterThan(0);
    const r = replay(JSON.parse(JSON.stringify(log)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.run.earned).toBe(run.earned);
      expect(r.run.day).toBe(run.day);
    }
  });

  it("elle değiştirilmiş kayıt reddedilir", () => {
    const { log } = playRun(99);
    const sahte = JSON.parse(JSON.stringify(log));
    // olmayan bir müşteriye servis eklemek
    sahte.days[0].actions.unshift([0, { type: "serve", seat: 0 }]);
    expect(replay(sahte).ok).toBe(false);

    const sirasiz = JSON.parse(JSON.stringify(log));
    sirasiz.days[0].actions.reverse();
    expect(replay(sirasiz).ok).toBe(false);
  });
});
