export const fail = (status: number, error: string) => Response.json({ error }, { status });

/** Size-limited JSON body; a Response means "reject with this". */
export async function readJson(request: Request, maxBytes: number): Promise<{ body: unknown } | Response> {
  if (Number(request.headers.get("content-length")) > maxBytes) return fail(413, "body too large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return fail(413, "body too large");
  try {
    return { body: JSON.parse(text) };
  } catch {
    return fail(400, "invalid JSON");
  }
}
