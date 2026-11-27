// Server only: the few document operations the app needs, on Firestore's REST API or in memory.
import { accessToken, serviceAccount, type ServiceAccount } from "./firebase";

export type Value = string | number | boolean | null;
export type Doc = Record<string, Value>;
export interface Found { id: string; data: Doc }

export interface Db {
  get(collection: string, id: string): Promise<Doc | null>;
  /** All or nothing. False if any of these documents already exists. */
  create(docs: { collection: string; id: string; data: Doc }[]): Promise<boolean>;
  set(collection: string, id: string, data: Doc): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  /** Every document, in id order, a page at a time. */
  page(collection: string, token?: string): Promise<{ docs: Found[]; next?: string }>;
  /** One condition on one field, ordered by it: needs no composite index. */
  where(collection: string, field: string, op: "==" | ">" | "<", value: Value, limit: number): Promise<Found[]>;
}

type Encoded = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null };
const encode = (v: Value): Encoded =>
  v === null ? { nullValue: null }
  : typeof v === "string" ? { stringValue: v }
  : typeof v === "boolean" ? { booleanValue: v }
  : Number.isInteger(v) ? { integerValue: String(v) }
  : { doubleValue: v };
const decode = (e: Encoded): Value =>
  e.stringValue ?? (e.integerValue !== undefined ? Number(e.integerValue) : e.doubleValue ?? e.booleanValue ?? null);
const toFields = (data: Doc) => ({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) });
const fromDoc = (d: { name: string; fields?: Record<string, Encoded> }): Found => ({
  id: d.name.slice(d.name.lastIndexOf("/") + 1),
  data: Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, decode(v)])),
});
const OPS = { "==": "EQUAL", ">": "GREATER_THAN", "<": "LESS_THAN" } as const;

export function firestore(key: ServiceAccount, fetcher: typeof fetch = fetch): Db {
  const root = `projects/${key.project_id}/databases/(default)/documents`;
  const call = async (path: string, init: RequestInit = {}, allow: number[] = []) => {
    const response = await fetcher(`https://firestore.googleapis.com/v1/${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${await accessToken(key, fetcher)}`, "Content-Type": "application/json" },
    });
    if (!response.ok && !allow.includes(response.status)) throw new Error(`database request failed (${response.status})`);
    return response;
  };
  const path = (collection: string, id: string) => `${root}/${collection}/${encodeURIComponent(id)}`;

  return {
    async get(collection, id) {
      const response = await call(path(collection, id), {}, [404]);
      return response.ok ? fromDoc(await response.json()).data : null;
    },
    async create(docs) {
      const writes = docs.map((d) => ({
        update: { name: `${root}/${d.collection}/${d.id}`, ...toFields(d.data) }, currentDocument: { exists: false },
      }));
      const response = await call(`${root}:commit`, { method: "POST", body: JSON.stringify({ writes }) }, [409]);
      return response.ok;
    },
    async set(collection, id, data) {
      await call(path(collection, id), { method: "PATCH", body: JSON.stringify(toFields(data)) });
    },
    async remove(collection, id) {
      await call(path(collection, id), { method: "DELETE" }, [404]);
    },
    async page(collection, token) {
      const response = await call(`${root}/${collection}?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`);
      const body = (await response.json()) as { documents?: Parameters<typeof fromDoc>[0][]; nextPageToken?: string };
      return { docs: (body.documents ?? []).map(fromDoc), next: body.nextPageToken };
    },
    async where(collection, field, op, value, limit) {
      const cut = collection.lastIndexOf("/"); // a subcollection is queried under its parent
      const parent = cut < 0 ? root : `${root}/${collection.slice(0, cut)}`;
      const structuredQuery = {
        from: [{ collectionId: collection.slice(cut + 1) }],
        where: { fieldFilter: { field: { fieldPath: field }, op: OPS[op], value: encode(value) } },
        orderBy: [{ field: { fieldPath: field }, direction: op === ">" ? "DESCENDING" : "ASCENDING" }],
        limit,
      };
      const response = await call(`${parent}:runQuery`, { method: "POST", body: JSON.stringify({ structuredQuery }) });
      const results = (await response.json()) as { document?: Parameters<typeof fromDoc>[0] }[];
      return results.flatMap((r) => (r.document ? [fromDoc(r.document)] : []));
    },
  };
}

/** Same behaviour in this process only: used by tests and when no database is configured. */
export function memoryDb(): Db {
  const store = new Map<string, Map<string, Doc>>();
  const of = (name: string) => store.get(name) ?? store.set(name, new Map()).get(name)!;
  const sorted = (name: string) =>
    [...of(name)].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([id, data]) => ({ id, data: { ...data } }));
  return {
    get: async (c, id) => (of(c).has(id) ? { ...of(c).get(id)! } : null),
    async create(docs) {
      if (docs.some((d) => of(d.collection).has(d.id))) return false;
      for (const d of docs) of(d.collection).set(d.id, { ...d.data });
      return true;
    },
    set: async (c, id, data) => void of(c).set(id, { ...data }),
    remove: async (c, id) => void of(c).delete(id),
    async page(c, token) {
      const from = Number(token ?? 0);
      const all = sorted(c);
      return { docs: all.slice(from, from + 200), next: from + 200 < all.length ? String(from + 200) : undefined };
    },
    async where(c, field, op, value, limit) {
      const test = (v: Value) => (op === "==" ? v === value : op === ">" ? v! > value! : v! < value!);
      const found = sorted(c).filter((d) => field in d.data && test(d.data[field]));
      found.sort((a, b) => (a.data[field]! < b.data[field]! ? -1 : 1) * (op === ">" ? -1 : 1));
      return found.slice(0, limit);
    },
  };
}

/** The configured database, or null when FIREBASE_SERVICE_ACCOUNT is not set. */
export function database(): Db | null {
  const key = serviceAccount();
  return key ? firestore(key) : null;
}
