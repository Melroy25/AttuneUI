# Progress

## Phases 1, 2a, 2b, pre-pilot code: DONE
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); 0.8-1.05 ms in app browser (n<=4).
- Pilot: static round + 2 uniform rounds; round 3 repeats round 1's task set; arm "P".

## Confirmatory mode + Phase 3a: DONE 2026-11-27
- Verified: typecheck, 72/72 tests (11 files), clean build, verify_results.py on the SIMULATED
  fixture (TS and Python agree within 1e-9).
- STUDY_PHASE=confirmatory: B/C use data/policy.frozen.json (validated, hash checked); page and
  registration refuse (503) with a clear message when it is missing or invalid.
- lib/eval/{stats,tests,ope}.ts, evaluation/verify_*.py, requirements.txt. Regenerate the
  fixture: WRITE_FIXTURE=1 npm test
- Chrome, local prod build, in-memory database stand-in: /, /demo, confirmatory (arm C, desktop)
  and test (375 px frame) flows, /api/policy, /api/decide; no console errors, API calls 200.
- Fixed: demo Undo after a no-change boundary or language pick; fixed refund button hid the
  page end on narrow screens; stale home page text.

## Setup before phone test / pilot (user)
1. Run supabase/schema.sql (again if already run: it widens the arm and block checks).
2. .env.local and Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPORT_TOKEN, STUDY_CODE,
   STUDY_PHASE (empty = test, "pilot", "confirmatory"). Redeploy after changing env.
3. Invite link: /study?code=<STUDY_CODE>. Phone test in phase test. Then pilot, 8-10 people.
4. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json
5. Fill every TBD in PREREGISTRATION.md, commit data/policy.frozen.json, tag, then set
   STUDY_PHASE=confirmatory. Analysis: pip install -r evaluation/requirements.txt;
   python evaluation/verify_results.py export.json --policy data/policy.frozen.json

## Open findings
- Not tested: real phone/touch, real Supabase round trip, Vercel bundling of the frozen file,
  freeze on human data, screen reader.
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- Calm blocks give spread arm probabilities (~.3). Decide v (0.25) before the freeze.
- /demo learning is not capped. Events API has no rate limit; assignment seed is committed.
- Kannada strings need a native-speaker review. Stale `.next` can break builds: delete it.

## Next
- /eval page, replay, HUD extras (Phase 3b); attribution ladder, falsification (Phase 4).
