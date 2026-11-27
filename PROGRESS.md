# Progress

## Phase 1 (engine + tests): DONE
## Phase 2a (portal, SSR demo, delivery API): DONE 2026-11-27
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); 0.8-1.05 ms in app browser (n<=4).

## Phase 2b (study flow, storage): CODE DONE 2026-11-27, not tested on phones or live Supabase
- Verified: typecheck pass, 45/45 tests (6 files), clean build pass.
- Browser (local prod build, 375 px, /api stubbed 503): scripted 6-task offline run, Undo,
  decision logged, 22 uploads queued; task cap checked with a shortened timer.
  Real API: invalid body 400, oversized 413, export without config 503.
- Built: lib/study/{assignment,boundary,records,validate,queue}, lib/server/,
  /api/{participants,events,export}, supabase/schema.sql, components/study/, .env.example.
- Rows are phase "test" (lib/study/assignment.ts). Block 2 uses the SIMULATED prior.
- Undo/Pin chip shows on the between-task screen only (invariant 5).
- Hover is now captured for mouse only (pen excluded).
- Review fixes: no pull-to-refresh, prior built on page load (boundary rating 3 ms in app
  browser, n=1), saved-data download on consent screen, route tests. Now 49/49 tests (7 files).
- Before confirmatory data: require a study code on /api/participants.

## Setup before phone test (user)
1. Run supabase/schema.sql in the Supabase SQL editor.
2. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPORT_TOKEN in .env.local and Vercel env.
3. Import the GitHub repo into Vercel (not deployed yet).
4. Export: GET /api/export with "Authorization: Bearer <EXPORT_TOKEN>".

## Open findings
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- On calm blocks arm probabilities are spread (~.3). Tune v (0.25) before the freeze.
- Not tested: real phone/touch, Supabase round trip, Android install, screen reader.
- API has no auth or rate limit on writes; assignment seed is committed (predictable).
- Kannada strings need a native-speaker review.
- Stale `.next` can break builds: delete it and rebuild.

## Next (new session)
Setup above, deploy, phone test. Then, BEFORE the pilot, still to build: pilot mode (Block 1
static + 2 uniform-random blocks, phase "pilot"), replay, update cap, data/policy.prior.json.
Then pilot, prior, freeze (frozen policy + marginals, phase "confirmatory"), PREREGISTRATION.md.
