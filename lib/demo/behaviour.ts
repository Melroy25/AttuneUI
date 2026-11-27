// /demo per-user behaviour: muscle memory and reading counts. Numbers only, never typed text.
import { READING } from "./articleReading";
import { ARTICLES } from "./articles";

export const FEATURES = ["products", "orders", "returns", "reports", "help", "articles", "cart", "search"] as const;
export type Feature = (typeof FEATURES)[number];
export type Level = 1 | 2; // 2: clear cue, 1: faint cue
export type Cues = Partial<Record<Feature, Level>>;
export interface Use { uses: number; ok: number; back: number }
export type Phase = "plain" | "guided" | "faded";
export interface NavTally { count: number; back: number; ms: number }
export interface Reading {
  activeMs: number; scrollPx: number; reversals: number; revisits: number; bestProgress: number;
  pins: number; unpins: number; finished: number; helpers: number; helpedBefore: number; helpedAfter: number;
}
export interface Pin { article: string; paragraph: string; progress: number; at: number }
export interface Behaviour {
  features: Record<Feature, Use>;
  searches: number; repeatedSearches: number;
  nav: Record<Phase, NavTally>;
  cues: Cues; faded: number;
  reading: Reading;
  pinned: Pin | null;
}

export const MUSCLE = { masterAt: 6, frequentAt: 2, shown: 3, bounceMs: 3000 };
const DEFAULTS: Feature[] = ["products", "orders"]; // what a new shopper usually needs
const use = (): Use => ({ uses: 0, ok: 0, back: 0 });
const tally = (): NavTally => ({ count: 0, back: 0, ms: 0 });
const NO_READING: Reading = {
  activeMs: 0, scrollPx: 0, reversals: 0, revisits: 0, bestProgress: 0,
  pins: 0, unpins: 0, finished: 0, helpers: 0, helpedBefore: 0, helpedAfter: 0,
};
export const NO_BEHAVIOUR: Behaviour = {
  features: Object.fromEntries(FEATURES.map((f) => [f, use()])) as Record<Feature, Use>,
  searches: 0, repeatedSearches: 0, nav: { plain: tally(), guided: tally(), faded: tally() },
  cues: {}, faded: 0, reading: NO_READING, pinned: null,
};
export const behaviourKey = (user: string | null) => `attune-behaviour:${user ?? "guest"}`;

export const mastery = (u: Use) => Math.min(Math.max((u.ok - u.back) / MUSCLE.masterAt, 0), 1);

/** The features this user needs most; the usual ones until there is evidence. */
export function needed(b: Behaviour): Feature[] {
  const often = FEATURES.filter((f) => b.features[f].uses >= MUSCLE.frequentAt)
    .sort((x, y) => b.features[y].uses - b.features[x].uses);
  return [...new Set([...often, ...DEFAULTS])].slice(0, MUSCLE.shown);
}

/** Cues weaken as a feature is reached successfully, and return if the user starts bouncing. */
export function cuesFor(b: Behaviour): Cues {
  return Object.fromEntries(needed(b).flatMap((f) => {
    const m = mastery(b.features[f]);
    return m >= 1 ? [] : [[f, m < 0.5 ? 2 : 1]];
  }));
}

/** 0 for a newcomer, 1 once everything they need often is second nature. */
export const familiarity = (b: Behaviour) =>
  needed(b).reduce((sum, f) => sum + mastery(b.features[f]), 0) / needed(b).length;

export function cueChanges(before: Cues, after: Cues) {
  return FEATURES.flatMap((f) => {
    const was = before[f] ?? 0;
    const is = after[f] ?? 0;
    return was === is ? [] : [{ feature: f, faded: is < was, level: is }];
  });
}

export const phaseOf = (b: Behaviour, f: Feature): Phase =>
  b.cues[f] ? "guided" : mastery(b.features[f]) >= 1 ? "faded" : "plain";

export interface Step { page: string; at: number; from: string | null; phase: Phase }
const asFeature = (page: string) => FEATURES.find((f) => f === page);

/** Leaving a screen judges the visit to it; arriving at the next one counts a use. */
export function navigate(b: Behaviour, last: Step, to: string, now: number): { behaviour: Behaviour; step: Step } {
  const features = { ...b.features };
  const nav = { ...b.nav };
  const dwell = now - last.at;
  const left = last.from === null ? undefined : asFeature(last.page);
  if (left) {
    const bounced = to === last.from && dwell < MUSCLE.bounceMs;
    features[left] = { ...features[left], [bounced ? "back" : "ok"]: features[left][bounced ? "back" : "ok"] + 1 };
    if (bounced) nav[last.phase] = { ...nav[last.phase], back: nav[last.phase].back + 1 };
  }
  const target = asFeature(to);
  const phase = target ? phaseOf(b, target) : "plain";
  if (target) {
    features[target] = { ...features[target], uses: features[target].uses + 1 };
    nav[phase] = { ...nav[phase], count: nav[phase].count + 1, ms: nav[phase].ms + Math.min(dwell, 60_000) };
  }
  return { behaviour: { ...b, features, nav }, step: { page: to, at: now, from: last.page, phase } };
}

