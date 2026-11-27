# AttuneUI (Team Veroxa, RESURRECT 2026 PS4)
Self-learning UI: friction sensing -> contextual bandit -> safe declarative surface -> causal eval.
Full spec: docs/SPEC.md (read only the section you need). Status: PROGRESS.md.

## Stack
Next.js 16 App Router, TypeScript 5 strict, Tailwind 4, Recharts (Phase 3), Vitest,
Supabase REST via plain fetch, Vercel. Python (numpy, scipy) only in evaluation/.
No new dependencies without asking.

## Verify
- npm run typecheck   (next typegen && tsc --noEmit)
- npm test            (vitest run)
- npm run build
- python evaluation/verify_results.py <export.json>   (from Phase 3)
Run typecheck + test after logic changes; build before deploy. Never claim done without output.

## Architecture invariants
1. lib/ is pure TS: no React or Next imports. UI imports lib, never the reverse.
2. All randomness goes through lib/attune-ui/rng.ts (seeded). No Math.random.
3. Two independent models: coarse (touch) and fine (mouse, pen).
4. Policy: eligibility mask -> MC Thompson probabilities -> epsilon mix -> sample from that
   distribution. Log the full probability vector, action, context, policy hash, seed.
5. /study: one decision per block boundary. Never change the UI mid-task.
   /demo: same rule, with a "Finish Task / Trigger Next Block Decision" control.
6. Context = pre-decision events only. Reward = post-decision only. SEQ never enters reward.
7. Task reward: .5 success + .35 min(Tref/T,1) (0 if failed) + .15 (1 - min(friction/5,1))
   - .05 if surface changed; clip 0..1. Block reward = mean of its task rewards.
8. Surfaces are validated SurfaceConfig data. Never render model-produced HTML/JS.
9. Navigation and landmarks never move. Quick actions duplicate; originals stay.
10. Event log is the source of truth; weights are recomputed by replay.
11. Simulated and human data are never pooled. Every simulated view says SIMULATED.
    /demo uses an in-memory model and never writes study data.

12. Preference layer (language, text size, content structure, search priority) is rule-based,
    separate from the bandit, applied only at block boundaries on /demo. It never enters
    context, reward, propensities or OPE. /study uses defaults and collects no preferences.
13. Server renders the layout from a validated cookie. Cookies and API bodies are untrusted.
14. Never state a latency or effect number that was not measured.

## Git
Remote origin: https://github.com/Melroy25/AttuneUI.git (main). Push after each commit.
Never commit .env*, secrets, or the problem-statement PDF. Never force push.

## Study and statistics
- Arms: A static, B context-blind placebo (frozen marginals, same mask), C frozen AttuneUI.
- Pilot (uniform random) updates the prior; then freeze and commit before confirmatory data.
- Unit = participant. Primary: CUPED-adjusted log Block-2 time, permutation test, Holm.
- Report N, effect size, 95% bootstrap CI, exclusions, ESS for OPE. Report nulls as nulls.
- After the freeze tag, do not edit portal, study, telemetry, surface or policy code.
  A necessary bug fix gets logged as a deviation in evaluation/PREREGISTRATION.md.

## Security
Validate and size-limit API input. Service key is server-only, in .env.local and Vercel env.
No personal data. Never commit secrets.

## Code rules
Files under ~250 lines. Smallest working change. Tests for friction, policy, stats, OPE, assignment.

## Token discipline
- One phase per session. At phase end: update PROGRESS.md (<40 lines), commit, tell user to /clear.
- Read only files needed for the task; search before reading.
- No sub-agents or multi-agent workflows unless the user asks.
- Trim long command output to the failing part.
- Same bug twice without progress: stop, state hypothesis, ask.
- Never re-print whole files in chat.
