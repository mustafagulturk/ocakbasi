/**
 * Oyunun kuralları. Tamamen deterministik: aynı tohum ve aynı hamle listesi her yerde aynı sonucu verir.
 * Böylece tarayıcı oyunu oynatırken sunucu da gönderilen hamleleri baştan oynatıp skoru doğrulayabilir.
 */
import {
  DAY_SECONDS,
  KAZAN,
  LAST_DAY,
  MAX_HEARTS,
  PRODUCTS,
  START_CASH,
  STREAK_FOR_HEART,
  TICKS_PER_SECOND,
  UPGRADES,
  dayConfig,
  type ProductId,
  type StationId,
  type UpgradeId,
} from "./data";
import { type Rng, rng } from "./rng";

export const DAY_TICKS = DAY_SECONDS * TICKS_PER_SECOND;
const sec = (s: number) => Math.round(s * TICKS_PER_SECOND);

export type Action =
  | { type: "cook"; product: ProductId }
  | { type: "take"; station: StationId; slot: number }
  | { type: "grab"; product: ProductId }
  | { type: "refill" }
  | { type: "assemble" }
  | { type: "serve"; seat: number }
  | { type: "discard"; index: number };

export type GameEvent =
  | { type: "arrive"; seat: number }
  | { type: "served"; seat: number; amount: number; tip: number; heart: boolean }
  | { type: "angry"; seat: number }
  | { type: "done"; station: StationId; slot: number }
  | { type: "burnt"; station: StationId; slot: number }
  | { type: "trash"; product: ProductId }
  | { type: "refilled" }
  | { type: "closed" }
  | { type: "gameover" };

export interface DaySummary {
  day: number;
  served: number;
  lost: number;
  income: number;
  tips: number;
  costs: number;
  burnt: number;
}

export interface RunState {
  seed: number;
  /** Oynanan ya da sıradaki gün. */
  day: number;
  cash: number;
  hearts: number;
  /** Skor: oyun boyunca kazanılan toplam para (harcamalar düşülmez). */
  earned: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  history: DaySummary[];
  /** Kalpler bitti. */
  over: boolean;
  /** Son gün de tamamlandı. */
  finished: boolean;
}

export interface Customer {
  id: number;
  order: ProductId[];
  patience: number;
  left: number;
  /** Görünümü seçmek için rastgele sayı. */
  look: number;
}

export interface Slot {
  product: ProductId;
  t: number;
}

export interface DayState {
  run: RunState;
  tick: number;
  rng: Rng;
  nextArrival: number;
  nextId: number;
  seats: (Customer | null)[];
  stations: Record<StationId, (Slot | null)[]>;
  tray: ProductId[];
  trayCap: number;
  kazan: { portions: number; cap: number; refill: number };
  streak: number;
  stats: DaySummary;
  closed: boolean;
}

export type Result = { ok: true; events: GameEvent[] } | { ok: false; reason: string };

const level = (run: RunState, id: UpgradeId) => run.upgrades[id] ?? 0;
export const unlocked = (run: RunState, p: ProductId) => PRODUCTS[p].day <= run.day;

export function createRun(seed: number): RunState {
  return { seed: seed >>> 0, day: 1, cash: START_CASH, hearts: MAX_HEARTS, earned: 0, upgrades: {}, history: [], over: false, finished: false };
}

export function stationSlots(run: RunState, s: StationId) {
  if (s === "izgara") return 2 + level(run, "izgara");
  if (s === "firin") return run.day >= PRODUCTS.lahmacun.day ? 2 + level(run, "firin") : 0;
  return run.day >= PRODUCTS.menengic.day ? 1 + level(run, "ocak") : 0;
}

/** Pişme süresi (tik); meşe kömürü ızgarayı hızlandırır. */
export function cookTicks(run: RunState, p: ProductId) {
  const prod = PRODUCTS[p];
  const hiz = prod.station === "izgara" && level(run, "komur") ? 0.75 : 1;
  return sec((prod.cook ?? 0) * hiz);
}
export const burnTicks = (p: ProductId) => sec(PRODUCTS[p].burn ?? 0);

export function startDay(run: RunState): DayState {
  const kazanCap = level(run, "kazan") ? 10 : 6;
  return {
    run,
    tick: 0,
    rng: rng((run.seed ^ Math.imul(run.day, 0x9e3779b9)) >>> 0),
    nextArrival: sec(1.5),
    nextId: 1,
    seats: Array.from({ length: 3 + level(run, "masa") }, () => null),
    stations: {
      izgara: Array.from({ length: stationSlots(run, "izgara") }, () => null),
      firin: Array.from({ length: stationSlots(run, "firin") }, () => null),
      ocak: Array.from({ length: stationSlots(run, "ocak") }, () => null),
    },
    tray: [],
    trayCap: level(run, "tepsi") ? 6 : 4,
    kazan: { portions: run.day >= PRODUCTS.beyran.day ? kazanCap : 0, cap: kazanCap, refill: 0 },
    streak: 0,
    stats: { day: run.day, served: 0, lost: 0, income: 0, tips: 0, costs: 0, burnt: 0 },
    closed: false,
  };
}

