/**
 * Kalıcı kayıt: oyuncu profili, yarım kalan oyun (gün aralarında kaydedilir), ayarlar ve en iyi skorlar.
 * Capacitor uygulamasında da WebView'ın localStorage'ı kalıcıdır.
 */
import type { RunLog, RunState } from "@ocakbasi/core";

export interface Profile {
  name: string;
  shop: string;
  /** Sunucuya kayıt olunca gelen oyuncu kimliği ve gizli anahtarı. */
  playerId?: string;
  token?: string;
}

export interface SavedRun {
  run: RunState;
  log: RunLog;
  /** Sunucudan alınan oyun kimliği (çevrim içiyse). */
  runId?: string;
}

export interface LocalScore {
  score: number;
  day: number;
  finished: boolean;
  at: string;
}

interface SaveData {
  v: 1;
  profile?: Profile;
  current?: SavedRun;
  sound: boolean;
  scores: LocalScore[];
}

const KEY = "ocakbasi:v1";
let cache: SaveData | null = null;

function load(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.v === 1) return (cache = { sound: true, scores: [], ...data });
    }
  } catch {
    // bozuk ya da erişilemeyen kayıt: sıfırdan başla
  }
  return (cache = { v: 1, sound: true, scores: [] });
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // gizli sekme vb.; oyun kayıtsız devam eder
  }
}

export const save = {
  get profile() {
    return load().profile;
  },
  setProfile(p: Profile) {
    load().profile = p;
    persist();
  },
  get current() {
    return load().current;
  },
  setCurrent(c: SavedRun | undefined) {
    load().current = c;
    persist();
  },
  get sound() {
    return load().sound;
  },
  setSound(on: boolean) {
    load().sound = on;
    persist();
  },
  get scores() {
    return load().scores;
  },
  get best() {
    return load().scores.reduce((m, s) => Math.max(m, s.score), 0);
  },
  addScore(s: LocalScore) {
    const d = load();
    d.scores = [...d.scores, s].sort((a, b) => b.score - a.score).slice(0, 10);
    persist();
  },
};