export function searched(b: Behaviour, repeat: boolean): Behaviour {
  const s = b.features.search;
  return {
    ...b,
    searches: b.searches + 1,
    repeatedSearches: b.repeatedSearches + (repeat ? 1 : 0),
    features: { ...b.features, search: { ...s, uses: s.uses + 1, ok: s.ok + 1 } },
  };
}

export const pinExpired = (pin: Pin, now: number, reading: boolean) =>
  now - pin.at > (reading ? READING.idleUnpinMs : READING.awayUnpinMs);

const count = (v: unknown, most = 1e12) =>
  (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, most) : 0);
type Loose = Record<string, unknown>;
const loose = (v: unknown) => (typeof v === "object" && v !== null ? v : {}) as Loose;
/** The numbers named by `like`, taken from `v`. */
const numbers = <T extends object>(like: T, v: unknown): T =>
  Object.fromEntries(Object.keys(like).map((k) => [k, count(loose(v)[k])])) as T;

function parsePin(v: unknown): Pin | null {
  const p = loose(v);
  const article = ARTICLES.find((a) => a.id === p.article);
  const paragraph = article?.content.find((x) => x.id === p.paragraph);
  return article && paragraph
    ? { article: article.id, paragraph: paragraph.id, progress: count(p.progress, 1), at: count(p.at, 1e14) }
    : null;
}

/** Storage, uploads and documents are untrusted. */
export function parseBehaviour(v: unknown): Behaviour {
  const b = loose(v);
  const cues = loose(b.cues);
  return {
    features: Object.fromEntries(FEATURES.map((f) => [f, numbers(use(), loose(b.features)[f])])) as Record<Feature, Use>,
    searches: count(b.searches), repeatedSearches: count(b.repeatedSearches),
    nav: {
      plain: numbers(tally(), loose(b.nav).plain), guided: numbers(tally(), loose(b.nav).guided),
      faded: numbers(tally(), loose(b.nav).faded),
    },
    cues: Object.fromEntries(FEATURES.flatMap((f) => (cues[f] === 1 || cues[f] === 2 ? [[f, cues[f]]] : []))),
    faded: count(b.faded),
    reading: numbers(NO_READING, b.reading),
    pinned: parsePin(b.pinned),
  };
}

const larger = <T extends object>(a: T, b: T): T => Object.fromEntries(
  Object.keys(b).map((k) => [k, Math.max((a as Record<string, number>)[k], (b as Record<string, number>)[k])])) as T;

/** Counts never fall; what is on screen (cues, pin) comes from the newer copy. */
export function keepBehaviour(older: Behaviour, newer: Behaviour): Behaviour {
  return {
    features: Object.fromEntries(FEATURES.map((f) => [f, larger(older.features[f], newer.features[f])])) as Record<Feature, Use>,
    searches: Math.max(older.searches, newer.searches),
    repeatedSearches: Math.max(older.repeatedSearches, newer.repeatedSearches),
    nav: {
      plain: larger(older.nav.plain, newer.nav.plain), guided: larger(older.nav.guided, newer.nav.guided),
      faded: larger(older.nav.faded, newer.nav.faded),
    },
    cues: newer.cues,
    faded: Math.max(older.faded, newer.faded),
    reading: larger(older.reading, newer.reading),
    pinned: newer.pinned,
  };
}

const added = <T extends object>(a: T, b: T): T => Object.fromEntries(Object.entries(a).map(([k, v]) => {
  const other = (b as Record<string, unknown>)[k];
  return [k, typeof v === "number" ? v + (other as number) : added(v as object, other as object)];
})) as T;

/** Everyone added together, for the admin. Cues and pins belong to one person, so none here. */
export const total = (all: Behaviour[]): Behaviour => all.reduce((sum, b) => ({
  ...sum,
  searches: sum.searches + b.searches,
  repeatedSearches: sum.repeatedSearches + b.repeatedSearches,
  faded: sum.faded + b.faded,
  features: added(sum.features, b.features),
  nav: added(sum.nav, b.nav),
  reading: added(sum.reading, b.reading),
}), NO_BEHAVIOUR);
