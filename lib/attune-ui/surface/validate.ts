import { ARM_IDS } from "../types";
import { QUICK_ACTIONS, SURFACES, type SurfaceConfig } from "./catalog";

const oneOf = (options: readonly unknown[]) => (v: unknown) => options.includes(v);
const bool = (v: unknown) => typeof v === "boolean";

const RULES: Record<keyof SurfaceConfig, (v: unknown) => boolean> = {
  arm: oneOf(ARM_IDS),
  targetSize: oneOf(["compact", "large"]),
  thumbZoneCta: bool,
  secondaryFilters: oneOf(["expanded", "collapsed"]),
  smartPresets: bool,
  quickActions: (v) =>
    Array.isArray(v) && v.every(oneOf(QUICK_ACTIONS)) && new Set(v).size === v.length,
  actionableBadge: bool,
  stepHints: bool,
};

/** Strict: unknown or missing keys reject the whole blueprint. */
export function validateSurface(input: unknown): SurfaceConfig | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const keys = Object.keys(RULES) as (keyof SurfaceConfig)[];
  if (Object.keys(record).length !== keys.length) return null;
  const ok = keys.every((k) => Object.hasOwn(record, k) && RULES[k](record[k]));
  return ok ? (record as unknown as SurfaceConfig) : null;
}

/** Falls back to the static surface so a bad blueprint never breaks the page. */
export const safeSurface = (input: unknown): SurfaceConfig =>
  validateSurface(input) ?? SURFACES.baseline;
