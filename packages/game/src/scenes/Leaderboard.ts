/** Skor tablosu: çevrim içiyse sunucudaki doğrulanmış skorlar, değilse bu cihazdaki en iyi oyunlar. */
import Phaser from "phaser";
import { type ScoreRow, leaderboard, online } from "../api";
import { CSS, H, RENK, W } from "../config";
import { duvar } from "../dekor";
import { save } from "../save";
import { Buton, panel, tl, yazi } from "../ui";

export class Leaderboard extends Phaser.Scene {
  private liste?: Phaser.GameObjects.Container;
  private donem: "all" | "week" = "all";

  constructor() {
    super("Leaderboard");
  }

  create() {
    duvar(this, 0, H, 24);
    yazi(this, W / 2, 130, "Skor Tablosu", 60, CSS.koyu, 800);
    panel(this, 30, 250, W - 60, 820, RENK.krem2);
    if (online()) {
      const sekme = (x: number, ad: string, d: "all" | "week") =>
        new Buton(this, x, 200, ad, () => {
          this.donem = d;
          void this.yukle();
        }, { w: 220, h: 60, boyut: 24, renk: 0x6b4128, golge: 0x3b2416 });
      sekme(W / 2 - 120, "Tüm zamanlar", "all");
      sekme(W / 2 + 120, "Bu hafta", "week");
      void this.yukle();
    } else {
      yazi(this, W / 2, 200, "Bu cihazdaki en iyi oyunların", 26, CSS.soluk, 600);
      const p = save.profile;
      this.ciz(save.scores.map((s, i) => ({ rank: i + 1, name: p?.name ?? "Sen", shop: p?.shop ?? "", score: s.score, day: s.day, finished: s.finished })));
    }
    new Buton(this, W / 2, H - 110, "Geri", () => this.scene.start("Menu"), { w: 400, h: 84, boyut: 32 });
  }

  private async yukle() {
    this.ciz([], "Yükleniyor…");
    try {
      const r = await leaderboard(this.donem);
      this.ciz(r.rows, r.rows.length ? undefined : "Henüz skor yok. İlk sen ol!", r.me);
    } catch (e) {
      this.ciz([], `Sunucuya ulaşılamadı: ${(e as Error).message}`);
    }
  }

  private ciz(rows: ScoreRow[], mesaj?: string, ben?: ScoreRow) {
    this.liste?.destroy();
    const c = (this.liste = this.add.container(0, 0));
    if (mesaj || !rows.length) {
      c.add(yazi(this, W / 2, 600, mesaj ?? "Henüz oyun bitirmedin.", 28, CSS.soluk, 600));
      return;
    }
    const satir = (r: ScoreRow, y: number, vurgu = false) => {
      if (vurgu) {
        const g = this.add.graphics();
        g.fillStyle(0xfff0d0).fillRoundedRect(46, y - 34, W - 92, 68, 14);
        c.add(g);
      }
      const madalya = r.rank <= 3 ? ["#d4a017", "#9e9e9e", "#b0723f"][r.rank - 1] : CSS.soluk;
      c.add(yazi(this, 86, y, `${r.rank}`, 30, madalya, 800));
      c.add(yazi(this, 130, y - 12, r.name, 26, CSS.koyu, 800).setOrigin(0, 0.5));
      c.add(yazi(this, 130, y + 16, r.shop + (r.finished ? " · 10 gün" : ` · ${r.day}. gün`), 18, CSS.soluk, 600).setOrigin(0, 0.5));
      c.add(yazi(this, W - 70, y, tl(r.score), 28, CSS.koyu, 800).setOrigin(1, 0.5));
    };
    rows.slice(0, 10).forEach((r, i) => satir(r, 300 + i * 74, ben?.rank === r.rank));
    if (ben && ben.rank > 10) satir(ben, 300 + 10 * 74 + 10, true);
  }
}
