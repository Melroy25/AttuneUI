export interface Rng {
  next(): number; // [0, 1)
  normal(): number; // standard normal
}

/** mulberry32: small, seeded, and easy to port to Python for verification. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const normal = () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    const r = Math.sqrt(-2 * Math.log(1 - next()));
    const theta = 2 * Math.PI * next();
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
  return { next, normal };
}

/** FNV-1a, for deriving seeds from ids and hashing policy snapshots. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
