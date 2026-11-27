# Progress

## Phases 1-3a, pre-pilot code, confirmatory mode: DONE
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); in Chrome 0.85 ms
  median of 20, cold first decisions 1.35-1.5 ms.
- Pilot: static round + 2 uniform rounds; round 3 repeats round 1's task set; arm "P".

## Phase 3b + demo polish: DONE 2026-11-27
- /demo: storefront skin (study look unchanged), gear menu, X-Ray drawer, manual layout
  preview (not a model decision). /eval: sample, upload, live fetch, metrics, OPE, timelines.
- Verified: typecheck, 87/87 tests (13 files), clean build. Chrome, local prod build, in-memory
  database stand-in: demo friction signals, adaptations, 5 layouts, study run -> own JSON ->
  /eval, live fetch. 375 px frame (no touch emulation): demo, eval, study first task.
- Fixed: /demo never detected long hovers (HUD refresh ended them).
- Arrow cue (/demo only): 2 taps on a card body -> its arrow glows. Rule-based, changes mid-task
  (exception to invariant 5, requested by the user); card taps count as dead clicks.
- Study-shared files changed without behaviour change for /study: Portal (optional store skin,
  data-part attributes), capture.ts (peek(), data-attune-ignore).
- Showcase script and claim corrections: docs/SHOWCASE.md.

## Setup before phone test / pilot (user)
1. Run supabase/schema.sql (again if already run: it widens the arm and block checks).
2. .env.local and Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXPORT_TOKEN, STUDY_CODE,
   STUDY_PHASE (empty = test, "pilot", "confirmatory"). Redeploy after changing env.
3. Invite link: /study?code=<STUDY_CODE>. Phone test in phase test. Then pilot, 8-10 people.
4. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json
5. Fill every TBD in PREREGISTRATION.md, commit data/policy.frozen.json, tag, then set
   STUDY_PHASE=confirmatory.

## Open findings
- Not tested: real phone/touch, real Supabase, Vercel, freeze on human data, screen reader.
- SIMULATED prior rarely picks large targets, even after rage clicks (3-13%).
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- Calm blocks give spread arm probabilities (~.3). Decide v (0.25) before the freeze.
- /demo learning is not capped. Events API has no rate limit; assignment seed is committed.
- Kannada strings need a native-speaker review. Stale `.next` can break builds: delete it.

## Next
- Phone test, pilot, freeze. Then replay slider, attribution ladder, falsification (Phase 4).
