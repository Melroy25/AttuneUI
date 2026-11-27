export type Vec = number[];
export type Mat = number[][];

export const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const matVec = (m: Mat, v: Vec) => m.map((row) => dot(row, v));
export const scaledIdentity = (n: number, s: number): Mat =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? s : 0)));

/** Returns (gamma*A + x x')^-1 given symmetric A^-1 (Sherman-Morrison). */
export function updateInverse(aInv: Mat, x: Vec, gamma = 1): Mat {
  const scaled = aInv.map((row) => row.map((v) => v / gamma));
  const u = matVec(scaled, x);
  const denom = 1 + dot(x, u);
  return scaled.map((row, i) => row.map((v, j) => v - (u[i] * u[j]) / denom));
}
