# Progress

## Phases 1, 2a (engine, portal, SSR demo, delivery API): DONE
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); 0.8-1.05 ms in app browser (n<=4).

## Phase 2b (study flow, storage, review fixes): DONE

## Pre-pilot pieces: CODE DONE 2026-11-27
- Verified: typecheck pass, 59/59 tests (8 files), clean build pass.
- Browser (local prod build, STUDY_PHASE=pilot, no database): wrong code refused; 3-round
  offline run logged two uniform decisions (p=.25) and queued 22 uploads.
- Built: bandit/replay.ts (cap 2 updates per participant), lib/study/freeze.ts,
  scripts/policy.mjs (Node 22.18+), data/policy.prior.json (SIMULATED, hash 5f1ba6ec),
  pilot mode, study code gate, evaluation/PREREGISTRATION.md (DRAFT).
- Pilot: static round + 2 uniform rounds; round 3 repeats round 1's task set; arm "P".

## Setup before phone test / pilot (user)
1. Run supabase/schema.sql (again if already run: it widens the arm and block checks).
2. .env.local and Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPORT_TOKEN,
   STUDY_CODE (required in production), STUDY_PHASE (empty = test, "pilot" for the pilot).
3. Deploy on Vercel. Invite link: /study?code=<STUDY_CODE>. Redeploy after changing env.
4. Phone test in phase test. Then STUDY_PHASE=pilot, run 8-10 people.
5. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json

## Open findings
- Not tested: real phone/touch, Supabase round trip, freeze on real data, screen reader.
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- Calm blocks give spread arm probabilities (~.3). Decide v (0.25) before the freeze.
- /demo learning is not capped (cap applies to log replay only).
- Events API has no rate limit; assignment seed is committed (predictable).
- Kannada strings need a native-speaker review. Stale `.next` can break builds: delete it.

## Still needed BEFORE the freeze tag (study code is locked after it)
- Confirmatory mode: STUDY_PHASE "confirmatory" is refused today; wire arms B/C to
  data/policy.frozen.json and add tests.
- Fill every TBD in PREREGISTRATION.md; commit frozen policy; tag.
