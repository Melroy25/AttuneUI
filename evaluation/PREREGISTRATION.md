# AttuneUI pre-registration

**Status: DRAFT. Not registered until committed with the freeze tag, before any confirmatory
participant. Fill every TBD first.**

## At the freeze (record here)
- Freeze tag: TBD. Commit: TBD. Frozen policy hash (`data/policy.frozen.json`): TBD.
- Prior hash (`data/policy.prior.json`): TBD.
- Pilot: usable participants TBD, updates TBD, exclusions TBD, weight shift TBD.
- Reference task time (Tref): 15 s unless changed here: TBD. Exploration v / epsilon: TBD.
- Stop rule (date and time, or N): TBD. Target 24-40 participants; no stopping on results.
- Analysis script commit: TBD (to be written before confirmatory data are inspected).

## Design
- Unit: participant. Between-participant arms: A static; B context-blind placebo (frozen
  marginals, same eligibility mask, same epsilon); C frozen AttuneUI.
- Block 1 static for all (3 tasks). Block 2 in the assigned arm (3 tasks). One decision per
  participant, at the boundary, from Block-1 events only. Task cap 90 s.
- Server-side permuted blocks of 3, stratified by pointer type (mouse, touch, pen). Task-set
  order counterbalanced.
- Participants may see that the UI changed; they are not told which arm they are in.
- Policy and code are frozen: no learning during the confirmatory phase.

## Hypotheses (two-sided)
- H1: adjusted log Block-2 time differs between C and A (expected direction: C faster).
- H2: adjusted log Block-2 time differs between C and B (expected direction: C faster).

## Primary endpoint
- T = sum of the three Block-2 task times; a failed task counts as 90 s. Y = log T.
- CUPED: X = log of the Block-1 total, same rule. Y_adj = Y - theta (X - mean X), with
  theta = cov(X, Y) / var(X) pooled over all analysed participants of all three arms.
- Test: difference in mean Y_adj; permutation test, 10,000 label permutations within pointer
  stratum, two-sided, fixed seed 2026.
- Multiplicity: Holm over H1 and H2, family-wise alpha 0.05.
- Report per contrast: N per arm, difference, Hedges g, seeded 95% bootstrap CI (10,000
  resamples), raw and Holm-adjusted p. Null results are reported as null.

## Secondary (descriptive or exploratory, no confirmatory claims)
- Mann-Whitney U on Y_adj (sensitivity). B versus A.
- Task success, SEQ (1-7; never part of the reward), composite friction (partly mechanical:
  bigger targets produce fewer misses), Undo and Pin use.
- Off-policy evaluation (IPS, SNIPS, DR) on randomised logs with logged propensities, always
  with effective sample size. Human OPE is exploratory.

## Implementation (code is the definition)
- `lib/eval/stats.ts` and `lib/eval/ope.ts`; independent check `evaluation/verify_results.py`.
- Permutation p = (hits + 1) / 10001. Bootstrap: percentile, resampled within arm, theta held
  fixed. Mann-Whitney: normal approximation with tie and continuity corrections.
- OPE uses only decisions where every eligible arm had positive probability (arm A is
  deterministic and dropped). DR reward model: ridge (lambda 1) per pointer model and arm,
  cross-fitted over 5 participant folds.

## Exclusions (decided now, applied before looking at outcomes)
- Phase other than "confirmatory" (test and pilot rows are never analysed here).
- Repeat device: the browser had started the study before.
- Incomplete: fewer than 6 task rows or no decision row. Attrition is reported per arm.
- Offline assignment (not server-randomised): excluded from the primary analysis and
  reported separately.
- No outlier removal. Undo and Pin users stay in their arm (intention-to-treat).
- Retried uploads are de-duplicated by (participant, sequence number).

## Pilot (not part of the confirmatory analysis)
- 8-10 people: static block, then two blocks with a surface drawn uniformly among eligible
  arms. The third block reuses the first block's task set (practice effect).
- Use: replayed into the SIMULATED prior (at most 2 updates per participant; repeat devices
  and incomplete blocks skipped; offline pilot runs kept and counted). Arm B marginals are the
  resulting policy's average win probabilities over the pilot's first decision contexts.
- Pilot participants do not take part in the confirmatory phase.

## Limitations
Small N: about 10 per arm detects only about d = 1.3 unadjusted at 80% power. The prior is a
simulator written by the authors. Arms are exclusive. One session. Hackathon-attendee sample.

## Deviations
None so far. Log every change after the freeze here: date, change, reason, and whether
outcome data had been seen.

| Date | Change | Reason | Outcomes seen? |
|---|---|---|---|
