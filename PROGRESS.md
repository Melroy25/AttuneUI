# Progress

## Phase 1 (engine + tests): DONE
## Phase 2a (portal, SSR demo, delivery API): DONE 2026-11-27
- Verified: typecheck pass, 33/33 tests (5 files), clean build pass.
- Browser check (local prod build): rage+dead -> shortcut (p=.64), server re-rendered;
  preference rules, Kannada SSR, API 200/400, manifest, icon, 375 px width all worked.
- Built: components/{portal,demo,hud}, lib/{demo,study,delivery}, preferences, capture,
  /demo, /api/policy, /api/decide, PWA manifest, stub /study and /eval.
- Measured decide() latency: 0.33-0.37 ms median in Node (n=50, two runs); 0.8-1.05 ms in app browser (n<=4).

## Open findings
- SIMULATED headroom small: oracle .785 vs static .755; learner +.01 to +.015 at 3000.
- On calm blocks (no friction) arm probabilities are spread (~.3), so the demo layout can
  change at each boundary. Tune v (0.25) before the freeze, or Pin during the pitch.
- Not tested: real phone, real touch, Android install, offline fallback, screen reader.
- Kannada strings need a native-speaker review.
- Not built: replay, update cap, discount scenario, policy.prior.json, frozen policy.
- Not deployed: import the GitHub repo into Vercel.
- Stale `.next` can break builds: delete it and rebuild.

## Next: Phase 2b (new session)
/study flow (consent, 2 blocks, SEQ, 90 s cap), assignment, Supabase tables + API routes,
offline queue, export; Vercel deploy; phone test; pilot; prior, freeze, PREREGISTRATION.md.
/study must pass DEFAULT_PREFERENCES and ignore preference signals.
