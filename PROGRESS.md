# Progress

## Phase 1 (engine + tests): DONE 2026-11-27
- Verified: typecheck pass, 18/18 tests pass (3 files), build pass.
- Built: lib/attune-ui/{types,rng}, telemetry/{friction,context},
  bandit/{linalg,policy,reward}, surface/{catalog,validate}, lib/eval/simulator.
- Reward refinement: failed tasks get no speed credit.
- App has only a placeholder home page.

## Open findings
- SIMULATED headroom is small: oracle 0.785 vs static 0.755 reward (n=4000 users);
  learner gains about +0.01 to +0.015 after 3000 sessions (3 seeds).
  A 10-person pilot will barely move the prior. Say so; claim learning from simulation
  curves plus measured pilot weight change only.
- Before the freeze: tune exploration v (0.25) on the simulator; set Tref from pilot.
- Learning test was changed to a paired, 3000-session comparison (margin 0.005).
- Not yet built: replay, per-session update cap, discount scenario, capture code.
- Not measured: the "<1 ms inference" claim.
- If build reports a missing module after an install, delete .next and rebuild.

## Next: Phase 2a (new session)
Portal with 3 task templates, 5 surfaces rendered from SurfaceConfig, /demo with
"Finish Task / Trigger Next Block Decision" and SIMULATED Fast-Forward, empty Vercel deploy.
