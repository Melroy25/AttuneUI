// Server only: Firebase project settings, service-account access tokens and sign-in checks.
import { createSign } from "node:crypto";

type Env = Record<string, string | undefined>;

/** The web config is public: every browser receives it. */
export interface WebConfig { apiKey: string; authDomain: string; projectId: string; appId: string }

export function webConfig(env: Env = process.env): WebConfig | null {
  const config = {
    apiKey: env.FIREBASE_API_KEY ?? "", authDomain: env.FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.FIREBASE_PROJECT_ID ?? "", appId: env.FIREBASE_APP_ID ?? "",
  };
  return Object.values(config).every(Boolean) ? config : null;
}

export interface ServiceAccount { project_id: string; client_email: string; private_key: string }

/** The downloaded key file, pasted into FIREBASE_SERVICE_ACCOUNT. Secret: server only. */
export function serviceAccount(env: Env = process.env): ServiceAccount | null {
  try {
    const key = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT ?? "") as Partial<ServiceAccount>;
    return key.project_id && key.client_email && key.private_key ? (key as ServiceAccount) : null;
  } catch {
    return null;
  }
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const cache = new Map<string, { token: string; expires: number }>();

/** OAuth token for Firestore, from a signed service-account assertion. Cached until near expiry. */
export async function accessToken(key: ServiceAccount, fetcher: typeof fetch = fetch, now = Date.now()) {
  const hit = cache.get(key.client_email);
  if (hit && hit.expires > now + 60_000) return hit.token;
  const issued = Math.floor(now / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: key.client_email, scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token", iat: issued, exp: issued + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}`,
    }).toString(),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`service account rejected (${response.status})`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cache.set(key.client_email, { token: body.access_token, expires: now + body.expires_in * 1000 });
  return body.access_token;
}

export interface Account { uid: string; email: string; name: string }

/** Asks Firebase who owns an ID token. Null if the token is not valid for this project. */
export async function verifyIdToken(idToken: string, config: WebConfig, fetcher: typeof fetch = fetch): Promise<Account | null> {
  const response = await fetcher(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }), signal: AbortSignal.timeout(8000),
    },
  );
  if (response.status === 400) return null;
  if (!response.ok) throw new Error(`sign-in check failed (${response.status})`);
  const [user] = ((await response.json()) as { users?: { localId?: string; email?: string; displayName?: string; disabled?: boolean }[] }).users ?? [];
  if (!user?.localId || user.disabled) return null;
  return { uid: user.localId, email: user.email ?? "", name: user.displayName ?? "" };
}
