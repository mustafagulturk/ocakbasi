/**
 * Bütün görseller kodla çizilir: telif sorunu yok, uygulama boyutu küçük kalır, her ekran çözünürlüğünde net görünür.
 * Her yemek 128x128'lik bir dokuya çizilir ve oyunda küçültülerek kullanılır.
 */
import Phaser from "phaser";
import type { ProductId } from "@ocakbasi/core";

const S = 128;
type G = Phaser.GameObjects.Graphics;

function sis(g: G, y: number, x1 = 8, x2 = 120) {
  g.lineStyle(5, 0x8c8c8c).lineBetween(x1, y, x2, y);
  g.fillStyle(0x6d6d6d).fillCircle(x1 + 2, y, 5);
  g.fillStyle(0xb0b0b0).fillRect(x2 - 10, y - 4, 12, 8);
}

function lavas(g: G) {
  g.fillStyle(0xd9b27a).fillEllipse(64, 84, 122, 50);
  g.fillStyle(0xe9c88f).fillEllipse(64, 80, 116, 44);
  g.fillStyle(0xc99a5c, 0.6);
  [[30, 78], [52, 92], [84, 72], [98, 90], [70, 86]].forEach(([x, y]) => g.fillCircle(x, y, 3));
}

function domatesBiber(g: G, x: number, y: number) {
  g.fillStyle(0xd32f2f).fillCircle(x, y, 10);
  g.fillStyle(0xff6f60).fillCircle(x - 3, y - 3, 3);
  g.fillStyle(0x558b2f).fillEllipse(x + 22, y + 4, 30, 10);
  g.fillStyle(0x7cb342).fillEllipse(x + 20, y + 2, 26, 6);
}

