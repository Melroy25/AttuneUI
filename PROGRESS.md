# Progress

## Phases 1-3a, pre-pilot code, confirmatory mode: DONE
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); in Chrome 0.85 ms
  median of 20, cold first decisions 1.35-1.5 ms.

## Phase 3b + demo polish: DONE 2026-11-27
- /demo: storefront skin (study look unchanged), gear menu, X-Ray drawer, manual layout
  preview (not a model decision). /eval: sample, upload, live fetch, metrics, OPE, timelines.
- Fixed: /demo never detected long hovers (HUD refresh ended them).
- Arrow cue (/demo only): 2 taps on a card body -> its arrow glows. Rule-based, changes mid-task
  (exception to invariant 5, requested by the user); card taps count as dead clicks.
- Store look: own-brand marketplace layout (search, categories, banners, rails, demo cart).
- Firebase only (Supabase removed): Auth (Google, username) and Firestore for study + live.
- /admin is public by the owner's choice (names, masked emails, activity). /demo adapts
  by itself after 3 struggles (user chose this; /demo exception to invariants 5, 10).
- /demo pages: Products, Returns, Reports, Help (fictional data, lib/demo/catalog.ts; new
  Kannada unreviewed). Guide and claim corrections: docs/SHOWCASE.md.

## Setup before phone test / pilot (user)
1. Firebase: create the Firestore database; add FIREBASE_SERVICE_ACCOUNT (docs/SHOWCASE.md).
2. Vercel and .env.local: FIREBASE_* values, EXPORT_TOKEN, STUDY_CODE, STUDY_PHASE (empty =
   test, "pilot", "confirmatory"). Redeploy after changing env.
3. Invite link: /study?code=<STUDY_CODE>. Phone test in phase test. Then pilot, 8-10 people.
4. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json
5. Fill every TBD in PREREGISTRATION.md, commit data/policy.frozen.json, tag, then set
   STUDY_PHASE=confirmatory.

## Open findings
- Not tested: real phone/touch, real Firestore, freeze on human data, screen reader.
- SIMULATED prior rarely picks large targets, even after rage clicks (3-13%).
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- Calm blocks give spread arm probabilities (~.3). Decide v (0.25) before the freeze.
- /demo learning uncapped; live and events APIs unlimited; Kannada unreviewed.

## Next
- Phone test, pilot, freeze. Then replay slider, attribution ladder, falsification (Phase 4).
