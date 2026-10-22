/** Oyun sonu: kalpler bittiğinde ya da 10. gün tamamlandığında. Skor kaydedilir, çevrim içiyse sunucuya gönderilir. */
import Phaser from "phaser";
import { finishRun, online } from "../api";
import { sfx } from "../audio";
import { CSS, H, RENK, W } from "../config";
import { duvar, tabela } from "../dekor";
import { oyun } from "../oyun";
import { save } from "../save";
import { Buton, panel, tl, yazi } from "../ui";

export class Result extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  create() {
    const a = oyun.bitir();
    if (!a) return void this.scene.start("Menu");
    const { run } = a;
    const oncekiEnIyi = save.best;
    save.addScore({ score: run.earned, day: run.day, finished: run.finished, at: new Date().toISOString() });
    const rekor = run.earned > oncekiEnIyi;

    duvar(this, 0, H, 24);
    tabela(this, W / 2, 150, save.profile?.shop ?? "Ocakbaşı", 560);
    yazi(this, W / 2, 290, run.finished ? "Antep'in en iyi ustası!" : "Dükkân kapandı", 52, run.finished ? CSS.fistik : CSS.biber, 800);
    yazi(this, W / 2, 345, run.finished ? "10 günün hepsini tamamladın." : `${run.day}. günde müşterilerin sabrı tükendi.`, 26, CSS.soluk, 600);

    panel(this, 60, 400, W - 120, 330, RENK.krem2);
    yazi(this, W / 2, 450, "Toplam kazanç", 28, CSS.soluk, 700);
    const skor = yazi(this, W / 2, 520, tl(0), 80, CSS.koyu, 800);
    this.tweens.addCounter({ from: 0, to: run.earned, duration: 1200, ease: "Cubic.out", onUpdate: (t) => skor.setText(tl(t.getValue() ?? 0)) });
    if (rekor) {
      const r = yazi(this, W / 2, 590, "Yeni rekor!", 36, CSS.altin, 800).setStroke("#3b2416", 6);
      this.tweens.add({ targets: r, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
      sfx.kalp();
    } else yazi(this, W / 2, 590, `En iyi skorun: ${tl(Math.max(oncekiEnIyi, run.earned))}`, 26, CSS.soluk, 600);
    const servis = run.history.reduce((t, d) => t + d.served, 0);
    yazi(this, W / 2, 650, `${servis} müşteri doyurdun · ${run.history.length} gün`, 26, CSS.koyu, 700);

    const durum = yazi(this, W / 2, 790, "", 26, CSS.soluk, 600);
    if (online() && a.runId) {
      durum.setText("Skor sunucuya gönderiliyor…");
      finishRun(a.runId, a.log)
        .then((r) => durum.setText(`Skor tablosunda ${r.rank}. sıradasın!`).setColor(CSS.cini))
        .catch((e: Error) => durum.setText(`Skor gönderilemedi: ${e.message}`).setColor(CSS.biber));
    } else if (online()) durum.setText("Bu oyun çevrim dışı başladığı için skor tablosuna girmez.");

    new Buton(this, W / 2, 900, "Yeniden oyna", async () => {
      await oyun.yeni();
      this.scene.start("Kitchen");
    }, { w: 460, h: 90, boyut: 34, renk: RENK.cini, golge: RENK.ciniKoyu });
    new Buton(this, W / 2, 1020, "Skor tablosu", () => this.scene.start("Leaderboard"), { w: 460, h: 80, boyut: 30 });
    new Buton(this, W / 2, 1130, "Ana menü", () => this.scene.start("Menu"), { w: 460, h: 80, boyut: 30, renk: 0x6b4128, golge: 0x3b2416 });
  }
}