const CIZIM: Record<ProductId, (g: G) => void> = {
  simit(g) {
    lavas(g);
    sis(g, 58);
    g.fillStyle(0x6b3418).fillRoundedRect(18, 44, 78, 28, 13);
    g.fillStyle(0x8d4a2a).fillRoundedRect(20, 45, 74, 22, 11);
    g.lineStyle(3, 0x4a220e, 0.8);
    for (let x = 30; x < 92; x += 12) g.lineBetween(x, 47, x - 4, 67);
    domatesBiber(g, 96, 84);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(26, 48, 50, 5, 3);
  },
  patlican(g) {
    lavas(g);
    sis(g, 58);
    for (let i = 0; i < 6; i++) {
      const x = 20 + i * 15;
      if (i % 2) {
        g.fillStyle(0x3d1747).fillCircle(x, 58, 12);
        g.fillStyle(0x5e2a6e).fillCircle(x, 58, 10);
        g.fillStyle(0xe8d7a0).fillCircle(x, 58, 6);
      } else {
        g.fillStyle(0x6b3418).fillCircle(x, 58, 12);
        g.fillStyle(0x8d4a2a).fillCircle(x - 1, 57, 10);
      }
    }
    domatesBiber(g, 98, 86);
  },
  kusbasi(g) {
    sis(g, 64);
    for (let i = 0; i < 5; i++) {
      const x = 22 + i * 18;
      g.fillStyle(0x6b3418).fillRoundedRect(x - 9, 53, 18, 22, 4);
      g.fillStyle(0x9c5530).fillRoundedRect(x - 8, 54, 15, 17, 4);
      g.fillStyle(0xffffff, 0.2).fillRect(x - 6, 56, 6, 3);
    }
  },
  alinazik(g) {
    g.fillStyle(0xd7d7d7).fillCircle(64, 68, 56);
    g.fillStyle(0xffffff).fillCircle(64, 66, 54);
    g.lineStyle(2, 0x2a9d8f).strokeCircle(64, 66, 48);
    g.fillStyle(0xe7dcc1).fillCircle(64, 66, 40);
    g.fillStyle(0x8a8f6a, 0.5);
    [[48, 56], [76, 60], [56, 82], [82, 80], [64, 50]].forEach(([x, y]) => g.fillEllipse(x, y, 14, 5));
    const kup = [[52, 60], [66, 56], [78, 66], [58, 74], [72, 78], [62, 66]];
    kup.forEach(([x, y]) => {
      g.fillStyle(0x6b3418).fillRoundedRect(x - 8, y - 7, 16, 14, 3);
      g.fillStyle(0x9c5530).fillRoundedRect(x - 7, y - 7, 13, 11, 3);
    });
    g.fillStyle(0xd84315, 0.85);
    [[44, 70], [84, 56], [70, 88], [50, 84]].forEach(([x, y]) => g.fillCircle(x, y, 3));
  },
  lahmacun(g) {
    g.fillStyle(0xc9935a).fillCircle(64, 66, 58);
    g.fillStyle(0xe8b97a).fillCircle(64, 64, 56);
    g.fillStyle(0xc1442e).fillCircle(64, 64, 47);
    g.fillStyle(0x9e2f1d);
    for (let i = 0; i < 26; i++) {
      const a = (i * 2.4) % (Math.PI * 2), r = 8 + ((i * 13) % 36);
      g.fillCircle(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 3);
    }
    g.fillStyle(0x558b2f);
    [[50, 50], [78, 58], [60, 80], [84, 78], [44, 72]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 5));
    g.fillStyle(0xf9d71c).slice(100, 104, 20, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(290)).fillPath();
    g.fillStyle(0xfff59d).slice(100, 104, 14, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(285)).fillPath();
  },
  katmer(g) {
    g.fillStyle(0xd7d7d7).fillEllipse(64, 90, 120, 34);
    g.fillStyle(0xffffff).fillEllipse(64, 86, 116, 30);
    g.fillStyle(0xd9a94e).fillRoundedRect(22, 36, 84, 58, 10);
    g.fillStyle(0xf2d38b).fillRoundedRect(24, 36, 80, 52, 10);
    g.lineStyle(2, 0xd9a94e).lineBetween(24, 54, 104, 54).lineBetween(24, 70, 104, 70).lineBetween(50, 36, 50, 88).lineBetween(78, 36, 78, 88);
    g.fillStyle(0xfdf6e3).fillEllipse(64, 50, 34, 10);
    g.fillStyle(0x7cb342);
    for (let i = 0; i < 22; i++) g.fillCircle(30 + ((i * 37) % 70), 40 + ((i * 23) % 44), 2.6);
  },
  beyran(g) {
    g.fillStyle(0x8d4a20).fillEllipse(64, 70, 116, 40);
    g.fillStyle(0xc8743a).fillRoundedRect(10, 60, 108, 40, { tl: 0, tr: 0, bl: 40, br: 40 });
    g.fillStyle(0xe8955a).fillRect(10, 64, 108, 5);
    g.fillStyle(0x6f2a14).fillEllipse(64, 60, 104, 30);
    g.fillStyle(0xb23a1f).fillEllipse(64, 59, 96, 24);
    g.fillStyle(0xfff3d6);
    for (let i = 0; i < 14; i++) g.fillEllipse(30 + ((i * 29) % 68), 52 + ((i * 7) % 14), 5, 3);
    g.fillStyle(0x7a2e16);
    [[44, 58], [72, 54], [86, 62], [58, 64]].forEach(([x, y]) => g.fillEllipse(x, y, 14, 4));
    g.lineStyle(3, 0xffffff, 0.35);
    g.beginPath().arc(48, 30, 8, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)).strokePath();
    g.beginPath().arc(74, 24, 8, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)).strokePath();
  },
  ayran(g) {
    g.fillStyle(0xbcd6dc, 0.6).fillPoints([{ x: 34, y: 16 }, { x: 94, y: 16 }, { x: 86, y: 118 }, { x: 42, y: 118 }], true);
    g.fillStyle(0xfdfdf8).fillPoints([{ x: 38, y: 30 }, { x: 90, y: 30 }, { x: 84, y: 112 }, { x: 44, y: 112 }], true);
    g.fillStyle(0xffffff);
    [[46, 28], [58, 24], [70, 27], [82, 25], [52, 32], [76, 31]].forEach(([x, y]) => g.fillCircle(x, y, 7));
    g.lineStyle(3, 0x9fbcc4).strokePoints([{ x: 34, y: 16 }, { x: 94, y: 16 }, { x: 86, y: 118 }, { x: 42, y: 118 }], true);
    g.fillStyle(0xffffff, 0.6).fillRect(46, 44, 5, 56);
  },
  baklava(g) {
    g.fillStyle(0xbfbfbf).fillEllipse(64, 92, 122, 36);
    g.fillStyle(0xf7f7f7).fillEllipse(64, 88, 118, 32);
    const dilim = (cx: number, cy: number) => {
      g.fillStyle(0xb07a2a).fillPoints([{ x: cx, y: cy - 22 }, { x: cx + 20, y: cy }, { x: cx, y: cy + 22 }, { x: cx - 20, y: cy }], true);
      g.fillStyle(0xe3b25a).fillPoints([{ x: cx, y: cy - 20 }, { x: cx + 17, y: cy - 2 }, { x: cx, y: cy + 15 }, { x: cx - 17, y: cy - 2 }], true);
      g.fillStyle(0x6a9f2c).fillPoints([{ x: cx, y: cy - 8 }, { x: cx + 7, y: cy }, { x: cx, y: cy + 6 }, { x: cx - 7, y: cy }], true);
      g.lineStyle(1.5, 0xc78f37).lineBetween(cx - 12, cy + 4, cx + 12, cy + 4);
    };
    dilim(40, 66);
    dilim(88, 66);
    dilim(64, 54);
  },
  menengic(g) {
    g.fillStyle(0xd7d7d7).fillEllipse(64, 100, 110, 26);
    g.fillStyle(0xffffff).fillEllipse(64, 96, 104, 22);
    g.fillStyle(0xffffff).fillRoundedRect(34, 40, 60, 58, { tl: 6, tr: 6, bl: 22, br: 22 });
    g.lineStyle(4, 0xffffff).strokeCircle(100, 64, 12);
    g.fillStyle(0x2a9d8f).fillRect(34, 56, 60, 8);
    g.fillStyle(0xc8743a);
    for (let x = 40; x < 92; x += 10) g.fillCircle(x, 60, 2);
    g.fillStyle(0x8a6b4a).fillEllipse(64, 42, 58, 12);
    g.fillStyle(0xb38f66).fillEllipse(60, 41, 30, 6);
    g.lineStyle(3, 0x7a5a44, 0.4);
    g.beginPath().arc(56, 20, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)).strokePath();
    g.beginPath().arc(72, 14, 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)).strokePath();
  },
};

