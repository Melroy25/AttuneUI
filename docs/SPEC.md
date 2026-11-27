# AttuneUI spec (Team Veroxa, RESURRECT 2026, PS4: Self-Learning UI Management Model)

## 1. Rubric
"Claims without measured evidence will not be scored." Define "better", choose and justify
metrics (with limits), compare to a baseline with N, method, failure cases, reproducibility.
PS4: learn from interaction, improve UX over time, beat a static UI, prove the model caused it.

## 2. Thesis
Passive friction sensing -> sub-ms linear Thompson bandit (pure TS) -> safe declarative
surface (A2UI-inspired, not A2UI-compliant) -> built-in causal evaluation lab.
Global brain (shared weights), personal adaptation (live context vector). No LLM, no HTML gen.

## 3. Sensing
| Signal | Definition | Pointer |
|---|---|---|
| rage | >=3 downs within 1 s and 40 px; clusters do not overlap | both |
| dead | down on a labelled non-interactive element (wins over miss) | both |
| miss | down on an unlabelled spot <=24 px from a target | both |
| dwell | hover > 1.5 s | fine only |
| thrash | >=4 scroll direction reversals within 2 s | both |
| backtrack | view sequence A -> B -> A | both |
| tortuosity | cursor path length / displacement, > 3 counts as hesitation | fine only |
Capture notes (Phase 2): `data-attune-id` labels elements; use `pointercancel` to detect touch
scrolls; ignore hover on touch; no motion-sensor APIs.

## 4. Context (d = 7, in [0,1])
bias, narrow viewport (<768 px), familiarity min(sessions/5,1), dead, rage, miss (each
min(count/3,1)), hesitation min((dwell+thrash+backtrack+tortuous)/3,1).
Pointer type selects the model: touch -> coarse; mouse, pen -> fine. Weights never shared.

## 5. Surfaces (mutually exclusive arms; limitation: no combinations)
baseline, ergonomic (48 px targets, thumb-zone CTA), disclosure (collapse secondary filters,
smart presets), shortcut (quick-action bar, actionable badge), guided (inline step hints;
eligible only for familiarity < 0.6 with some friction).
Guardrails: locked skeleton; duplicate, never teleport; chip "Adapted for faster access ·
Undo · Pin Layout" shown identically in B and C. Undo/Pin analysed intention-to-treat.

