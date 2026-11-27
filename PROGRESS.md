# Progress
## Phases 1-3a, pre-pilot code, confirmatory mode: DONE
- decide() measured: Node 0.33-0.37 ms median (n=50), Chrome 0.85 ms (n=20), cold 1.35-1.5 ms.
## Phase 3b + demo polish: DONE 2026-11-27
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
- A long policy read asks with a bubble before enlarging text. Hover/focus tooltips (data-tip,
  components/ui/Tooltip.tsx, mostly English). 135/135 tests.
- Rules, not the bandit: dead click on delivery location / product card -> floating shortcut;
  2 problem taps on small targets in 30 s -> bigger targets with Undo (no prompt; exception to
  invariant 5; off while Pin or auto-off), before/after counts saved (descriptive only).
  Hand-picked language and delivery city are per user and survive Reset.
- Location popover sits under "Deliver to"; product dead click asks about the newest cart item
  first. X-Ray on: red click pulse. Predicted hesitation (repeats, back-and-forth, scroll
  shaking) -> Yes/No card; answers move threshold/cooldown and category order, never the layout
  bandit; navigation only. All /demo rules.
## Setup before phone test / pilot (user)
1. Vercel and .env.local: FIREBASE_* values, EXPORT_TOKEN, STUDY_CODE, STUDY_PHASE (empty =
   test, "pilot", "confirmatory"). Redeploy after changing env.
2. Invite link: /study?code=<STUDY_CODE>. Phone test in phase test. Then pilot, 8-10 people.
3. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json
4. Fill every TBD in PREREGISTRATION.md, commit data/policy.frozen.json, tag, then set
   STUDY_PHASE=confirmatory.
## Open findings (next: phone test, pilot, freeze, replay slider, attribution, falsification)
- Not tested: Firestore saved logs and all /demo adaptations (browser), phone, study writes, freeze, screen reader.
- /demo counts any finished action as success. SIMULATED prior rarely picks large targets
  (3-13%); headroom small: oracle .785 vs static .755, learner +.01 to +.015 at 3000.
- Calm blocks spread arm probabilities (~.3): decide v (0.25) before the freeze.
- /demo learning uncapped; live and events APIs unlimited; Kannada unreviewed.