function kalp(g: G, dolu: boolean) {
  const yol = (s: number, ox: number, oy: number) => {
    g.fillCircle(ox + 16 * s, oy + 16 * s, 14 * s);
    g.fillCircle(ox + 40 * s, oy + 16 * s, 14 * s);
    g.fillTriangle(ox + 3 * s, oy + 22 * s, ox + 53 * s, oy + 22 * s, ox + 28 * s, oy + 50 * s);
  };
  g.fillStyle(dolu ? 0x8e1b12 : 0x5a3a2a);
  yol(1, 0, 2);
  g.fillStyle(dolu ? 0xe53935 : 0x7a5a44);
  yol(0.9, 3, 2);
  if (dolu) g.fillStyle(0xffffff, 0.45).fillCircle(16, 14, 5);
}

/** Boot sahnesinde bir kez çağrılır. */
/** Gün sonu alışveriş kartlarındaki geliştirme simgeleri (96×96). */
const GELISTIRME: Record<string, (g: G) => void> = {
  izgara: (g) => {
    g.fillStyle(0x2b2b2b).fillRoundedRect(8, 40, 80, 34, 8);
    g.fillStyle(0xff6d00, 0.9).fillRoundedRect(14, 48, 68, 10, 5);
    g.lineStyle(4, 0x9e9e9e);
    for (let x = 16; x <= 80; x += 12) g.lineBetween(x, 36, x, 60);
    g.fillStyle(0x8d4a2a).fillRoundedRect(20, 26, 56, 14, 7);
    g.lineStyle(3, 0xbdbdbd).lineBetween(10, 33, 86, 33);
    g.fillStyle(0x3d3d3d).fillRect(16, 74, 6, 14).fillRect(74, 74, 6, 14);
  },
  masa: (g) => {
    g.fillStyle(0x6b4128).fillRect(18, 52, 8, 34).fillRect(70, 52, 8, 34);
    g.fillStyle(0x8d5a3a).fillRoundedRect(8, 40, 80, 16, 6);
    g.fillStyle(0xfffdf6).fillEllipse(48, 38, 40, 12);
    g.fillStyle(0x2a9d8f).fillRect(40, 18, 16, 20);
    g.fillStyle(0xe53935).fillCircle(48, 16, 7);
    g.fillStyle(0x6b4128).fillRect(0, 66, 10, 22).fillRect(86, 66, 10, 22);
  },
  tepsi: (g) => {
    g.fillStyle(0x9e9e9e).fillEllipse(48, 58, 92, 40);
    g.fillStyle(0xd9d9d9).fillEllipse(48, 54, 86, 34);
    g.fillStyle(0xfffdf6).fillEllipse(30, 50, 30, 16).fillEllipse(66, 50, 30, 16);
    g.lineStyle(2, 0x2a9d8f).strokeEllipse(30, 50, 22, 10).strokeEllipse(66, 50, 22, 10);
  },
  dekor: (g) => {
    g.fillStyle(0xa83232).fillRoundedRect(6, 62, 84, 26, 6);
    g.fillStyle(0xf4c430);
    for (let x = 14; x < 86; x += 18) g.fillPoints([{ x, y: 75 }, { x: x + 7, y: 68 }, { x: x + 14, y: 75 }, { x: x + 7, y: 82 }], true);
    g.fillStyle(0xb5652d).fillCircle(48, 40, 22);
    g.fillStyle(0xd88a4a).fillCircle(42, 34, 8);
    g.fillStyle(0x8d4a1f).fillRect(40, 12, 16, 8).fillRect(66, 34, 14, 6);
  },
  tabela: (g) => {
    g.lineStyle(4, 0x3b2416).lineBetween(26, 6, 26, 26).lineBetween(70, 6, 70, 26);
    g.fillStyle(0xffd166, 0.35).fillRoundedRect(2, 22, 92, 56, 14);
    g.fillStyle(0x6b4128).fillRoundedRect(8, 28, 80, 44, 10);
    g.fillStyle(0xffe3a3).fillCircle(24, 50, 5).fillCircle(40, 50, 5).fillCircle(56, 50, 5).fillCircle(72, 50, 5);
  },
  komur: (g) => {
    g.fillStyle(0x2b2b2b).fillCircle(30, 66, 16).fillCircle(56, 70, 18).fillCircle(76, 62, 12).fillCircle(46, 54, 14);
    g.fillStyle(0xff6d00, 0.85).fillCircle(36, 62, 5).fillCircle(58, 66, 6).fillCircle(48, 52, 4);
    g.fillStyle(0xff7a1a).fillCircle(48, 34, 12).fillTriangle(36, 32, 60, 32, 48, 6);
    g.fillStyle(0xffd166).fillCircle(48, 37, 7).fillTriangle(41, 36, 55, 36, 48, 18);
  },
  firin: (g) => {
    g.fillStyle(0xb0723f).fillRoundedRect(6, 30, 84, 58, 10);
    g.fillStyle(0xc88a52).fillCircle(48, 34, 30);
    g.fillStyle(0x2a170c).fillRoundedRect(28, 44, 40, 34, 16);
    g.fillStyle(0xff6d00, 0.9).fillRoundedRect(32, 64, 32, 10, 5);
  },
  kazan: (g) => {
    g.fillStyle(0x8d4a1f).fillRect(10, 36, 8, 10).fillRect(78, 36, 8, 10);
    g.fillStyle(0xb5652d).fillRoundedRect(14, 32, 68, 50, 16);
    g.fillStyle(0xd88a4a).fillRoundedRect(10, 28, 76, 12, 6);
    g.fillStyle(0xc0392b).fillEllipse(48, 32, 60, 10);
    g.fillStyle(0xffffff, 0.7).fillCircle(36, 16, 6).fillCircle(54, 10, 5).fillCircle(60, 20, 4);
  },
  ocak: (g) => {
    // alev üstünde cezve
    g.fillStyle(0x3d3d3d).fillRoundedRect(14, 78, 68, 12, 6);
    g.fillStyle(0x2a9d8f).fillCircle(32, 74, 6).fillCircle(48, 72, 7).fillCircle(64, 74, 6);
    g.fillStyle(0xd4a017).fillPoints([{ x: 30, y: 30 }, { x: 62, y: 30 }, { x: 68, y: 66 }, { x: 24, y: 66 }], true);
    g.fillStyle(0xb8860b).fillRect(26, 26, 40, 8).fillRoundedRect(62, 36, 30, 7, 3);
    g.fillStyle(0xffffff, 0.7).fillCircle(42, 16, 5).fillCircle(52, 8, 4);
  },
};

