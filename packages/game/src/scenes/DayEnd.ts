/** Gün sonu: günün özeti ve dükkânı büyütmek için geliştirme alışverişi. */
import Phaser from "phaser";
import { type DaySummary, UPGRADES, type UpgradeId, buy, upgradeCost } from "@ocakbasi/core";
import { sfx } from "../audio";
import { CSS, H, RENK, W } from "../config";
import { ciniSerit, duvar } from "../dekor";
import { oyun } from "../oyun";
import { Buton, panel, tl, ucanYazi, uyari, yazi } from "../ui";

export class DayEnd extends Phaser.Scene {
  private ozet!: DaySummary;
  private kasa!: Phaser.GameObjects.Text;
  private kasaIkon!: Phaser.GameObjects.Image;
  private kartlar: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("DayEnd");
  }

  init(data: { ozet: DaySummary }) {
    this.ozet = data.ozet;
  }

  create() {
    const a = oyun.aktif;
    if (!a) return void this.scene.start("Menu");
    const run = a.run;
    duvar(this, 0, H, 24);

    yazi(this, W / 2, 105, `${this.ozet.day}. gün bitti`, 56, CSS.koyu, 800);
    const net = this.ozet.income + this.ozet.tips - this.ozet.costs;

    // özet kartı: iki sütun, altta günün kârı
    panel(this, 40, 160, W - 80, 232, RENK.krem2);
    const satir = (x: number, y: number, sol: string, sag: string, renk: string = CSS.koyu) => {
      yazi(this, x, y, sol, 23, CSS.soluk, 600).setOrigin(0, 0.5);
      yazi(this, x + 262, y, sag, 25, renk, 800).setOrigin(1, 0.5);
    };
    const o = this.ozet;
    satir(72, 200, "Servis", `${o.served} müşteri`);
    satir(72, 238, "Kızıp giden", `${o.lost}`, o.lost ? CSS.biber : CSS.koyu);
    satir(72, 276, "Yanan", `${o.burnt}`, o.burnt ? CSS.biber : CSS.koyu);
    satir(386, 200, "Satış", tl(o.income));
    satir(386, 238, "Bahşiş", tl(o.tips), CSS.altin);
    satir(386, 276, "Malzeme", `-${tl(o.costs)}`, CSS.biber);
    this.add.graphics().lineStyle(2, 0xe2c9a6).lineBetween(72, 306, W - 72, 306);
    yazi(this, 72, 345, "Günün kârı", 28, CSS.koyu, 800).setOrigin(0, 0.5);
    yazi(this, W - 72, 345, tl(net), 36, net >= 0 ? CSS.fistik : CSS.biber, 800).setOrigin(1, 0.5);

    ciniSerit(this, 410, 30);
    yazi(this, 50, 486, "Dükkânı büyüt", 38, CSS.koyu, 800).setOrigin(0, 0.5);
    this.kasa = yazi(this, W - 50, 486, "", 32, CSS.koyu, 800).setOrigin(1, 0.5);
    this.kasaIkon = this.add.image(0, 486, "para").setScale(0.7);

    this.kartlariCiz();

    new Buton(this, W / 2, H - 90, `${run.day}. güne başla`, () => this.scene.start("Kitchen"), { w: 520, h: 92, boyut: 36, renk: RENK.cini, golge: RENK.ciniKoyu });
  }

  private kartlariCiz() {
    const run = oyun.aktif!.run;
    this.kasa.setText(tl(run.cash));
    this.kasaIkon.setX(this.kasa.x - this.kasa.width - 26);
    this.kartlar.forEach((k) => k.destroy());
    this.kartlar = [];
    const liste = UPGRADES.filter((u) => u.day <= run.day);
    const kw = 312, kh = 108, gap = 10;
    liste.forEach((u, i) => {
      const x = W / 2 + (i % 2 ? 1 : -1) * (kw / 2 + gap / 2);
      const y = 570 + Math.floor(i / 2) * (kh + gap);
      const cost = upgradeCost(run, u.id);
      const seviye = run.upgrades[u.id] ?? 0;
      const yetmez = cost != null && run.cash < cost;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x1e0f06, 0.3).fillRoundedRect(-kw / 2 + 2, -kh / 2 + 5, kw, kh, 18);
      g.fillStyle(cost == null ? 0xe8f5e9 : 0xffffff).fillRoundedRect(-kw / 2, -kh / 2, kw, kh, 18);
      g.lineStyle(3, cost == null ? 0x81c784 : yetmez ? 0xe2c9a6 : RENK.bakir).strokeRoundedRect(-kw / 2, -kh / 2, kw, kh, 18);
      c.add(g);
      c.add(this.add.image(-kw / 2 + 44, 0, `u-${u.id}`).setDisplaySize(64, 64));
      c.add(yazi(this, -kw / 2 + 86, -kh / 2 + 22, u.name, 22, CSS.koyu, 800).setOrigin(0, 0.5));
      c.add(this.add.text(-kw / 2 + 86, -kh / 2 + 36, u.desc, { fontFamily: '"Baloo 2", sans-serif', fontSize: "17px", color: CSS.soluk, wordWrap: { width: kw - 100 } }));
      const alt = cost == null ? "Alındı" : `${tl(cost)}${u.costs.length > 1 ? ` · ${seviye + 1}/${u.costs.length}` : ""}`;
      c.add(yazi(this, -kw / 2 + 86, kh / 2 - 17, alt, 21, cost == null ? CSS.fistik : yetmez ? CSS.soluk : CSS.bakir, 800).setOrigin(0, 0.5));
      if (cost != null) {
        c.setSize(kw, kh).setInteractive({ useHandCursor: true });
        c.on("pointerup", () => this.al(u.id, x, y));
      }
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 250, delay: i * 40 });
      this.kartlar.push(c);
    });
  }

  private al(id: UpgradeId, x: number, y: number) {
    const run = oyun.aktif!.run;
    const r = buy(run, id);
    if (!r.ok) {
      sfx.hata();
      uyari(this, r.reason, y - 80);
      return;
    }
    sfx.kasa();
    oyun.alimYap(id);
    ucanYazi(this, x, y - 40, "Alındı!", CSS.fistik, 34);
    this.kartlariCiz();
  }
}
