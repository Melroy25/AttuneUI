# Progress
## Phases 1-3a, pre-pilot code, confirmatory mode: DONE. Phase 3b + demo polish: DONE 2026-11-28
- decide() measured: Node 0.33-0.37 ms median (n=50), Chrome 0.85 ms (n=20), cold 1.35-1.5 ms.
- /demo (fictional data; guide: docs/SHOWCASE.md): storefront, gear menu, X-Ray, manual preview,
  arrow cue (exception to invariant 5). /eval: upload, metrics, OPE. Firebase only (study untried).
- /admin is public by the owner's choice (names, masked emails, activity). /demo adapts
  by itself after 3 struggles (user chose this; /demo exception to invariants 5, 10).
- /demo learns again: a score after 3 finished actions (or a failure after struggle only),
  saved per account in the browser, kept on Reset (exception to invariant 11 "in-memory").
- /demo shortcuts (Wishlist on cards, Search similar, Customer Support replacing the header
  Support; invariant 9 exception): a 2-arm Thompson bandit each (lib/bandit/shortcutBandit.ts,
  hand-set prior), +1 on use, -1 on ✕ or Undo; Wishlist and Support only from 3 uses.
- Saved per user in Firestore demo_users/{userId} + activity (server REST, /api/demo-user;
  browser cache first, newer saved copy applied on load). Reset changes the screen only: logs,
  totals, counts and weights stay. Admin "Saved logs" tab: user selector, cause -> effect.
- QA 2026-11-28: nothing scales the page; one floating prompt at a time (Undo also in ⚙);
  single dead click waits 0.6 s so double clicks only grow text; sign-out -> English. 149 tests.
- Rules, not the bandit: dead click on delivery location / product card -> floating shortcut;
  2 problem taps on small targets in 30 s -> bigger hit area on those controls only (no prompt;
  exception to invariant 5; off while Pin or auto-off), before/after counts (descriptive).
  Picked language and city are per user, survive Reset. Popover under "Deliver to"; product dead click asks about the newest cart item first. X-Ray on: red click pulse. Predicted hesitation (repeats, back-and-forth, scroll
  shaking) -> Yes/No card; answers move threshold/cooldown and category order, never the layout
  bandit; navigation only. All /demo rules.
- Articles page (5, English). Muscle memory: cue (never moves) on needed features, fades with
  successful visits. Reader: pins "Currently Reading", inline help only after repeat returns +
  back-and-forth scrolling; no pop-ups; no layout adapting or hesitation there. Admin box.
- Double click on a text (data-text-id) -> only its font +12.5% (max 137.5%), saved per user,
  no prompt, Undo one step, Reset clears, held by Pin (exception to invariant 5). Cards and dead-click summary link to a guide (hub if none fits).
## Setup before phone test / pilot (user)
1. Vercel/.env.local: FIREBASE_*, EXPORT_TOKEN, STUDY_CODE, STUDY_PHASE (empty = test, "pilot",
   "confirmatory"). Redeploy. 2. Phone test at /study?code=<STUDY_CODE>, then pilot, 8-10 people.
3. GET /api/export (Bearer EXPORT_TOKEN) -> file, npm run policy:freeze -- file.json. 4. Fill
   TBDs in PREREGISTRATION.md, commit data/policy.frozen.json, tag, STUDY_PHASE=confirmatory.
## Open findings (next: phone test, pilot, freeze, replay slider, attribution, falsification)
- Not tested: Firestore and /demo adaptations in a browser, phone, study writes, freeze, screen reader.
- /demo counts any finished action as success. SIMULATED prior rarely picks large targets
  (3-13%); oracle .785 vs static .755, learner +.01 to +.015 at 3000. Calm blocks spread arm
  probabilities (~.3): decide v (0.25) before the freeze.
- /demo learning uncapped; live and events APIs unlimited; Kannada unreviewed; one flaky 5 s test timeout.