export function dokulariUret(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const [id, ciz] of Object.entries(CIZIM)) {
    g.clear();
    ciz(g);
    g.generateTexture(`p-${id}`, S, S);
  }

  g.clear();
  kalp(g, true);
  g.generateTexture("kalp", 56, 56);
  g.clear();
  kalp(g, false);
  g.generateTexture("kalp-bos", 56, 56);

  g.clear();
  g.fillStyle(0xb8860b).fillCircle(24, 24, 22);
  g.fillStyle(0xf4c430).fillCircle(24, 24, 19);
  g.lineStyle(3, 0xb8860b).strokeCircle(24, 24, 13);
  g.fillStyle(0xfff3b0, 0.8).fillCircle(17, 16, 4);
  g.generateTexture("para", 48, 48);

  g.clear();
  g.fillStyle(0x6d6d6d).fillRoundedRect(8, 26, 40, 30, 6);
  g.lineStyle(6, 0x6d6d6d).beginPath().arc(28, 26, 13, Math.PI, 0).strokePath();
  g.fillStyle(0x3b2416).fillCircle(28, 40, 5).fillRect(26, 40, 4, 9);
  g.generateTexture("kilit", 56, 60);

  g.clear();
  g.fillStyle(0xd0c3ad).fillEllipse(50, 30, 96, 52);
  g.fillStyle(0xfffdf6).fillEllipse(50, 27, 90, 46);
  g.lineStyle(2, 0x2a9d8f, 0.7).strokeEllipse(50, 27, 74, 34);
  g.generateTexture("tabak", 100, 58);

  g.clear();
  g.fillStyle(0xffffff, 1).fillCircle(32, 32, 30);
  g.generateTexture("duman", 64, 64);

  g.clear();
  // alev: alt kısmı yuvarlak, ucu sivri bir damla
  g.fillStyle(0xff7a1a).fillCircle(16, 28, 12).fillTriangle(4, 26, 28, 26, 16, 0);
  g.fillStyle(0xffd166).fillCircle(16, 31, 7).fillTriangle(9, 30, 23, 30, 16, 12);
  g.generateTexture("alev", 32, 40);

  for (const [id, ciz] of Object.entries(GELISTIRME)) {
    g.clear();
    ciz(g);
    g.generateTexture(`u-${id}`, 96, 96);
  }

  g.clear();
  g.fillStyle(0xffffff).fillCircle(8, 8, 8);
  g.generateTexture("kivilcim", 16, 16);

  g.destroy();
}

