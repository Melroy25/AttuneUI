# Progress

## Phases 1-3a, pre-pilot code, confirmatory mode: DONE (dark footer added to /demo)
- decide() measured: Node 0.33-0.37 ms median (n=50), Chrome 0.85 ms (n=20), cold 1.35-1.5 ms.
## Phase 3b + demo polish: DONE 2026-11-27
- /demo: storefront skin (study look unchanged), gear menu, X-Ray drawer, manual layout
  preview (not a model decision). /eval: sample, upload, live fetch, metrics, OPE, timelines.
- Arrow cue (/demo only): 2 taps on a card body -> its arrow glows. Rule-based, changes mid-task
  (exception to invariant 5, requested by the user); card taps count as dead clicks.
- Firebase only: Auth (Google, username), Firestore study + live; study saving not yet tried.
- /admin is public by the owner's choice (names, masked emails, activity). /demo adapts
  by itself after 3 struggles (user chose this; /demo exception to invariants 5, 10).
- /demo data is fictional (lib/demo/catalog.ts). Guide and claim corrections: docs/SHOWCASE.md.
- /demo learns again: a score after 3 finished actions (or a failure after struggle only),
  saved per account in the browser, kept on Reset (exception to invariant 11 "in-memory").
- /demo shortcuts (Wishlist on cards, Search similar, Customer Support replacing the header
  Support; invariant 9 exception): a 2-arm Thompson bandit each (lib/bandit/shortcutBandit.ts,
  hand-set prior), +1 on use, -1 on ✕ or Undo. Wishlist and Support are considered only from
  3 uses (2 mouse hovers on a footer support link = 1 use).
- Saved per user in Firestore demo_users/{userId} + activity (server REST, /api/demo-user;
  browser cache first, newer saved copy applied on load). Reset changes the screen only: logs,
  totals, counts and weights stay. Admin "Saved logs" tab: user selector, cause -> effect.
- A long policy read asks with a bubble before enlarging text. Hover/focus tooltips (data-tip,
  components/ui/Tooltip.tsx, English except two translated labels). 124/124 tests.

## Setup before phone test / pilot (user)
1. Vercel and .env.local: FIREBASE_* values, EXPORT_TOKEN, STUDY_CODE, STUDY_PHASE (empty =
   test, "pilot", "confirmatory"). Redeploy after changing env.
2. Invite link: /study?code=<STUDY_CODE>. Phone test in phase test. Then pilot, 8-10 people.
3. GET /api/export (Bearer EXPORT_TOKEN) -> file, then npm run policy:freeze -- file.json
4. Fill every TBD in PREREGISTRATION.md, commit data/policy.frozen.json, tag, then set
   STUDY_PHASE=confirmatory.

## Open findings
- Not tested: Firestore saved logs, shortcuts, footer, tooltips (browser), phone, study writes, freeze, screen reader.
- /demo counts any finished action as success. SIMULATED prior rarely picks large targets
  (3-13%); headroom small: oracle .785 vs static .755, learner +.01 to +.015 at 3000.
- Calm blocks spread arm probabilities (~.3): decide v (0.25) before the freeze.
- /demo learning uncapped; live and events APIs unlimited; Kannada unreviewed.
## Next: phone test, pilot, freeze, then replay slider, attribution ladder, falsification.
