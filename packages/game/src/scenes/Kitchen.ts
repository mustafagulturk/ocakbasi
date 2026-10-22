/**
 * Oyunun kendisi: bir günlük servis. Kurallar @ocakbasi/core'da; bu sahne sadece durumu çizer ve dokunuşları hamleye çevirir.
 * Zaman sabit adımlarla (saniyede 10 tik) ilerler, her hamle o anki tikle kaydedilir; skor sunucuda aynen yeniden oynatılabilir.
 */
import Phaser from "phaser";
import {
  type Action,
  DAY_TICKS,
  type DayState,
  type GameEvent,
  KAZAN,
  MAX_HEARTS,
  PRODUCTS,
  type ProductId,
  type RunState,
  type StationId,
  TICKS_PER_SECOND,
  apply,
  burnTicks,
  cookTicks,
  endDay,
  startDay,
  step,
  unlocked,
} from "@ocakbasi/core";
import { type Ruh, gorunum, musteriCiz } from "../art";
import { sfx, titret } from "../audio";
import { CSS, FONT, H, RENK, W } from "../config";
import { duman, duvar, tabela } from "../dekor";
import { oyun } from "../oyun";
import { save } from "../save";
import { Buton, panel, tl, ucanYazi, uyari, yazi } from "../ui";

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MUSTERI_Y = 470;
const TEZGAH_Y = 548;

interface MusteriView {
  id: number;
  c: Phaser.GameObjects.Container;
  govde: Phaser.GameObjects.Graphics;
  ruh: Ruh;
  balon: Phaser.GameObjects.Container;
  ikonlar: { img: Phaser.GameObjects.Image; tik: Phaser.GameObjects.Image }[];
  sabir: Phaser.GameObjects.Graphics;
  gidiyor: boolean;
}

interface SlotView {
  c: Phaser.GameObjects.Container;
  ikon: Phaser.GameObjects.Image;
  halka: Phaser.GameObjects.Graphics;
  yandiDuman?: Phaser.GameObjects.Particles.ParticleEmitter;
}

const KISA: Partial<Record<ProductId, string>> = {
  simit: "Simit", patlican: "Patlıcan", kusbasi: "Kuşbaşı", lahmacun: "Lahmacun", katmer: "Katmer", menengic: "Menengiç",
};

export class Kitchen extends Phaser.Scene {
  private run!: RunState;
  private d!: DayState;
  private actions: [number, Action][] = [];
  private acc = 0;
  private duraklat = true;
  private kapandi = false;

  private koltukX: number[] = [];
  private musteriler: (MusteriView | null)[] = [];
  private slotlar: Record<StationId, SlotView[]> = { izgara: [], firin: [], ocak: [] };
  private tepsi: { tabak: Phaser.GameObjects.Image; ikon: Phaser.GameObjects.Image; sil: number }[] = [];
  private kasaYazi!: Phaser.GameObjects.Text;
  private saatYazi!: Phaser.GameObjects.Text;
  private zamanCubuk!: Phaser.GameObjects.Graphics;
  private kalpler: Phaser.GameObjects.Image[] = [];
  private ipucu!: Phaser.GameObjects.Text;
  private kazanYazi?: Phaser.GameObjects.Text;
  private kazanCubuk?: Phaser.GameObjects.Graphics;
  private beyranBtn?: Phaser.GameObjects.Container;
  private aliNazikBtn?: Phaser.GameObjects.Container;
  private durakPanel?: Phaser.GameObjects.Container;

  constructor() {
    super("Kitchen");
  }

