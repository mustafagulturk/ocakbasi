/** Oyunun sabit verileri: menü, istasyonlar, geliştirmeler ve günlere göre zorluk. */

export type StationId = "izgara" | "firin" | "ocak";
export type ProductId =
  | "simit"
  | "patlican"
  | "kusbasi"
  | "alinazik"
  | "lahmacun"
  | "katmer"
  | "beyran"
  | "ayran"
  | "baklava"
  | "menengic";

export interface Product {
  id: ProductId;
  name: string;
  /** Müşterinin ödediği fiyat (₺). Sipariş edilemeyen ara ürünlerde 0. */
  price: number;
  /** Malzeme maliyeti, ürün hazırlanmaya başlarken kasadan düşer. */
  cost: number;
  /** Pişirilen ürünlerde istasyon ve süreler (saniye). */
  station?: StationId;
  cook?: number;
  /** Piştikten sonra yanmadan önce kalabileceği süre. */
  burn?: number;
  /** Menüye girdiği gün. */
  day: number;
  /** Ana yemek mi, yanına alınan bir şey mi? */
  kind: "ana" | "yan" | "ara";
}

export const PRODUCTS: Record<ProductId, Product> = {
  simit: { id: "simit", name: "Simit kebabı", price: 140, cost: 50, station: "izgara", cook: 6, burn: 6, day: 1, kind: "ana" },
  ayran: { id: "ayran", name: "Ayran", price: 25, cost: 8, day: 1, kind: "yan" },
  lahmacun: { id: "lahmacun", name: "Antep lahmacunu", price: 80, cost: 25, station: "firin", cook: 5, burn: 6, day: 2, kind: "ana" },
  beyran: { id: "beyran", name: "Beyran", price: 120, cost: 0, day: 3, kind: "ana" },
  baklava: { id: "baklava", name: "Fıstıklı baklava", price: 90, cost: 35, day: 3, kind: "yan" },
  patlican: { id: "patlican", name: "Patlıcan kebabı", price: 160, cost: 60, station: "izgara", cook: 8, burn: 6, day: 4, kind: "ana" },
  katmer: { id: "katmer", name: "Katmer", price: 110, cost: 35, station: "firin", cook: 6, burn: 5, day: 5, kind: "yan" },
  kusbasi: { id: "kusbasi", name: "Kuşbaşı", price: 0, cost: 55, station: "izgara", cook: 6, burn: 6, day: 6, kind: "ara" },
  alinazik: { id: "alinazik", name: "Ali Nazik", price: 210, cost: 20, day: 6, kind: "ana" },
  menengic: { id: "menengic", name: "Menengiç kahvesi", price: 50, cost: 12, station: "ocak", cook: 4, burn: 5, day: 7, kind: "yan" },
};

/** Kazandaki beyranın bir kazan dolusu maliyeti ve doldurma süresi. */
export const KAZAN = { refillCost: 150, refillSeconds: 5 };

export const TICKS_PER_SECOND = 10;
export const DAY_SECONDS = 120;
export const LAST_DAY = 10;
export const START_CASH = 250;
export const MAX_HEARTS = 5;
/** Arka arkaya bu kadar memnun müşteri bir kalp geri kazandırır. */
export const STREAK_FOR_HEART = 6;

export type UpgradeId = "izgara" | "komur" | "firin" | "ocak" | "masa" | "dekor" | "tepsi" | "kazan" | "tabela";

export interface Upgrade {
  id: UpgradeId;
  name: string;
  desc: string;
  /** Her seviyenin fiyatı; uzunluğu en yüksek seviyeyi belirler. */
  costs: number[];
  /** Satın alınabildiği ilk gün (ilgili yemek açılmadan gösterilmez). */
  day: number;
}

export const UPGRADES: Upgrade[] = [
  { id: "izgara", name: "Izgarayı genişlet", desc: "Izgaraya bir şiş yeri daha", costs: [350, 800], day: 1 },
  { id: "masa", name: "Yeni masa", desc: "Aynı anda bir müşteri daha", costs: [450, 950], day: 1 },
  { id: "tepsi", name: "Büyük tepsi", desc: "Tezgâhta 4 yerine 6 tabak", costs: [300], day: 1 },
  { id: "dekor", name: "Bakır süsler ve kilim", desc: "Müşteriler %25 daha sabırlı", costs: [500], day: 2 },
  { id: "tabela", name: "Işıklı tabela", desc: "Dükkâna %15 daha sık müşteri gelir", costs: [400], day: 2 },
  { id: "komur", name: "Meşe kömürü", desc: "Izgara %25 daha hızlı pişirir", costs: [500], day: 3 },
  { id: "firin", name: "Taş fırın", desc: "Fırına bir yer daha", costs: [600], day: 3 },
  { id: "kazan", name: "Büyük kazan", desc: "Kazan 6 yerine 10 kâse alır", costs: [400], day: 3 },
  { id: "ocak", name: "İkinci cezve", desc: "Ocakta aynı anda iki kahve", costs: [300], day: 7 },
];

export interface DayConfig {
  /** Ortalama müşteri gelme aralığı (saniye). */
  arrival: number;
  /** Tek kalemlik siparişte müşterinin sabrı (saniye). */
  patience: number;
  /** Ana yemeğin yanına bir şey daha isteme olasılığı. */
  extraChance: number;
  /** İkinci bir ekstra isteme olasılığı. */
  secondExtraChance: number;
}

export function dayConfig(day: number): DayConfig {
  const d = day - 1;
  return {
    arrival: Math.max(4, 8.5 - d * 0.5),
    patience: Math.max(18, 30 - d * 1.3),
    extraChance: Math.min(0.75, 0.25 + d * 0.06),
    secondExtraChance: day >= 4 ? Math.min(0.35, 0.08 + (day - 4) * 0.05) : 0,
  };
}
