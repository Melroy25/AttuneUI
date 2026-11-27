import { policyDocument } from "@/lib/delivery/contract";

export function GET() {
  return Response.json(policyDocument(), { headers: { "cache-control": "public, max-age=60" } });
}
