// Server only: demo_users/{userId} and its activity subcollection.
import { hashString } from "../attune-ui/rng";
import { SHORTCUTS } from "../bandit/shortcutBandit";
import { parseActivity, type Activity } from "../demo/activity";
import { keepBehaviour } from "../demo/behaviour";
import { maxTotals, parseState, type CloudRecord, type CloudState } from "../demo/cloud";
import { keepCounts } from "../demo/comfort";
import { keepAnswers } from "../demo/hesitation";
import { memoryDb, type Db, type Doc } from "./db";
import type { Storage } from "./live";

const COLLECTION = "demo_users";
const MAX_PAGES = 5;
const activityOf = (id: string) => `${COLLECTION}/${id}/activity`;

// shortcut: memory only works on one long-running server; on Vercel set FIREBASE_SERVICE_ACCOUNT.
const memory = memoryDb();
const pick = (db: Db | null) => ({ db: db ?? memory, storage: (db ? "database" : "memory") as Storage });

const toDoc = (s: CloudState, updatedAt: string): Doc => ({
  activeLayout: s.arm,
  preferences: JSON.stringify(s.preferences),
  promotedShortcuts: SHORTCUTS.filter((k) => s.shortcuts.promoted[k]).join(","),
  banditWeights: JSON.stringify({ layout: s.memory, shortcuts: s.shortcuts }),
  habits: JSON.stringify(s.habits),
  frictionTotals: JSON.stringify(s.friction),
  comfort: JSON.stringify(s.comfort),
  language: s.language ?? s.preferences.locale,
  languageChosen: s.language !== null,
  deliveryCity: s.city,
  hesitation: JSON.stringify(s.hesitation),
  behaviour: JSON.stringify(s.behaviour),
  textScales: JSON.stringify(s.textScales),
  updatedAt,
});

function fromDoc(id: string, doc: Doc): CloudRecord | null {
  try {
    const json = (field: string) => JSON.parse(String(doc[field]));
    const weights = json("banditWeights");
    const state = parseState({
      arm: doc.activeLayout, preferences: json("preferences"), shortcuts: weights.shortcuts,
      memory: weights.layout, habits: json("habits"), friction: json("frictionTotals"),
      comfort: doc.comfort ? json("comfort") : null, // absent from older documents
      language: doc.languageChosen ? doc.language : null,
      city: doc.deliveryCity,
      hesitation: doc.hesitation ? json("hesitation") : null,
      behaviour: doc.behaviour ? json("behaviour") : null,
      textScales: doc.textScales,
    });
    return state && { id, updatedAt: String(doc.updatedAt), state };
  } catch {
    return null;
  }
}

/** Merges: friction totals never fall, saved weights are not blanked, activity is only added. */
export async function saveUser(configured: Db | null, id: string, state: CloudState, activity: Activity[], now = Date.now()) {
  const { db, storage } = pick(configured);
  const found = await db.get(COLLECTION, id);
  const before = found && fromDoc(id, found)?.state;
  // The same entry always gets the same id, so a repeated upload adds nothing.
  await Promise.all(activity.map((a) => db.set(activityOf(id), `${a.at}-${hashString(a.trigger + a.change)}`, {
    timestamp: a.at, loggedBehavior: a.trigger, uiChange: a.change, confidence: a.confidence ?? null,
  })));
  const updatedAt = new Date(now).toISOString();
  await db.set(COLLECTION, id, toDoc({
    ...state,
    memory: state.memory ?? before?.memory ?? null,
    language: state.language ?? before?.language ?? null,
    comfort: before ? keepCounts(before.comfort, state.comfort) : state.comfort,
    city: state.city ?? before?.city ?? null,
    hesitation: before ? keepAnswers(before.hesitation, state.hesitation) : state.hesitation,
    behaviour: before ? keepBehaviour(before.behaviour, state.behaviour) : state.behaviour,
    friction: before ? maxTotals(before.friction, state.friction) : state.friction,
  }, updatedAt));
  return { updatedAt, storage };
}

export async function listUsers(configured: Db | null) {
  const { db, storage } = pick(configured);
  const users: CloudRecord[] = [];
  let token: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await db.page(COLLECTION, token);
    users.push(...page.docs.flatMap((d) => fromDoc(d.id, d.data) ?? []));
    token = page.next;
    if (!token) break;
  }
  return { storage, users };
}

/** One user, with their newest `limit` activity entries. */
export async function getUser(configured: Db | null, id: string, limit: number) {
  const { db, storage } = pick(configured);
  const doc = await db.get(COLLECTION, id);
  const rows = limit > 0 ? await db.where(activityOf(id), "timestamp", ">", 0, limit) : [];
  const activity = rows.flatMap(({ data }) => parseActivity([{
    at: data.timestamp, trigger: data.loggedBehavior, change: data.uiChange, confidence: data.confidence,
  }], 1) ?? []);
  return { storage, user: doc && fromDoc(id, doc), activity };
}
