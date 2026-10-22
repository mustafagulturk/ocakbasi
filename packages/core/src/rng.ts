/** Tohumlu rastgele sayı üreteci (mulberry32). Her platformda aynı diziyi üretir. */
export interface Rng {
  next(): number;
  int(n: number): number;
  pick<T>(list: T[]): T;
  weighted<T>(list: T[], weights: number[]): T;
}

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted(list, weights) {
      const total = weights.reduce((t, w) => t + w, 0);
      let x = next() * total;
      for (let i = 0; i < list.length; i++) {
        x -= weights[i];
        if (x < 0) return list[i];
      }
      return list[list.length - 1];
    },
  };
}