  create() {
    const k = oyun.devam();
    if (!k) return void this.scene.start("Menu");
    this.run = k.run;
    this.d = startDay(this.run);
    this.actions = [];
    this.acc = 0;
    this.duraklat = true;
    this.kapandi = false;
    this.musteriler = this.d.seats.map(() => null);
    this.slotlar = { izgara: [], firin: [], ocak: [] };
    this.tepsi = [];
    this.kalpler = [];
    this.koltukX = [];
    this.kazanYazi = this.kazanCubuk = this.beyranBtn = this.aliNazikBtn = this.durakPanel = undefined;

    this.arkaPlan();
    this.hud();
    this.istasyonlar();
    this.tepsiKur();
    this.ipucu = yazi(this, W / 2, 775, "", 24, CSS.krem, 700).setDepth(50);
    this.girisAfisi();

    this.game.events.on(Phaser.Core.Events.HIDDEN, this.arkaPlanaGecti, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.arkaPlanaGecti, this));
  }

  // ---------- Döngü ----------

  update(_t: number, dt: number) {
    if (!this.duraklat && !this.kapandi) {
      this.acc += Math.min(dt, 250);
      while (this.acc >= TICK_MS && !this.kapandi) {
        this.acc -= TICK_MS;
        this.olaylar(step(this.d));
        if (this.d.closed) this.gunKapandi();
      }
    }
    this.ciz(this.acc / TICK_MS);
  }

  private hamle(a: Action, x?: number, y?: number) {
    if (this.duraklat || this.kapandi) return false;
    const tik = this.d.tick;
    const r = apply(this.d, a);
    if (!r.ok) {
      sfx.hata();
      uyari(this, r.reason, y ? Math.min(y - 60, 740) : 740);
      return false;
    }
    this.actions.push([tik, a]);
    titret(10);
    this.olaylar(r.events, x, y);
    return true;
  }

  private olaylar(ev: GameEvent[], x?: number, y?: number) {
    for (const e of ev) {
      switch (e.type) {
        case "arrive":
          sfx.zil();
          break;
        case "served": {
          sfx.kasa();
          const v = this.musteriler[e.seat];
          const mx = this.koltukX[e.seat];
          ucanYazi(this, mx, MUSTERI_Y - 220, `+${e.amount + e.tip} ₺`, CSS.fistik, 40);
          if (e.tip > 0) ucanYazi(this, mx, MUSTERI_Y - 170, `bahşiş ${e.tip} ₺`, CSS.altin, 24);
          if (e.heart) {
            sfx.kalp();
            ucanYazi(this, mx, MUSTERI_Y - 270, "+1 kalp", CSS.biber, 30);
          }
          if (v) this.musteriGonder(e.seat, true);
          break;
        }
        case "angry":
          sfx.kizgin();
          titret(60);
          this.cameras.main.shake(180, 0.006);
          this.musteriGonder(e.seat, false);
          break;
        case "done":
          sfx.hazir();
          this.tweens.add({ targets: this.slotlar[e.station][e.slot]?.ikon, scale: "*=1.15", duration: 120, yoyo: true });
          break;
        case "burnt":
          sfx.yandi();
          break;
        case "trash":
          sfx.cizz();
          if (x != null && y != null) ucanYazi(this, x, y - 30, "çöpe", CSS.soluk, 26);
          break;
        case "refilled":
          sfx.hazir();
          break;
        case "gameover":
        case "closed":
          break;
      }
    }
  }

  // ---------- Kurulum ----------

  private arkaPlan() {
    duvar(this, 96, TEZGAH_Y + 10, 104);
    // pencereler: dışarıda Antep kalesi silüeti
    const g = this.add.graphics();
    [[110, 300], [610, 300]].forEach(([x, y]) => {
      g.fillStyle(0x6b4128).fillRoundedRect(x - 70, y - 90, 140, 170, { tl: 70, tr: 70, bl: 6, br: 6 });
      g.fillGradientStyle(0x8ecae6, 0x8ecae6, 0xffd6a5, 0xffd6a5).fillRoundedRect(x - 60, y - 80, 120, 152, { tl: 60, tr: 60, bl: 4, br: 4 });
      g.fillStyle(0xc9a27e).fillRect(x - 60, y + 30, 120, 42);
      g.fillStyle(0xb08968);
      for (let i = -60; i < 60; i += 16) g.fillRect(x + i, y + 22, 10, 10);
      g.fillRect(x - 20, y + 4, 40, 28);
      g.lineStyle(5, 0x6b4128).lineBetween(x, y - 80, x, y + 72).lineBetween(x - 60, y - 6, x + 60, y - 6);
    });
    tabela(this, W / 2, 175, save.profile?.shop ?? "Ocakbaşı", 420, 70);

    // tezgâh
    const t = this.add.graphics().setDepth(20);
    t.fillStyle(0x1e0f06, 0.35).fillRect(0, TEZGAH_Y + 6, W, 20);
    t.fillStyle(0xd9a066).fillRect(0, TEZGAH_Y - 8, W, 30);
    t.fillStyle(0xe8b97a).fillRect(0, TEZGAH_Y - 8, W, 8);
    t.fillStyle(RENK.ahsap).fillRect(0, TEZGAH_Y + 22, W, 760 - TEZGAH_Y - 22);
    t.lineStyle(2, 0x6b4128, 0.6);
    for (let x = 0; x < W; x += 120) t.lineBetween(x, TEZGAH_Y + 22, x, 760);
    // mutfak zemini
    const z = this.add.graphics();
    z.fillStyle(0x3b2416).fillRect(0, 760, W, H - 760);
    z.fillStyle(0x45291a);
    for (let y = 760; y < H; y += 60) for (let x = (y / 60) % 2 ? 0 : 60; x < W; x += 120) z.fillRect(x, y, 60, 60);
  }

  private hud() {
    const g = this.add.graphics().setDepth(60);
    g.fillStyle(RENK.koyu).fillRect(0, 0, W, 96);
    g.fillStyle(0x000000, 0.25).fillRect(0, 96, W, 6);
    yazi(this, 22, 30, `${this.run.day}. Gün`, 34, "#ffe3a3", 800).setOrigin(0, 0.5).setDepth(61);
    this.saatYazi = yazi(this, 22, 68, "09:00", 24, CSS.krem, 600).setOrigin(0, 0.5).setDepth(61);
    this.zamanCubuk = this.add.graphics().setDepth(61);
    for (let i = 0; i < MAX_HEARTS; i++) this.kalpler.push(this.add.image(250 + i * 44, 48, "kalp").setScale(0.72).setDepth(61));
    this.add.image(530, 48, "para").setScale(0.75).setDepth(61);
    this.kasaYazi = yazi(this, 556, 48, "", 30, "#ffe3a3", 800).setOrigin(0, 0.5).setDepth(61);
    const durak = this.add.container(W - 40, 48).setDepth(61).setSize(64, 64).setInteractive({ useHandCursor: true });
    const dg = this.add.graphics();
    dg.fillStyle(0x6b4128).fillRoundedRect(-26, -26, 52, 52, 14);
    dg.fillStyle(0xffe3a3).fillRoundedRect(-11, -13, 8, 26, 3).fillRoundedRect(3, -13, 8, 26, 3);
    durak.add(dg);
    durak.on("pointerup", () => this.duraklatPaneli());
    this.kalpler.forEach((k) => k.setX(k.x - 10));
  }

  private istasyonlar() {
    const r = this.run;
    // Izgara
    panel(this, 14, 790, 440, 222);
    yazi(this, 34, 814, "IZGARA", 22, "#ffcf8a", 800).setOrigin(0, 0.5);
    this.slotKur("izgara", 234, 880, 4);
    const izgaraUrun: ProductId[] = ["simit", "patlican", "kusbasi"];
    izgaraUrun.forEach((p, i) => this.urunButonu(p, 234 + (i - 1) * 144, 968, 136));

    // Ocak (menengiç)
    panel(this, 466, 790, 240, 222);
    yazi(this, 486, 814, "OCAK", 22, "#ffcf8a", 800).setOrigin(0, 0.5);
    if (r.day >= PRODUCTS.menengic.day) {
      this.slotKur("ocak", 586, 880, 2);
      this.urunButonu("menengic", 586, 968, 200);
    } else this.kilitli(586, 905, PRODUCTS.menengic.day, "Menengiç kahvesi");

    // Fırın
    panel(this, 14, 1026, 360, 240);
    yazi(this, 34, 1050, "TAŞ FIRIN", 22, "#ffcf8a", 800).setOrigin(0, 0.5);
    if (r.day >= PRODUCTS.lahmacun.day) {
      const fg = this.add.graphics();
      fg.fillStyle(0x2a170c).fillRoundedRect(28, 1066, 332, 116, { tl: 50, tr: 50, bl: 10, br: 10 });
      fg.fillStyle(0xff6d00, 0.35).fillRoundedRect(36, 1150, 316, 24, 10);
      this.slotKur("firin", 194, 1122, 3);
      (["lahmacun", "katmer"] as ProductId[]).forEach((p, i) => this.urunButonu(p, 194 + (i ? 88 : -88), 1220, 168));
    } else this.kilitli(194, 1150, PRODUCTS.lahmacun.day, "Antep lahmacunu");

    // Tezgâh: hazır ürünler, kazan, Ali Nazik
    panel(this, 386, 1026, 320, 240);
    this.tezgahKarosu("ayran", 466, 1088);
    this.tezgahKarosu("baklava", 626, 1088);
    this.tezgahKarosu("beyran", 466, 1204);
    this.tezgahKarosu("alinazik", 626, 1204);
  }

  private kilitli(x: number, y: number, gun: number, ad: string) {
    this.add.image(x, y - 26, "kilit").setScale(0.8).setAlpha(0.7);
    yazi(this, x, y + 22, `${gun}. günde açılır`, 22, CSS.soluk, 700);
    yazi(this, x, y + 50, ad, 20, CSS.soluk, 500);
  }

  private slotKur(st: StationId, cx: number, y: number, max: number) {
    const n = this.d.stations[st].length;
    const w = 96, gap = 10;
    for (let i = 0; i < max; i++) {
      const x = cx - ((max - 1) * (w + gap)) / 2 + i * (w + gap);
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      if (i < n) {
        g.fillStyle(0x222222).fillRoundedRect(-w / 2, -42, w, 84, 14);
        if (st === "izgara") {
          g.fillStyle(0xff6d00, 0.5).fillRoundedRect(-w / 2 + 6, 18, w - 12, 14, 6);
          g.lineStyle(3, 0x8c8c8c);
          for (let k = -36; k <= 36; k += 12) g.lineBetween(k, -36, k, 36);
        } else if (st === "ocak") {
          g.lineStyle(4, 0x555555).strokeCircle(0, 4, 30);
          g.fillStyle(0x1e88e5, 0.5).fillCircle(0, 4, 18);
        }
      } else {
        g.lineStyle(2, 0x6b4128).strokeRoundedRect(-w / 2, -42, w, 84, 14);
        const kt = yazi(this, 0, 0, "+", 40, "#6b4128", 800);
        c.add(kt);
      }
      c.addAt(g, 0);
      if (i >= n) continue;
      const ikon = this.add.image(0, -2, "p-simit").setDisplaySize(84, 84).setVisible(false);
      const halka = this.add.graphics();
      c.add([halka, ikon]);
      c.setSize(w, 84).setInteractive({ useHandCursor: true });
      c.on("pointerup", () => this.hamle({ type: "take", station: st, slot: i }, x, y));
      this.slotlar[st].push({ c, ikon, halka });
    }
    if (st === "izgara") duman(this, cx, y - 40, n * 100, 4);
  }

  private urunButonu(p: ProductId, x: number, y: number, w: number) {
    const prod = PRODUCTS[p];
    if (!unlocked(this.run, p)) {
      const g = this.add.graphics();
      g.lineStyle(2, 0x6b4128).strokeRoundedRect(x - w / 2, y - 30, w, 60, 14);
      this.add.image(x - w / 2 + 26, y, "kilit").setScale(0.5).setAlpha(0.6);
      yazi(this, x + 14, y, `${prod.day}. gün`, 20, CSS.soluk, 700);
      return;
    }
    const b = new Buton(this, x, y, KISA[p] ?? prod.name, () => this.hamle({ type: "cook", product: p }, x, y), {
      w, h: 60, boyut: 21, ikon: `p-${p}`, ikonBoyut: 40, renk: 0x8b5a2b, golge: 0x4a2c1a,
    });
    b.etiket.setY(-10);
    const fiyat = yazi(this, b.etiket.x, 13, `-${prod.cost} ₺`, 16, "#ffcf8a", 600);
    b.add(fiyat);
  }

  private tezgahKarosu(p: ProductId, x: number, y: number) {
    const prod = PRODUCTS[p];
    const w = 148, h = 106;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    if (!unlocked(this.run, p)) {
      g.lineStyle(2, 0x6b4128).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
      c.add(g);
      c.add(this.add.image(0, -18, "kilit").setScale(0.55).setAlpha(0.6));
      c.add(yazi(this, 0, 16, `${prod.day}. gün`, 20, CSS.soluk, 700));
      c.add(yazi(this, 0, 38, prod.name, 15, CSS.soluk, 500));
      return;
    }
    const renk = p === "ayran" ? 0x5c8ea1 : p === "baklava" ? 0x8b5a2b : p === "beyran" ? RENK.bakirKoyu : 0x5b7f3a;
    g.fillStyle(0x1e0f06, 0.5).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 16);
    g.fillStyle(renk).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, 24, 10);
    c.add(g);
    c.add(this.add.image(0, -14, `p-${p}`).setDisplaySize(68, 68));
    const ad = p === "alinazik" ? "Ali Nazik" : p === "baklava" ? "Baklava" : prod.name;
    c.add(yazi(this, 0, 30, ad, 20, "#ffffff", 800));
    let alt = prod.cost ? `-${prod.cost} ₺` : "";
    if (p === "alinazik") alt = "kuşbaşı + yoğurt";
    if (p === "beyran") alt = "";
    const altYazi = yazi(this, 0, 48, alt, 14, "#ffe3a3", 600);
    c.add(altYazi);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on("pointerdown", () => c.setScale(0.95));
    c.on("pointerout", () => c.setScale(1));
    c.on("pointerup", () => {
      c.setScale(1);
      if (p === "alinazik") this.hamle({ type: "assemble" }, x, y);
      else if (p === "beyran" && this.d.kazan.portions === 0 && this.d.kazan.refill === 0) this.hamle({ type: "refill" }, x, y);
      else this.hamle({ type: "grab", product: p }, x, y);
    });
    if (p === "beyran") {
      this.beyranBtn = c;
      this.kazanYazi = altYazi;
      this.kazanCubuk = this.add.graphics();
      c.add(this.kazanCubuk);
    }
    if (p === "alinazik") this.aliNazikBtn = c;
  }

  private tepsiKur() {
    const cap = this.d.trayCap;
    const g = this.add.graphics().setDepth(21);
    const w = Math.min(680, cap * 112 + 20);
    g.fillStyle(0x1e0f06, 0.4).fillRoundedRect(W / 2 - w / 2 + 4, 618, w, 124, 30);
    g.fillStyle(0xb8b8b8).fillRoundedRect(W / 2 - w / 2, 612, w, 124, 30);
    g.fillStyle(0xd9d9d9).fillRoundedRect(W / 2 - w / 2 + 8, 620, w - 16, 108, 24);
    yazi(this, W / 2, 596, "TEPSİ", 18, "#ffe3a3", 800).setDepth(22);
    for (let i = 0; i < cap; i++) {
      const x = W / 2 - ((cap - 1) * 108) / 2 + i * 108;
      const tabak = this.add.image(x, 690, "tabak").setDepth(22);
      const ikon = this.add.image(x, 668, "p-simit").setDisplaySize(84, 84).setDepth(23).setVisible(false);
      tabak.setInteractive({ useHandCursor: true });
      const giris = { tabak, ikon, sil: 0 };
      tabak.on("pointerup", () => {
        if (i >= this.d.tray.length) return;
        // yanlışlıkla atmamak için iki dokunuş: ilki işaretler, ikincisi atar
        if (giris.sil > this.time.now) {
          giris.sil = 0;
          this.hamle({ type: "discard", index: i }, x, 680);
        } else {
          giris.sil = this.time.now + 1500;
          sfx.tik();
        }
      });
      this.tepsi.push(giris);
    }
  }

  private girisAfisi() {
    const yeni = (Object.keys(PRODUCTS) as ProductId[]).filter((p) => PRODUCTS[p].day === this.run.day && PRODUCTS[p].kind !== "ara");
    const c = this.add.container(W / 2, H / 2 - 80).setDepth(500);
    const perde = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setDepth(499).setInteractive();
    const g = this.add.graphics();
    const h = yeni.length ? 430 : 280;
    g.fillStyle(RENK.krem2).fillRoundedRect(-300, -h / 2, 600, h, 30);
    g.lineStyle(6, RENK.bakir).strokeRoundedRect(-300, -h / 2, 600, h, 30);
    c.add(g);
    c.add(yazi(this, 0, -h / 2 + 60, `${this.run.day}. Gün`, 64, CSS.koyu, 800));
    const alt = this.run.day === 1 ? "Ocak yandı, ilk müşteriler yolda!" : this.run.day === 10 ? "Son gün! Antep'in en iyi ustası ol." : "Dükkân açılıyor…";
    c.add(yazi(this, 0, -h / 2 + 120, alt, 26, CSS.soluk, 600));
    if (yeni.length) {
      c.add(yazi(this, 0, -30, "Menüye yeni girdi:", 26, CSS.cini, 800));
      yeni.forEach((p, i) => {
        const x = (i - (yeni.length - 1) / 2) * 200;
        c.add(this.add.image(x, 50, `p-${p}`).setDisplaySize(110, 110));
        c.add(yazi(this, x, 118, PRODUCTS[p].name, 22, CSS.koyu, 700));
      });
    }
    c.add(yazi(this, 0, h / 2 - 34, "Başlamak için dokun", 24, CSS.bakir, 700));
    c.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 350, ease: "Back.out" });
    const basla = () => {
      perde.destroy();
      this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 200, onComplete: () => c.destroy() });
      this.duraklat = false;
      sfx.zil();
    };
    perde.once("pointerup", basla);
  }

  private duraklatPaneli() {
    if (this.kapandi || this.durakPanel) return;
    this.duraklat = true;
    const c = this.add.container(0, 0).setDepth(600);
    const perde = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
    c.add(perde);
    c.add(yazi(this, W / 2, 420, "Mola", 72, "#ffe3a3", 800).setStroke("#3b2416", 10));
    c.add(new Buton(this, W / 2, 560, "Devam et", () => {
      c.destroy();
      this.durakPanel = undefined;
      this.duraklat = false;
    }, { w: 400, h: 86, renk: RENK.cini, golge: RENK.ciniKoyu }));
    c.add(new Buton(this, W / 2, 680, save.sound ? "Ses: açık" : "Ses: kapalı", () => {
      save.setSound(!save.sound);
      c.destroy();
      this.durakPanel = undefined;
      this.duraklatPaneli();
    }, { w: 400, h: 76, renk: 0x6b4128, golge: 0x3b2416, boyut: 28 }));
    c.add(new Buton(this, W / 2, 790, "Ana menü", () => this.scene.start("Menu"), { w: 400, h: 76, renk: 0x6b4128, golge: 0x3b2416, boyut: 28 }));
    c.add(yazi(this, W / 2, 880, "Ana menüye dönersen bugün baştan başlar.", 22, CSS.krem, 500));
    this.durakPanel = c;
  }

  private arkaPlanaGecti() {
    if (!this.duraklat && !this.kapandi) this.duraklatPaneli();
  }

  // ---------- Müşteriler ----------

  private koltuklar() {
    const n = this.d.seats.length;
    const kenar = 70;
    this.koltukX = Array.from({ length: n }, (_, i) => kenar + ((W - kenar * 2) * (i + 0.5)) / n);
  }

  private musteriYarat(seat: number) {
    const m = this.d.seats[seat]!;
    const x = this.koltukX[seat];
    const n = this.d.seats.length;
    const olcek = n >= 5 ? 0.78 : n === 4 ? 0.86 : 0.95;
    const c = this.add.container(x, MUSTERI_Y).setDepth(10);
    const govde = this.add.graphics();
    const v = gorunum(m.look);
    musteriCiz(govde, v, "mutlu");
    govde.setScale(olcek);
    c.add(govde);

    // sipariş balonu
    const ikonBoyut = n >= 5 ? 52 : 60;
    const bw = m.order.length * (ikonBoyut + 6) + 20;
    const balon = this.add.container(0, -190 * olcek - 64);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.18).fillRoundedRect(-bw / 2 + 3, -38, bw, 78, 20);
    bg.fillStyle(0xffffff).fillRoundedRect(-bw / 2, -42, bw, 78, 20);
    bg.fillTriangle(-12, 34, 12, 34, 0, 52);
    balon.add(bg);
    const ikonlar = m.order.map((p, i) => {
      const ix = -bw / 2 + 10 + ikonBoyut / 2 + i * (ikonBoyut + 6);
      const img = this.add.image(ix, -4, `p-${p}`).setDisplaySize(ikonBoyut, ikonBoyut);
      const tik = this.add.image(ix + ikonBoyut / 2 - 8, 18, "kivilcim").setTint(0x43a047).setScale(1.2).setVisible(false);
      balon.add([img, tik]);
      return { img, tik };
    });
    const sabir = this.add.graphics();
    balon.add(sabir);
    c.add(balon);

    const alan = this.add.zone(0, -60, 150 * olcek, 330 * olcek).setInteractive({ useHandCursor: true });
    alan.on("pointerup", () => this.hamle({ type: "serve", seat }, x, MUSTERI_Y - 120));
    balon.setSize(bw, 80).setInteractive({ useHandCursor: true });
    balon.on("pointerup", () => this.hamle({ type: "serve", seat }, x, MUSTERI_Y - 120));
    c.add(alan);

    // kapıdan girer gibi yandan kayarak gelir
    c.x = x + (x < W / 2 ? -260 : 260);
    c.alpha = 0;
    this.tweens.add({ targets: c, x, alpha: 1, duration: 420, ease: "Cubic.out" });
    balon.setScale(0);
    this.tweens.add({ targets: balon, scale: 1, delay: 300, duration: 300, ease: "Back.out" });

    this.musteriler[seat] = { id: m.id, c, govde, ruh: "mutlu", balon, ikonlar, sabir, gidiyor: false };
  }

  private musteriGonder(seat: number, mutlu: boolean) {
    const v = this.musteriler[seat];
    if (!v) return;
    this.musteriler[seat] = null;
    v.gidiyor = true;
    v.balon.destroy();
    if (mutlu) {
      this.ruhDegistir(v, "mutlu", seat);
      this.tweens.add({ targets: v.c, y: v.c.y - 30, duration: 160, yoyo: true, ease: "Quad.out" });
      this.tweens.add({ targets: v.c, x: v.c.x + 300, alpha: 0, delay: 350, duration: 500, ease: "Cubic.in", onComplete: () => v.c.destroy() });
    } else {
      this.ruhDegistir(v, "kizgin", seat);
      const k = this.kalpler[this.run.hearts];
      if (k) {
        const uc = this.add.image(v.c.x, v.c.y - 120, "kalp").setDepth(800);
        this.tweens.add({ targets: uc, x: k.x, y: k.y, scale: 0.7, duration: 600, ease: "Cubic.in", onComplete: () => uc.destroy() });
      }
      yazi(this, v.c.x, v.c.y - 250, "Hıh!", 40, CSS.biber, 800).setDepth(800).setStroke("#ffffff", 6).setData("gecici", true);
      this.tweens.add({ targets: v.c, angle: { from: -6, to: 6 }, duration: 70, repeat: 4, yoyo: true });
      this.tweens.add({ targets: v.c, x: v.c.x - 300, alpha: 0, delay: 500, duration: 500, ease: "Cubic.in", onComplete: () => v.c.destroy() });
      this.time.delayedCall(900, () => this.children.list.filter((o) => o.getData?.("gecici")).forEach((o) => o.destroy()));
    }
  }

  private ruhDegistir(v: MusteriView, ruh: Ruh, seat: number) {
    if (v.ruh === ruh) return;
    v.ruh = ruh;
    const m = this.d.seats[seat];
    musteriCiz(v.govde, gorunum(m?.look ?? v.id * 7919), ruh);
  }

  // ---------- Çizim ----------

  private ciz(f: number) {
    const d = this.d;
    if (this.koltukX.length !== d.seats.length) this.koltuklar();

    // HUD
    const oran = Math.min(1, (d.tick + f) / DAY_TICKS);
    const dakika = 9 * 60 + Math.floor(oran * 12 * 60);
    this.saatYazi.setText(`${String(Math.floor(dakika / 60)).padStart(2, "0")}:${String(dakika % 60).padStart(2, "0")}`);
    this.zamanCubuk.clear();
    this.zamanCubuk.fillStyle(0x2a170c).fillRoundedRect(100, 60, 110, 14, 7);
    this.zamanCubuk.fillStyle(oran > 0.85 ? RENK.biber : RENK.altin).fillRoundedRect(100, 60, Math.max(14, 110 * oran), 14, 7);
    this.kasaYazi.setText(tl(this.run.cash));
    this.kalpler.forEach((k, i) => k.setTexture(i < this.run.hearts ? "kalp" : "kalp-bos"));

    // müşteriler
    const tepsiSayac = new Map<ProductId, number>();
    for (const p of d.tray) tepsiSayac.set(p, (tepsiSayac.get(p) ?? 0) + 1);
    d.seats.forEach((m, seat) => {
      const v = this.musteriler[seat];
      if (m && (!v || v.id !== m.id)) {
        if (v) this.musteriGonder(seat, true);
        this.musteriYarat(seat);
      }
      const view = this.musteriler[seat];
      if (!m || !view) return;
      const r = Math.max(0, (m.left - f) / m.patience);
      this.ruhDegistir(view, r > 0.6 ? "mutlu" : r > 0.28 ? "normal" : "kizgin", seat);
      const kalan = new Map(tepsiSayac);
      view.ikonlar.forEach(({ img, tik }, i) => {
        const p = m.order[i];
        const var_ = (kalan.get(p) ?? 0) > 0;
        if (var_) kalan.set(p, kalan.get(p)! - 1);
        tik.setVisible(var_);
        img.setAlpha(var_ ? 1 : 0.92);
      });
      const bw = (view.balon.width || 120) - 24;
      view.sabir.clear();
      view.sabir.fillStyle(0xe0e0e0).fillRoundedRect(-bw / 2, 24, bw, 8, 4);
      const renk = r > 0.6 ? 0x43a047 : r > 0.28 ? 0xf9a825 : 0xe53935;
      view.sabir.fillStyle(renk).fillRoundedRect(-bw / 2, 24, Math.max(8, bw * r), 8, 4);
      if (r < 0.28) view.balon.setX(Math.sin(this.time.now / 40) * 2);
    });

    // istasyonlar
    for (const st of Object.keys(this.slotlar) as StationId[]) {
      this.slotlar[st].forEach((v, i) => {
        const s = d.stations[st][i];
        v.halka.clear();
        if (!s) {
          v.ikon.setVisible(false);
          v.yandiDuman?.stop();
          return;
        }
        v.ikon.setVisible(true).setTexture(`p-${s.product}`).setDisplaySize(84, 84);
        const pisme = cookTicks(this.run, s.product);
        const yanma = burnTicks(s.product);
        const t = s.t + f;
        if (t < pisme) {
          const o = t / pisme;
          v.ikon.setTint(Phaser.Display.Color.GetColor(255, Math.round(170 + 85 * o), Math.round(160 + 95 * o)));
          v.ikon.setAlpha(0.8 + 0.2 * o);
          this.halka(v.halka, o, 0xf9a825);
        } else if (t < pisme + yanma) {
          const o = (t - pisme) / yanma;
          v.ikon.clearTint().setAlpha(1);
          this.halka(v.halka, 1 - o, o > 0.6 ? 0xe53935 : 0x43a047, true);
          v.ikon.setY(-2 + Math.sin(this.time.now / 90) * 1.5);
        } else {
          v.ikon.setTint(0x3a3028).setAlpha(1);
          this.halka(v.halka, 1, 0x212121);
          if (!v.yandiDuman) {
            v.yandiDuman = this.add.particles(0, 0, "duman", {
              speedY: { min: -50, max: -20 }, scale: { start: 0.2, end: 0.6 }, alpha: { start: 0.6, end: 0 }, lifespan: 1000, frequency: 120, tint: 0x333333,
            });
            v.c.add(v.yandiDuman);
          } else if (!v.yandiDuman.emitting) v.yandiDuman.start();
        }
        if (t < pisme + yanma) v.yandiDuman?.stop();
      });
    }

    // tepsi
    this.tepsi.forEach((t, i) => {
      const p = d.tray[i];
      t.ikon.setVisible(!!p);
      if (p) t.ikon.setTexture(`p-${p}`).setDisplaySize(84, 84);
      const isaretli = !!p && t.sil > this.time.now;
      t.tabak.setTint(isaretli ? 0xff8a80 : 0xffffff);
      t.ikon.setAngle(isaretli ? Math.sin(this.time.now / 50) * 6 : 0);
    });

    // kazan
    if (this.kazanYazi && this.kazanCubuk) {
      const k = d.kazan;
      this.kazanCubuk.clear();
      if (k.refill > 0) {
        this.kazanYazi.setText("kazan doluyor…");
        const o = 1 - (k.refill - f) / (KAZAN.refillSeconds * TICKS_PER_SECOND);
        this.kazanCubuk.fillStyle(0x000000, 0.3).fillRoundedRect(-60, -50, 120, 8, 4);
        this.kazanCubuk.fillStyle(0xffe3a3).fillRoundedRect(-60, -50, 120 * Math.max(0, Math.min(1, o)), 8, 4);
      } else if (k.portions === 0) this.kazanYazi.setText(`doldur -${KAZAN.refillCost} ₺`);
      else this.kazanYazi.setText(`kazanda ${k.portions}/${k.cap} kâse`);
    }
    if (this.aliNazikBtn) this.aliNazikBtn.setAlpha(d.tray.includes("kusbasi") ? 1 : 0.75);

    this.ipucuGuncelle();
  }

  private halka(g: Phaser.GameObjects.Graphics, o: number, renk: number, kalin = false) {
    g.lineStyle(kalin ? 7 : 5, 0x000000, 0.35).strokeCircle(0, -2, 44);
    g.lineStyle(kalin ? 7 : 5, renk).beginPath().arc(0, -2, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o).strokePath();
  }

  /** İlk gün oyuncuya ne yapacağını adım adım söyler. */
  private ipucuGuncelle() {
    if (this.run.day > 1 || this.d.stats.served >= 3) {
      if (this.ipucu.text) this.ipucu.setText("");
      return;
    }
    const d = this.d;
    const izgara = d.stations.izgara;
    let m = "";
    const musteri = d.seats.find(Boolean);
    if (!musteri) m = "İlk müşteri geliyor…";
    else if (izgara.some((s) => s && s.t >= cookTicks(this.run, s.product) + burnTicks(s.product))) m = "Yanan kebaba dokunup çöpe at.";
    else if (izgara.some((s) => s && s.t >= cookTicks(this.run, s.product))) m = "Kebap pişti! Yanmadan dokunup tepsiye al.";
    else if (d.seats.some((c) => c && c.order.every((p) => d.tray.includes(p)))) m = "Siparişi hazır müşteriye dokunup servis et.";
    else if (izgara.some(Boolean)) m = musteri.order.includes("ayran") && !d.tray.includes("ayran") ? "Pişerken ayranı tepsiye koy." : "Kebap pişiyor, halka dolunca hazır.";
    else if (musteri.order.includes("simit")) m = "Aşağıdan Simit'e dokunup şişi ızgaraya koy.";
    else if (musteri.order.includes("ayran")) m = "Ayrana dokunup tepsiye koy.";
    if (this.ipucu.text !== m) this.ipucu.setText(m);
  }

  // ---------- Gün sonu ----------

  private gunKapandi() {
    if (this.kapandi) return;
    this.kapandi = true;
    const bitti = this.run.over;
    if (bitti) sfx.kizgin();
    else sfx.kapanis();
    const metin = bitti ? "Kalpler bitti!" : "Dükkân kapandı!";
    const t = this.add.text(W / 2, H / 2 - 120, metin, { fontFamily: FONT, fontSize: "76px", color: "#ffe3a3", fontStyle: "800" })
      .setOrigin(0.5).setStroke("#3b2416", 12).setDepth(700).setScale(0.3);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45).setDepth(690);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: "Back.out" });
    this.time.delayedCall(1700, () => {
      const ozet = endDay(this.d);
      oyun.gunBitti(this.run, { actions: this.actions, buys: [] });
      if (this.run.over || this.run.finished) this.scene.start("Result");
      else this.scene.start("DayEnd", { ozet });
    });
  }
}