function pickOrder(d: DayState): ProductId[] {
  const { run, rng: r } = d;
  const morning = d.tick < DAY_TICKS * 0.4;
  const mains = (Object.keys(PRODUCTS) as ProductId[]).filter((p) => PRODUCTS[p].kind === "ana" && unlocked(run, p));
  // Beyran sabah çorbasıdır: günün ilk kısmında daha çok istenir
  const weights = mains.map((p) => (p === "beyran" ? (morning ? 3 : 0.5) : p === "alinazik" ? 1.4 : 1));
  const order: ProductId[] = [r.weighted(mains, weights)];
  const sides = (Object.keys(PRODUCTS) as ProductId[]).filter((p) => PRODUCTS[p].kind === "yan" && unlocked(run, p));
  const cfg = dayConfig(run.day);
  if (sides.length && r.next() < cfg.extraChance) {
    const first = r.pick(sides);
    order.push(first);
    const rest = sides.filter((p) => p !== first);
    if (rest.length && r.next() < cfg.secondExtraChance) order.push(r.pick(rest));
  }
  return order;
}

function patienceFor(d: DayState, order: ProductId[]) {
  const cfg = dayConfig(d.run.day);
  const dekor = level(d.run, "dekor") ? 1.25 : 1;
  const zor = order.includes("alinazik") ? 1.2 : 1;
  return sec(cfg.patience * dekor * zor * (1 + 0.35 * (order.length - 1)));
}

function arrivalGap(d: DayState) {
  const tabela = level(d.run, "tabela") ? 0.85 : 1;
  return sec(dayConfig(d.run.day).arrival * tabela * (0.7 + d.rng.next() * 0.6));
}

/** Bir tik ilerletir. */
export function step(d: DayState): GameEvent[] {
  const ev: GameEvent[] = [];
  if (d.closed) return ev;
  const { run } = d;

  for (const station of Object.keys(d.stations) as StationId[]) {
    d.stations[station].forEach((s, slot) => {
      if (!s) return;
      s.t++;
      const pisme = cookTicks(run, s.product);
      if (s.t === pisme) ev.push({ type: "done", station, slot });
      else if (s.t === pisme + burnTicks(s.product)) ev.push({ type: "burnt", station, slot });
    });
  }

  if (d.kazan.refill > 0 && --d.kazan.refill === 0) {
    d.kazan.portions = d.kazan.cap;
    ev.push({ type: "refilled" });
  }

  d.seats.forEach((c, seat) => {
    if (!c) return;
    if (--c.left > 0) return;
    d.seats[seat] = null;
    run.hearts--;
    d.stats.lost++;
    d.streak = 0;
    ev.push({ type: "angry", seat });
  });
  if (run.hearts <= 0) {
    run.hearts = 0;
    run.over = true;
    d.closed = true;
    ev.push({ type: "gameover" });
    return ev;
  }

  if (d.tick >= d.nextArrival) {
    const free = d.seats.findIndex((s) => !s);
    if (free === -1) d.nextArrival = d.tick + sec(1);
    else {
      const order = pickOrder(d);
      const patience = patienceFor(d, order);
      d.seats[free] = { id: d.nextId++, order, patience, left: patience, look: d.rng.int(1_000_000) };
      d.nextArrival = d.tick + arrivalGap(d);
      ev.push({ type: "arrive", seat: free });
    }
  }

  d.tick++;
  if (d.tick >= DAY_TICKS) {
    d.closed = true;
    ev.push({ type: "closed" });
  }
  return ev;
}

const fail = (reason: string): Result => ({ ok: false, reason });

function pay(d: DayState, amount: number) {
  d.run.cash -= amount;
  d.stats.costs += amount;
}

