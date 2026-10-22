/** Sahnelerin ortak kullandığı küçük arayüz parçaları. */
import Phaser from "phaser";
import { sfx, titret } from "./audio";
import { CSS, FONT, RENK } from "./config";

export function yazi(scene: Phaser.Scene, x: number, y: number, metin: string, boyut = 28, renk: string = CSS.koyu, kalin = 700) {
  return scene.add.text(x, y, metin, { fontFamily: FONT, fontSize: `${boyut}px`, color: renk, fontStyle: String(kalin) }).setOrigin(0.5);
}

export interface ButonSecenek {
  w?: number;
  h?: number;
  renk?: number;
  golge?: number;
  yaziRenk?: string;
  boyut?: number;
  ikon?: string;
  ikonBoyut?: number;
}

/** Basınca aşağı inen, alt gölgeli tombul buton. */
export class Buton extends Phaser.GameObjects.Container {
  private zemin: Phaser.GameObjects.Graphics;
  etiket: Phaser.GameObjects.Text;
  ikon?: Phaser.GameObjects.Image;
  private o: Required<Omit<ButonSecenek, "ikon">> & { ikon?: string };
  private kapali = false;

  constructor(scene: Phaser.Scene, x: number, y: number, metin: string, private tikla: () => void, secenek: ButonSecenek = {}) {
    super(scene, x, y);
    this.o = { w: 300, h: 76, renk: RENK.bakir, golge: RENK.bakirKoyu, yaziRenk: "#ffffff", boyut: 30, ikonBoyut: 44, ...secenek };
    this.zemin = scene.add.graphics();
    this.etiket = yazi(scene, 0, -3, metin, this.o.boyut, this.o.yaziRenk, 800);
    this.add([this.zemin, this.etiket]);
    if (this.o.ikon) {
      this.ikon = scene.add.image(-this.o.w / 2 + 14 + this.o.ikonBoyut / 2, -3, this.o.ikon).setDisplaySize(this.o.ikonBoyut, this.o.ikonBoyut);
      this.add(this.ikon);
      this.etiket.setX(this.o.ikonBoyut / 2 + 4);
    }
    this.ciz(false);
    this.setSize(this.o.w, this.o.h + 8);
    this.setInteractive({ useHandCursor: true });
    this.on("pointerdown", () => {
      if (this.kapali) return;
      this.ciz(true);
    });
    this.on("pointerout", () => this.ciz(false));
    this.on("pointerup", () => {
      if (this.kapali) {
        sfx.hata();
        return;
      }
      this.ciz(false);
      sfx.tik();
      titret(8);
      this.tikla();
    });
    scene.add.existing(this);
  }

  private ciz(basili: boolean) {
    const { w, h, renk, golge } = this.o;
    const g = this.zemin;
    const dy = basili ? 5 : 0;
    g.clear();
    g.fillStyle(this.kapali ? 0x8a7a6a : golge).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 20);
    g.fillStyle(this.kapali ? 0xb5a594 : renk).fillRoundedRect(-w / 2, -h / 2 + dy, w, h - dy, 20);
    g.fillStyle(0xffffff, 0.14).fillRoundedRect(-w / 2 + 12, -h / 2 + dy + 5, w - 24, Math.min(h * 0.2, 14), 7);
    this.etiket.setY(-3 + dy);
    this.ikon?.setY(-3 + dy);
  }

  setKapali(k: boolean) {
    this.kapali = k;
    this.ciz(false);
    return this;
  }

  setRenk(renk: number, golge: number) {
    this.o.renk = renk;
    this.o.golge = golge;
    this.ciz(false);
    return this;
  }

  setMetin(m: string) {
    this.etiket.setText(m);
    return this;
  }
}

const sonUyari = new WeakMap<Phaser.Scene, Phaser.GameObjects.GameObject[]>();

/** Kısa bilgi balonu. Yenisi gelince önceki hemen kaldırılır, üst üste binmez. */
export function uyari(scene: Phaser.Scene, metin: string, y = 740) {
  sonUyari.get(scene)?.forEach((o) => o.destroy());
  const t = yazi(scene, scene.scale.width / 2, y, metin, 26, "#ffffff", 700).setDepth(1000);
  const pad = 18;
  const bg = scene.add.graphics().setDepth(999);
  bg.fillStyle(0x2a170c, 0.88).fillRoundedRect(t.x - t.width / 2 - pad, y - t.height / 2 - 6, t.width + pad * 2, t.height + 12, 16);
  scene.tweens.add({ targets: [t, bg], alpha: 0, delay: 900, duration: 400, onComplete: () => { t.destroy(); bg.destroy(); } });
  sonUyari.set(scene, [t, bg]);
}

/** Bir noktadan yukarı süzülüp kaybolan yazı (kazanılan para vb.). */
export function ucanYazi(scene: Phaser.Scene, x: number, y: number, metin: string, renk: string = CSS.fistik, boyut = 34) {
  const t = yazi(scene, x, y, metin, boyut, renk, 800).setDepth(900).setStroke("#ffffff", 6);
  scene.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1100, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}

/** Ahşap çerçeveli panel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, renk = 0x4a2c1a) {
  const g = scene.add.graphics();
  g.fillStyle(0x1e0f06, 0.5).fillRoundedRect(x + 3, y + 6, w, h, 22);
  g.fillStyle(renk).fillRoundedRect(x, y, w, h, 22);
  g.lineStyle(3, 0x6b4128).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 20);
  return g;
}

export const tl = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} ₺`;

/** Oyun içi evet/hayır penceresi (tarayıcının confirm kutusu yerine). */
export function onayla(scene: Phaser.Scene, soru: string, evet: string, hayir = "Vazgeç"): Promise<boolean> {
  return new Promise((coz) => {
    const W = scene.scale.width, H = scene.scale.height;
    const c = scene.add.container(0, 0).setDepth(2000);
    const perde = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
    c.add(perde);
    c.add(panel(scene, 70, H / 2 - 190, W - 140, 380, RENK.krem2));
    c.add(scene.add.text(W / 2, H / 2 - 100, soru, { fontFamily: FONT, fontSize: "32px", color: CSS.koyu, fontStyle: "800", align: "center", wordWrap: { width: W - 220 } }).setOrigin(0.5));
    const kapat = (sonuc: boolean) => {
      c.destroy();
      coz(sonuc);
    };
    c.add(new Buton(scene, W / 2, H / 2 + 40, evet, () => kapat(true), { w: 420, h: 80, boyut: 30, renk: RENK.biber, golge: 0x8e2a1f }));
    c.add(new Buton(scene, W / 2, H / 2 + 135, hayir, () => kapat(false), { w: 420, h: 72, boyut: 28, renk: 0x6b4128, golge: 0x3b2416 }));
  });
}
