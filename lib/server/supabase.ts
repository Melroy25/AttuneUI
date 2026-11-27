// Server only. Never import from client components: it reads the service key.
export type Rest = (path: string, init?: RequestInit) => Promise<Response>;

/** New `sb_...` keys are opaque and PostgREST rejects them as a Bearer token; legacy JWTs need it. */
export const authHeaders = (key: string): Record<string, string> =>
  key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };

/** Returns null when the server is not configured. */
export function supabaseRest(
  env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch,
): Rest | null {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return (path, init = {}) =>
    fetcher(`${url}/rest/v1/${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { ...authHeaders(key), "Content-Type": "application/json", ...init.headers },
    });
}

export async function rows<T>(rest: Rest, path: string): Promise<T[]> {
  const response = await rest(path);
  if (!response.ok) throw new Error(`database read failed (${response.status})`);
  return (await response.json()) as T[];
}