## 6. Policy
Disjoint linear Thompson sampling. Arm score ~ N(mu.x, v^2 x'A^-1 x), so sample scalars;
A^-1 updated by Sherman-Morrison. Eligibility mask -> 2000 MC draws -> mix epsilon=0.1
uniform over eligible -> sample action from that vector (logged propensity is exact).
No confidence gate or post-hoc override. Discount gamma<1 for task-shift scenario.
Per-session update cap (with replay, Phase 3). Reward in CLAUDE.md invariant 7;
failed tasks get no speed credit; Tref default 15 s, fixed at the freeze.

## 7. Study protocol (/study)
- One-line consent, no personal data, SEQ (1-7) after each task.
- Block 1: static for all. Block 2: assigned arm. 3 task templates per block, matched
  variants, block variant order counterbalanced. Task cap 90 s.
  Templates: find delayed order (#ORD-4821 style); filter high-priority refunds;
  partial refund (Rs 450 style). Receipt export dropped.
- Baseline friction built in: refund buried in "..." menu, non-clickable status badge,
  dense filters, small mobile buttons.
- Exactly one decision per participant, at the block boundary.
- Server-side randomisation, stratified by pointer type, permuted blocks of 3.
- Pilot (8-10 people): Block 1 static, then 2 uniform-random blocks. Updates the simulator
  prior (data/policy.prior.json). Then freeze data/policy.frozen.json, compute its marginals
  for arm B, commit evaluation/PREREGISTRATION.md, tag. Report how far weights moved.
- Confirmatory (target 24-40): policy frozen. Offline participants flagged, analysed apart.

## 8. Demo (/demo)
Toggle Static / Random Placebo / AttuneUI; "Finish Task / Trigger Next Block Decision"
button (live adaptation visible within 20 s of a 3-minute pitch); separate "Fast-Forward
+10/+50" labelled SIMULATED; Pin, Reset, X-Ray HUD (friction pings, context, probabilities,
per-feature contributions theta_a*x, causal log, surface JSON), time-travel replay slider.
In-memory model only; never writes study data.

### 8a. Preference layer (team requirements; /demo only)
Deterministic rules, not the bandit, so 3-arm propensities and causal maths are untouched.
| Rule | Trigger | Effect at next block boundary |
|---|---|---|
| Language | Accept-Language kn on first visit, or >=2 Kannada signals (picks Kannada, types Kannada) outnumbering English picks | Kannada UI, server-rendered |
| Reading size | policy text open and page visible > 60 s (demo mode 5 s) | larger text |
| Structure | same reading signal | sectioned text becomes accordion + bullets |
| Search | >=2 photo searches and more than text searches | photo search shown first |
An explicit language choice wins. Undo, Pin and Reset cover preferences too. Photo search is
a sample-catalogue picker, NOT computer vision. Kannada strings need native-speaker review.
Reading dwell is a proxy (a reader may be idle). Not evaluated causally; disclose as such.

### 8b. SSR and "beyond static GenUI"
/demo is a dynamic server route: cookie -> strict validator -> SurfaceConfig + preferences ->
server HTML. After a boundary the client writes the cookie and calls router.refresh();
offline it renders locally and says so. Learning is continuous: every block updates the
model, over a closed catalogue of validated layouts (no generated markup).

### 8c. Model delivery and Android
GET /api/policy: versioned JSON (hash, features, config, surfaces, weights, marginals,
provenance SIMULATED until frozen). POST /api/decide: validated context in; decision,
surface and server-measured latency out. Android path in scope: installable web app
(manifest + icons; Chrome on Android can install it as a WebAPK). A native APK is out of
scope; after deploy one may be packaged from the manifest (e.g. PWABuilder), optional.
A native client would consume the same two endpoints.

### 8d. Demo behaviour
Prior: 1500 SIMULATED sessions, seed 2026, computed lazily (data/policy.prior.json is only
needed from the pilot on). Latency shown is measured on the device. Changed elements are
listed and outlined after each boundary. The policy may keep the static layout; never rig it.

## 9. Data
Firestore collections participants and events via plain fetch from API routes (service account
server-side, input validated and size-limited). localStorage queue + retry + JSON export.
No shared weights stored. No pre-seeded fake human data.

## 10. Evaluation (/eval)
- Primary: participant-level log Block-2 time, CUPED-adjusted by Block-1; permutation test;
  C vs B and C vs A, Holm. Failures capped at 90 s. Mann-Whitney U as sensitivity.
- Secondary: success, SEQ, composite friction (flag: partly mechanical, e.g. big targets).
- Effect size (Hedges g, log scale), seeded 95% bootstrap CI, N, exclusions.
- Power caveat: n=10/arm detects only about d=1.3 unadjusted at 80% power.
- OPE: IPS, SNIPS, DR on randomised logs only, with ESS; human OPE labelled exploratory.
- Views: Human | SIMULATED. Never combined. Regret only in simulation.
- Simulator validates mechanics, not real-world effect. Attribution ladder: static,
  context-blind, best single arm, rules, AttuneUI, oracle.
- Falsification: effectScale=0 (null world); about 5% false positives over 200 runs.
- Stress tests via one scenario parameter: cold start, task shift (gamma), noisy shared device.
- Designer insights from weights per modality. Overview page reuses these stats.
- Downloads: raw_telemetry.csv, experiment_summary.json, verify_results.py. Python point
  estimates match TS; bootstrap CIs agree within tolerance. Show pre-registration git hash.

## 11. Limitations to disclose
Small N; participants not blind to UI change (blind to which arm); sim prior is authored by
us; arms exclusive; one session; hackathon-attendee sample.

## 12. Roadmap (4 x 5 h)
P1 engine+tests (h0-3). P2a portal+surfaces+empty deploy (h3-5). P2b capture, study,
database, export (h5-8); pilot h8-9; freeze h10. P3 stats, OPE, replay, Python, /eval, HUD
(h10-15, humans collecting). P4 ladder, falsification, stress, overview (h15-17.5; close
study h17). P5 analysis, README, demo rehearsal, backup video (h17.5-20).
Cut order if late: replay slider, insights, third stress test, JSON viewer.
Never cut: study, placebo, stats, Python verifier.
