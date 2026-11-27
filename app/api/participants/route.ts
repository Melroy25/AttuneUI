import { fail, readJson } from "@/lib/server/http";
import { register } from "@/lib/server/register";
import { supabaseRest } from "@/lib/server/supabase";
import { MAX_REGISTRATION_BYTES, parseRegistration } from "@/lib/study/validate";

export async function POST(request: Request) {
  const read = await readJson(request, MAX_REGISTRATION_BYTES);
  if (read instanceof Response) return read;
  const parsed = parseRegistration(read.body);
  if (!parsed) return fail(400, "invalid request");
  const rest = supabaseRest();
  if (!rest) return fail(503, "storage not configured");
  try {
    return Response.json(await register(rest, parsed));
  } catch (error) {
    console.error("participants:", error);
    return fail(502, "storage unavailable");
  }
}
