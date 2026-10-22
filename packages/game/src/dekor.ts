/** Dükkân duvarı, çini şerit, tabela gibi sahneler arasında ortak arka plan parçaları. */
import Phaser from "phaser";
import { FONT, RENK, W } from "./config";

/** Antep çinisi deseninde yatay şerit. */
export function ciniSerit(scene: Phaser.Scene, y: number, h = 56) {
  const g = scene.add.graphics();
  g.fillStyle(RENK.ciniKoyu).fillRect(0, y - 4, W, h + 8);
  for (let x = 0; x < W; x += h) {
    g.fillStyle(0xf7f1e3).fillRect(x + 2, y, h - 4, h);
    g.fillStyle(RENK.cini).fillPoints([{ x: x + h / 2, y: y + 6 }, { x: x + h - 8, y: y + h / 2 }, { x: x + h / 2, y: y + h - 6 }, { x: x + 8, y: y + h / 2 }], true);
    g.fillStyle(0xf7f1e3).fillCircle(x + h / 2, y + h / 2, h * 0.16);
    g.fillStyle(RENK.biber).fillCircle(x + h / 2, y + h / 2, h * 0.08);
    g.fillStyle(RENK.ciniKoyu);
    [[x + 6, y + 6], [x + h - 6, y + 6], [x + 6, y + h - 6], [x + h - 6, y + h - 6]].forEach(([cx, cy]) => g.fillCircle(cx, cy, 3));
  }
  return g;
}

/** Krem duvar, üstte çini şerit, asılı bakır kaplar. */
export function duvar(scene: Phaser.Scene, y0: number, y1: number, ciniY = y0 + 18) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0xf9ecd6, 0xf9ecd6, 0xeedbbb, 0xeedbbb).fillRect(0, y0, W, y1 - y0);
  g.fillStyle(0xe6cfa9, 0.5);
  for (let yy = y0 + 90; yy < y1; yy += 46) for (let x = (yy / 46) % 2 ? 0 : 40; x < W; x += 80) g.fillRoundedRect(x, yy, 74, 40, 4);
  ciniSerit(scene, ciniY, 44);
  return g;
}

export function bakirKaplar(scene: Phaser.Scene, y: number, xs: number[]) {
  const g = scene.add.graphics();
  xs.forEach((x, i) => {
    const r = 24 + (i % 2) * 8;
    g.lineStyle(3, 0x6b4128).lineBetween(x, y - 30, x, y - r + 4);
    g.fillStyle(RENK.bakirKoyu).fillCircle(x, y, r + 2);
    g.fillStyle(RENK.bakir).fillCircle(x, y, r);
    g.fillStyle(0xf0a46a, 0.7).fillCircle(x - r * 0.35, y - r * 0.35, r * 0.3);
    g.lineStyle(2, RENK.bakirKoyu).strokeCircle(x, y, r * 0.65);
  });
  return g;
}

/** Ahşap tabela; dükkân adı uzunsa yazı küçülür. */
export function tabela(scene: Phaser.Scene, x: number, y: number, metin: string, w = 520, h = 92) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.lineStyle(4, 0x4a2c1a).lineBetween(-w / 2 + 40, -h / 2 - 34, -w / 2 + 40, -h / 2).lineBetween(w / 2 - 40, -h / 2 - 34, w / 2 - 40, -h / 2);
  g.fillStyle(0x1e0f06, 0.4).fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 18);
  g.fillStyle(0x6b4128).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  g.fillStyle(0x8b5a2b).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 12);
  g.lineStyle(2, 0x6b4128, 0.5);
  for (let yy = -h / 2 + 22; yy < h / 2 - 10; yy += 14) g.lineBetween(-w / 2 + 14, yy, w / 2 - 14, yy);
  const boyut = Math.min(44, Math.floor(((w - 50) / Math.max(metin.length, 1)) * 1.75));
  const t = scene.add.text(0, -2, metin, { fontFamily: FONT, fontSize: `${boyut}px`, color: "#ffe3a3", fontStyle: "800" }).setOrigin(0.5).setStroke("#3b2416", 6);
  t.setShadow(0, 0, "#f4a024", 12, true, true);
  c.add([g, t]);
  return c;
}

/** Izgaradan yükselen duman. */
export function duman(scene: Phaser.Scene, x: number, y: number, genislik = 120, depth = 5) {
  return scene.add
    .particles(x, y, "duman", {
      x: { min: -genislik / 2, max: genislik / 2 },
      speedY: { min: -60, max: -30 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.25, end: 0.9 },
      alpha: { start: 0.28, end: 0 },
      lifespan: 1600,
      frequency: 180,
      tint: 0xd9d2c5,
    })
    .setDepth(depth);
}
