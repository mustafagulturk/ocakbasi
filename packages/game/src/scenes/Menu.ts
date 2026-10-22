import Phaser from "phaser";
import { CSS, H, RENK, W } from "../config";
import { bakirKaplar, duman, duvar, tabela } from "../dekor";
import { kayitFormu } from "../kayit";
import { oyun } from "../oyun";
import { save } from "../save";
import { Buton, onayla, tl, yazi } from "../ui";

export class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    duvar(this, 0, H, 40);
    bakirKaplar(this, 170, [70, 150, 570, 650]);

    // Logo
    const logo = this.add.container(W / 2, 250);
    const baslik = yazi(this, 0, 0, "Ocakbaşı", 112, "#ffe3a3", 800).setStroke("#3b2416", 14);
    baslik.setShadow(0, 8, "#2a170c", 0, true, true);
    const alt = yazi(this, 0, 78, "ANTEP USULÜ", 34, CSS.cini, 800).setStroke("#fff8ec", 8);
    logo.add([baslik, alt]);
    this.tweens.add({ targets: logo, y: 262, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // Izgara ve cızırdayan kebaplar
    this.izgara(W / 2, 520);

    const p = save.profile;
    if (p) tabela(this, W / 2, 700, p.shop, 560);

    const kayit = oyun.devam();
    let y = kayit ? 830 : 860;
    if (kayit) {
      new Buton(this, W / 2, y, `Devam et · ${kayit.run.day}. gün`, () => this.scene.start("Kitchen"), { w: 470, h: 90, boyut: 34, renk: RENK.cini, golge: RENK.ciniKoyu });
      yazi(this, W / 2, y + 62, `Kasada ${tl(kayit.run.cash)} · Toplam kazanç ${tl(kayit.run.earned)}`, 22, CSS.soluk, 600);
      y += 130;
    }
    new Buton(this, W / 2, y, kayit ? "Yeni oyun" : "Dükkânı aç", () => this.yeniOyun(!!kayit), { w: 470, h: 90, boyut: 34 });
    y += 120;
    new Buton(this, W / 2 - 120, y, "Skorlar", () => this.scene.start("Leaderboard"), { w: 230, h: 76, boyut: 28, renk: 0x6b4128, golge: 0x3b2416 });
    const ses = new Buton(this, W / 2 + 120, y, save.sound ? "Ses: açık" : "Ses: kapalı", () => {
      save.setSound(!save.sound);
      ses.setMetin(save.sound ? "Ses: açık" : "Ses: kapalı");
    }, { w: 230, h: 76, boyut: 28, renk: 0x6b4128, golge: 0x3b2416 });

    if (p) {
      const duzenle = yazi(this, W / 2, H - 70, `Usta: ${p.name} · Bilgileri düzenle`, 24, CSS.bakir, 700).setInteractive({ useHandCursor: true });
      duzenle.on("pointerup", async () => {
        await kayitFormu(save.profile);
        this.scene.restart();
      });
    }
    if (save.best) yazi(this, W / 2, H - 112, `En iyi skorun: ${tl(save.best)}`, 24, CSS.soluk, 600);

    if (!p) void kayitFormu().then(() => this.scene.restart());
  }

  private async yeniOyun(uzerine: boolean) {
    if (!save.profile) {
      await kayitFormu();
    }
    if (uzerine && !(await onayla(this, "Yarım kalan oyunun silinecek. Yeni oyuna başlansın mı?", "Evet, baştan başla"))) return;
    await oyun.yeni();
    this.scene.start("Kitchen");
  }

  private izgara(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x1e0f06, 0.4).fillRoundedRect(x - 230, y + 34, 460, 34, 16);
    g.fillStyle(0x2b2b2b).fillRoundedRect(x - 220, y - 30, 440, 80, 14);
    g.fillStyle(0x3d3d3d).fillRoundedRect(x - 210, y - 22, 420, 30, 10);
    g.fillStyle(0xff6d00, 0.85).fillRoundedRect(x - 200, y - 14, 400, 16, 8);
    g.lineStyle(4, 0x9e9e9e);
    for (let i = -190; i <= 190; i += 24) g.lineBetween(x + i, y - 26, x + i, y + 6);
    for (let i = 0; i < 8; i++) {
      const alev = this.add.image(x - 175 + i * 50, y - 6, "alev").setScale(0.8).setAlpha(0.9);
      this.tweens.add({ targets: alev, scaleY: 1.2, alpha: 0.6, duration: 260 + i * 37, yoyo: true, repeat: -1 });
    }
    ["simit", "patlican", "simit"].forEach((p, i) => {
      const k = this.add.image(x - 130 + i * 130, y - 34, `p-${p}`).setScale(0.95);
      this.tweens.add({ targets: k, y: y - 38, duration: 600 + i * 120, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });
    duman(this, x, y - 50, 360, 3);
  }
}
