/** Dosya gerektirmeyen küçük ses efektleri (Web Audio ile üretilir). */
import { save } from "./save";

let ctx: AudioContext | null = null;
function ac() {
  if (!save.sound) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function ton(freq: number, sure: number, tip: OscillatorType = "sine", ses = 0.18, gecikme = 0, kayma = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + gecikme;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tip;
  o.frequency.setValueAtTime(freq, t);
  if (kayma) o.frequency.exponentialRampToValueAtTime(freq * kayma, t + sure);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(ses, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + sure + 0.02);
}

function cizirti(sure = 0.25, ses = 0.08) {
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * sure), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1800;
  const g = c.createGain();
  g.gain.value = ses;
  s.buffer = buf;
  s.connect(f).connect(g).connect(c.destination);
  s.start();
}

export const sfx = {
  tik: () => ton(660, 0.06, "triangle", 0.12),
  cizz: () => cizirti(0.3, 0.07),
  hazir: () => { ton(880, 0.08, "triangle", 0.12); ton(1320, 0.1, "triangle", 0.1, 0.07); },
  kasa: () => { ton(1046, 0.08, "square", 0.07); ton(1568, 0.16, "square", 0.07, 0.06); },
  yandi: () => ton(220, 0.4, "sawtooth", 0.08, 0, 0.5),
  kizgin: () => { ton(300, 0.18, "square", 0.09, 0, 0.7); ton(200, 0.25, "square", 0.08, 0.12, 0.7); },
  hata: () => ton(180, 0.12, "square", 0.06),
  kalp: () => { [523, 659, 784].forEach((f, i) => ton(f, 0.12, "triangle", 0.1, i * 0.07)); },
  zil: () => { ton(1318, 0.5, "sine", 0.12); ton(1760, 0.6, "sine", 0.06, 0.02); },
  kapanis: () => { [784, 659, 523, 392].forEach((f, i) => ton(f, 0.18, "triangle", 0.1, i * 0.12)); },
};

/** Telefonda kısa titreşim (destekleniyorsa). */
export function titret(ms = 15) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // desteklenmiyor
  }
}
