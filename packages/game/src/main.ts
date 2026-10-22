// Yalnızca Latin ve Türkçe karakterler (ğ, ş, ı) gereken alt kümeler
import "@fontsource/baloo-2/latin-500.css";
import "@fontsource/baloo-2/latin-ext-500.css";
import "@fontsource/baloo-2/latin-700.css";
import "@fontsource/baloo-2/latin-ext-700.css";
import "@fontsource/baloo-2/latin-800.css";
import "@fontsource/baloo-2/latin-ext-800.css";
import Phaser from "phaser";
import { H, W } from "./config";
import { Boot } from "./scenes/Boot";
import { DayEnd } from "./scenes/DayEnd";
import { Kitchen } from "./scenes/Kitchen";
import { Leaderboard } from "./scenes/Leaderboard";
import { Menu } from "./scenes/Menu";
import { Result } from "./scenes/Result";

async function baslat() {
  // Yazı tipi yüklenmeden çizilen metinler yedek fontla kalır; önce yüklenmesini bekle
  try {
    await Promise.race([
      Promise.all(["500", "700", "800"].map((w) => document.fonts.load(`${w} 32px "Baloo 2"`, "Ocakbaşı ğüşıöç"))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    // yazı tipi yüklenemezse sistem fontuyla devam
  }
  document.getElementById("yukleniyor")?.remove();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "oyun",
    backgroundColor: "#2a170c",
    width: W,
    height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 2 },
    scene: [Boot, Menu, Kitchen, DayEnd, Result, Leaderboard],
  });
  // Geliştirirken tarayıcı konsolundan sahnelere erişmek için (yayın sürümüne girmez)
  if (import.meta.env.DEV) Object.assign(window, { game });
}

void baslat();