/** Oyuncunun bir dokunuşunu uygular. Kurala uymayan hamle reddedilir ve hiçbir şey değişmez. */
export function apply(d: DayState, a: Action): Result {
  if (d.closed) return fail("Dükkân kapandı.");
  const { run } = d;
  const trayFull = d.tray.length >= d.trayCap;

  switch (a.type) {
    case "cook": {
      const p = PRODUCTS[a.product];
      if (!p?.station || !unlocked(run, a.product)) return fail("Bu yemek henüz menüde yok.");
      const slots = d.stations[p.station];
      const free = slots.findIndex((s) => !s);
      if (free === -1) return fail("Yer yok.");
      if (run.cash < p.cost) return fail("Malzemeye para yetmiyor.");
      pay(d, p.cost);
      slots[free] = { product: a.product, t: 0 };
      return { ok: true, events: [] };
    }
    case "take": {
      const s = d.stations[a.station]?.[a.slot];
      if (!s) return fail("Boş.");
      const pisme = cookTicks(run, s.product);
      if (s.t < pisme) return fail("Henüz pişmedi.");
      if (s.t >= pisme + burnTicks(s.product)) {
        d.stations[a.station][a.slot] = null;
        d.stats.burnt++;
        return { ok: true, events: [{ type: "trash", product: s.product }] };
      }
      if (trayFull) return fail("Tepsi dolu.");
      d.stations[a.station][a.slot] = null;
      d.tray.push(s.product);
      return { ok: true, events: [] };
    }
    case "grab": {
      if (!["ayran", "baklava", "beyran"].includes(a.product) || !unlocked(run, a.product)) return fail("Bu ürün yok.");
      if (trayFull) return fail("Tepsi dolu.");
      if (a.product === "beyran") {
        if (d.kazan.refill > 0) return fail("Kazan doluyor.");
        if (d.kazan.portions <= 0) return fail("Kazan boş.");
        d.kazan.portions--;
      } else {
        const cost = PRODUCTS[a.product].cost;
        if (run.cash < cost) return fail("Para yetmiyor.");
        pay(d, cost);
      }
      d.tray.push(a.product);
      return { ok: true, events: [] };
    }
    case "refill": {
      if (!unlocked(run, "beyran")) return fail("Kazan yok.");
      if (d.kazan.refill > 0) return fail("Zaten doluyor.");
      if (d.kazan.portions >= d.kazan.cap) return fail("Kazan dolu.");
      if (run.cash < KAZAN.refillCost) return fail("Para yetmiyor.");
      pay(d, KAZAN.refillCost);
      d.kazan.refill = sec(KAZAN.refillSeconds);
      return { ok: true, events: [] };
    }
    case "assemble": {
      if (!unlocked(run, "alinazik")) return fail("Ali Nazik henüz menüde yok.");
      const i = d.tray.indexOf("kusbasi");
      if (i === -1) return fail("Önce kuşbaşını pişir.");
      if (run.cash < PRODUCTS.alinazik.cost) return fail("Para yetmiyor.");
      pay(d, PRODUCTS.alinazik.cost);
      d.tray[i] = "alinazik";
      return { ok: true, events: [] };
    }
    case "serve": {
      const c = d.seats[a.seat];
      if (!c) return fail("Masa boş.");
      const kalan = [...d.tray];
      for (const p of c.order) {
        const i = kalan.indexOf(p);
        if (i === -1) return fail("Sipariş eksik.");
        kalan.splice(i, 1);
      }
      d.tray = kalan;
      d.seats[a.seat] = null;
      const amount = c.order.reduce((t, p) => t + PRODUCTS[p].price, 0);
      const ratio = c.left / c.patience;
      const tip = Math.round(amount * 0.3 * ratio);
      run.cash += amount + tip;
      run.earned += amount + tip;
      d.stats.served++;
      d.stats.income += amount;
      d.stats.tips += tip;
      let heart = false;
      if (ratio >= 0.5) {
        d.streak++;
        if (d.streak % STREAK_FOR_HEART === 0 && run.hearts < MAX_HEARTS) {
          run.hearts++;
          heart = true;
        }
      } else d.streak = 0;
      return { ok: true, events: [{ type: "served", seat: a.seat, amount, tip, heart }] };
    }
    case "discard": {
      if (a.index < 0 || a.index >= d.tray.length) return fail("Tabak yok.");
      const [p] = d.tray.splice(a.index, 1);
      return { ok: true, events: [{ type: "trash", product: p }] };
    }
    default:
      return fail("Bilinmeyen hamle.");
  }
}

/** Gün bitince özet kaydedilir ve oyun sıradaki güne geçer. */
export function endDay(d: DayState): DaySummary {
  const { run } = d;
  run.history.push(d.stats);
  if (!run.over) {
    if (run.day >= LAST_DAY) run.finished = true;
    else run.day++;
  }
  return d.stats;
}

export function upgradeCost(run: RunState, id: UpgradeId) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return null;
  return u.costs[level(run, id)] ?? null;
}

/** Günler arasında dükkâna geliştirme alınır. */
export function buy(run: RunState, id: UpgradeId): Result {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return fail("Böyle bir geliştirme yok.");
  if (run.over || run.finished) return fail("Oyun bitti.");
  if (u.day > run.day) return fail("Henüz açılmadı.");
  const cost = upgradeCost(run, id);
  if (cost == null) return fail("En üst seviyede.");
  if (run.cash < cost) return fail("Para yetmiyor.");
  run.cash -= cost;
  run.upgrades[id] = level(run, id) + 1;
  return { ok: true, events: [] };
}
