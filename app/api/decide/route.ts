import { MAX_BODY_BYTES, decideResponse, parseDecideRequest } from "@/lib/delivery/contract";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail(413, "body too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, "invalid JSON");
  }
  const parsed = parseDecideRequest(body);
  if (!parsed) return fail(400, "invalid request");
  return Response.json(decideResponse(parsed, () => performance.now()));
}
