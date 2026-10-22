/** Ekran ölçüleri ve Antep esintili renk paleti. Oyun 720x1280 dikey tasarlanır, ekrana sığdırılır. */
export const W = 720;
export const H = 1280;

export const RENK = {
  koyu: 0x3b2416,
  koyu2: 0x2a170c,
  krem: 0xf6e7cf,
  krem2: 0xfff8ec,
  bakir: 0xc8743a,
  bakirKoyu: 0x8d4a20,
  cini: 0x2a9d8f,
  ciniKoyu: 0x1f6f66,
  ahsap: 0x8b5a2b,
  ahsapAcik: 0xb07a43,
  biber: 0xc0392b,
  fistik: 0x7cb342,
  altin: 0xf4a024,
  gri: 0x9e9e9e,
};
export const CSS = {
  koyu: "#3b2416",
  krem: "#f6e7cf",
  krem2: "#fff8ec",
  bakir: "#c8743a",
  cini: "#2a9d8f",
  biber: "#c0392b",
  fistik: "#5b8f2a",
  altin: "#f4a024",
  soluk: "#a88a70",
};
export const FONT = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';

export const API_URL: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
