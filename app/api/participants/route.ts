import { database } from "@/lib/server/db";
import { loadFrozenPolicy } from "@/lib/server/frozen";
import { fail, readJson, sameSecret } from "@/lib/server/http";
import { register } from "@/lib/server/register";
import { parsePhase } from "@/lib/study/assignment";
import { MAX_REGISTRATION_BYTES, parseRegistration } from "@/lib/study/validate";

export async function POST(request: Request) {
  const read = await readJson(request, MAX_REGISTRATION_BYTES);
  if (read instanceof Response) return read;
  const parsed = parseRegistration(read.body);
  if (!parsed) return fail(400, "invalid request");
  const studyCode = process.env.STUDY_CODE;
  // The gate may be left open in development only.
  if (!studyCode && process.env.NODE_ENV === "production") return fail(503, "study code not configured");
  if (studyCode && !sameSecret(parsed.code, studyCode)) return fail(403, "study code not accepted");
  const phase = parsePhase(process.env.STUDY_PHASE);
  if (!phase) return fail(503, "study phase not configured");
  if (parsed.phase !== phase) return fail(409, "study phase has changed");
  if (phase === "confirmatory") {
    const { error } = loadFrozenPolicy();
    if (error) {
      console.error("participants:", error);
      return fail(503, error);
    }
  }
  const db = database();
  if (!db) return fail(503, "storage not configured");
  try {
    return Response.json(await register(db, parsed));
  } catch (error) {
    console.error("participants:", error);
    return fail(502, "storage unavailable");
  }
}