export interface Gorunum {
  ten: number;
  gomlek: number;
  sac: number;
  sapka: "yok" | "kasket" | "takke" | "esarp";
  biyik: boolean;
  gozluk: boolean;
}

const TENLER = [0xf1c27d, 0xe0ac69, 0xc68642, 0xffdbac, 0xd9a066];
const GOMLEKLER = [0x2a9d8f, 0xc0392b, 0x3d5a80, 0x8d6e63, 0x6a994e, 0xe9c46a, 0x7b2cbf, 0x264653];
const SACLAR = [0x2b1b10, 0x4a2c17, 0x111111, 0x8c8c8c, 0x6d4c2f];

/** Müşterinin görünümü tohumdan belirlenir: aynı müşteri her yerde aynı görünür. */
export function gorunum(look: number): Gorunum {
  const r = (n: number, k: number) => Math.floor(look / k) % n;
  const sapkalar: Gorunum["sapka"][] = ["yok", "kasket", "yok", "takke", "esarp", "yok"];
  const sapka = sapkalar[r(sapkalar.length, 7)];
  return {
    ten: TENLER[r(TENLER.length, 1)],
    gomlek: GOMLEKLER[r(GOMLEKLER.length, 13)],
    sac: SACLAR[r(SACLAR.length, 101)],
    sapka,
    biyik: sapka !== "esarp" && r(3, 977) !== 0,
    gozluk: r(5, 3001) === 0,
  };
}

