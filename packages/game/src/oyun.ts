/** Devam eden oyunun hafızadaki hali; gün aralarında kalıcı kayda yazılır. */
import { type DayLog, type RunState, createRun } from "@ocakbasi/core";
import { startRun } from "./api";
import { type SavedRun, save } from "./save";

let aktif: SavedRun | null = null;

export const oyun = {
  get aktif() {
    return aktif ?? save.current ?? null;
  },
  /** Yeni oyun: çevrim içiyse tohum sunucudan gelir (skor doğrulaması için), değilse rastgele. */
  async yeni(): Promise<SavedRun> {
    const sunucu = await startRun();
    const seed = sunucu?.seed ?? Math.floor(Math.random() * 2 ** 31);
    aktif = { run: createRun(seed), log: { v: 1, seed, days: [] }, runId: sunucu?.runId };
    save.setCurrent(aktif);
    return aktif;
  },
  devam(): SavedRun | null {
    aktif = save.current ?? null;
    return aktif;
  },
  /** Gün bitince o günün hamleleri kayda eklenir. */
  gunBitti(run: RunState, gun: DayLog) {
    if (!aktif) return;
    aktif.run = run;
    aktif.log.days.push(gun);
    save.setCurrent(run.over || run.finished ? undefined : aktif);
  },
  /** Gün sonu dükkândan alınan geliştirme, o günün kaydına yazılır. */
  alimYap(id: DayLog["buys"][number]) {
    if (!aktif) return;
    aktif.log.days[aktif.log.days.length - 1]?.buys.push(id);
    save.setCurrent(aktif.run.over || aktif.run.finished ? undefined : aktif);
  },
  bitir() {
    const a = aktif;
    aktif = null;
    save.setCurrent(undefined);
    return a;
  },
};
