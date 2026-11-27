// Small statistics primitives used by stats.ts.
export const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
const sumSquares = (v: number[]) => {
  const m = mean(v);
  return v.reduce((s, x) => s + (x - m) ** 2, 0);
};

/** Linear interpolation on sorted values (numpy's default). */
export function quantile(sorted: number[], q: number): number {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]);
}

export function hedgesG(a: number[], b: number[]): number | null {
  const df = a.length + b.length - 2;
  const sd = Math.sqrt((sumSquares(a) + sumSquares(b)) / df);
  return sd > 0 ? ((mean(a) - mean(b)) / sd) * (1 - 3 / (4 * df - 1)) : null;
}

/** Holm step-down adjusted p-values; null entries (untestable) are left out of the family. */
export function holm(p: (number | null)[]): (number | null)[] {
  const order = p.flatMap((v, i) => (v === null ? [] : [i])).sort((i, j) => p[i]! - p[j]!);
  const out: (number | null)[] = p.map(() => null);
  let running = 0;
  order.forEach((i, rank) => {
    running = Math.max(running, Math.min((order.length - rank) * p[i]!, 1));
    out[i] = running;
  });
  return out;
}

/** Complementary error function, x >= 0: series below 2, continued fraction above. */
export function erfc(x: number): number {
  if (x < 0) return 2 - erfc(-x);
  const gauss = Math.exp(-x * x) / Math.sqrt(Math.PI);
  if (x < 2) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 60; n++) {
      term *= (2 * x * x) / (2 * n + 1);
      sum += term;
    }
    return 1 - 2 * gauss * sum;
  }
  let tail = x;
  for (let n = 80; n > 0; n--) tail = x + n / 2 / tail;
  return gauss / tail;
}

/** Two-sided, normal approximation with tie and continuity corrections. u is for `a`. */
export function mannWhitney(a: number[], b: number[]) {
  const all = [...a, ...b].sort((x, y) => x - y);
  const rank = new Map<number, number>();
  let ties = 0;
  for (let i = 0, j = 0; i < all.length; i = j) {
    while (j < all.length && all[j] === all[i]) j++;
    rank.set(all[i], (i + 1 + j) / 2);
    ties += (j - i) ** 3 - (j - i);
  }
  const [n1, n2, n] = [a.length, b.length, all.length];
  const u = a.reduce((s, v) => s + rank.get(v)!, 0) - (n1 * (n1 + 1)) / 2;
  const sd = Math.sqrt(((n1 * n2) / 12) * (n + 1 - ties / (n * (n - 1))));
  const z = (Math.max(u, n1 * n2 - u) - (n1 * n2) / 2 - 0.5) / sd;
  return { u, p: sd > 0 ? Math.min(erfc(z / Math.SQRT2), 1) : null };
}