export type Ruh = "mutlu" | "normal" | "kizgin";

/** Müşteriyi çizer: gövde ve kafa merkez (0,0) etrafında, yüz (0,-110) civarında. */
export function musteriCiz(g: G, v: Gorunum, ruh: Ruh) {
  g.clear();
  // gövde
  g.fillStyle(Phaser.Display.Color.IntegerToColor(v.gomlek).darken(20).color).fillRoundedRect(-52, -60, 104, 130, 34);
  g.fillStyle(v.gomlek).fillRoundedRect(-48, -60, 96, 124, 30);
  g.fillStyle(0xffffff, 0.15).fillRoundedRect(-36, -50, 20, 80, 10);
  // boyun
  g.fillStyle(v.ten).fillRect(-12, -76, 24, 20);
  // kafa
  g.fillStyle(Phaser.Display.Color.IntegerToColor(v.ten).darken(12).color).fillCircle(0, -112, 44);
  g.fillStyle(v.ten).fillCircle(0, -114, 42);
  g.fillCircle(-41, -110, 8).fillCircle(41, -110, 8);
  // saç / şapka
  if (v.sapka === "esarp") {
    g.fillStyle(v.gomlek === 0xc0392b ? 0x2a9d8f : 0xc0392b);
    g.fillRoundedRect(-50, -162, 100, 52, { tl: 46, tr: 46, bl: 6, br: 6 });
    g.fillRoundedRect(-52, -120, 18, 66, 8).fillRoundedRect(34, -120, 18, 66, 8);
    g.fillStyle(0xffffff, 0.3);
    for (let x = -36; x <= 36; x += 18) g.fillCircle(x, -140, 3);
  } else {
    g.fillStyle(v.sac).fillRoundedRect(-42, -158, 84, 30, { tl: 40, tr: 40, bl: 4, br: 4 });
    if (v.sapka === "kasket") {
      g.fillStyle(0x4e4e4e).fillRoundedRect(-46, -168, 92, 30, { tl: 40, tr: 40, bl: 4, br: 4 });
      g.fillStyle(0x3a3a3a).fillRoundedRect(-8, -146, 62, 10, 5);
    } else if (v.sapka === "takke") {
      g.fillStyle(0xffffff).fillRoundedRect(-30, -164, 60, 22, { tl: 28, tr: 28, bl: 0, br: 0 });
      g.lineStyle(2, 0xd0d0d0).lineBetween(-26, -150, 26, -150);
    }
  }
  // gözler
  g.fillStyle(0x2b1b10);
  if (ruh === "kizgin") {
    g.lineStyle(4, 0x2b1b10).lineBetween(-26, -132, -8, -124).lineBetween(26, -132, 8, -124);
  }
  g.fillCircle(-15, -116, 5).fillCircle(15, -116, 5);
  if (v.gozluk) g.lineStyle(3, 0x333333).strokeCircle(-15, -116, 11).strokeCircle(15, -116, 11).lineBetween(-4, -116, 4, -116);
  // yanaklar
  if (ruh === "mutlu") g.fillStyle(0xff8a80, 0.45).fillCircle(-26, -100, 7).fillCircle(26, -100, 7);
  // bıyık
  if (v.biyik) g.fillStyle(v.sac === 0x8c8c8c ? 0x9e9e9e : 0x2b1b10).fillEllipse(-11, -97, 24, 9).fillEllipse(11, -97, 24, 9);
  // ağız
  g.lineStyle(4, 0x7a2e16);
  if (ruh === "mutlu") g.beginPath().arc(0, -96, 12, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160)).strokePath();
  else if (ruh === "kizgin") g.beginPath().arc(0, -78, 12, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335)).strokePath();
  else g.lineBetween(-9, -86, 9, -86);
}
