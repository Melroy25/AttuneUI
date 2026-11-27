# Showcase guide: try it yourself

## Start the app

```powershell
npm run build
```

```powershell
npm start
```

Open http://localhost:3000. There are **no accounts or logins**.

| Page | Who it is for | Needs |
|---|---|---|
| `/demo` | Live show-and-tell | Nothing |
| `/study?code=<STUDY_CODE>` | A real participant | `STUDY_CODE` in `.env.local` (without one, `npm start` runs the study offline) |
| `/eval` | Judge dashboard | Nothing for the sample; `EXPORT_TOKEN` and Supabase for live data |

**Be a new user.** Demo: gear (top right) -> Reset Session. Study: open a new private window.
A second run in the same browser is flagged `repeat_device` and left out of the analysis.
Close all private windows between people.

**`/demo` never saves anything**, so demo clicks do not appear in `/eval`. Only `/study` runs do.

## Demo script (Reset Session before each step; gear -> X-Ray HUD shows what was sensed)

Decisions are sampled. After a Reset the random seed is the same, but the result also depends on
exactly what was sensed (a resting mouse counts as hesitation). Read "Why this layout".

| # | Do this | Then | Expect |
|---|---|---|---|
| 1 | Click 3 different status badges | Trigger Adaptation | Usually **Quick actions** (59-64% in the simulated prior) |
| 2 | Rest the mouse on a badge 2 s (twice), scroll up and down fast, open order 1, 2, then 1 | Trigger | HUD shows dwell, thrash, backtrack; we got **Simplified filters** (31%) |
| 3 | Click one spot 3 times quickly | Trigger | HUD shows rage; usually Quick actions, **rarely large targets** |
| 4 | HUD -> Preview a layout (manual) | pick each | All five layouts. Say it is manual: the model did not choose it |
| 5 | After any adaptation: Pin layout | Trigger | Layout holds; the HUD says what the policy wanted. Gear -> Undo reverts |
| 6 | Open Refund policy, wait 7 s (not pinned) | Trigger | Larger text, sections and bullets |
| 7 | Search by product photo, pick 2 products | Trigger | Photo search moves first |
| 8 | Header language -> ಕನ್ನಡ | at once | Kannada UI. Undo never reverts a language you picked |
| 9 | HUD -> Static or Random placebo | Trigger | The two comparison policies |
| 10 | HUD -> +50 users | | Learning from SIMULATED users |

All three tickets done -> "Next batch" does the same as Trigger Adaptation.
Phone layout: Chrome DevTools (F12) -> device toolbar -> 375 px.

## Study -> your own data in the dashboard

Keep `STUDY_PHASE` empty while practising, so your runs are filed as `test` and never analysed.
A pilot or confirmatory run of your own would pollute the real data.

1. Private window -> `/study?code=...` -> "I agree" -> 6 tasks, each with a 1-7 rating.
2. On the last screen: **Download my data (JSON)**.
3. `/eval` -> Upload export JSON -> Participants -> click your ID. You see Block 1, the decision
   (chosen layout, probabilities, context) and Block 2 with the change.

Your arm is random: A keeps the static layout, B is the placebo, C is AttuneUI.
With Supabase configured you can instead paste `EXPORT_TOKEN` -> Fetch Live Data. Without it the
study runs offline; the download still works and the run is flagged `offline`.

## Judge dashboard in 30 seconds

Load Sample Study -> point at the **SYNTHETIC** badge -> both contrasts are **null results**
(8% faster than placebo, Holm p = .555; 23% faster than static, p = .356; simulated, about 10
per arm) -> off-policy table with ESS -> surface breakdown -> copy the Python verifier command
and run it: it reproduces the numbers.

## What you can claim (checked against the code)

| Claim in the pitch | Say this instead |
|---|---|
| Learns from every session, adapts in <1 ms | The demo learns in memory per session; the study policy is frozen. Decision time measured: median 0.85 ms over 20 in Chrome, 0.33-0.37 ms in Node; first cold ones were 1.35-1.5 ms |
| Dead clicks **trigger** Shortcut promotion | Dead clicks make Quick actions **more likely** |
| Rage clicks trigger the Ergonomic boost | **Not true with the current prior** (large targets 3-13%). It is one layout the policy can choose |
| Hesitation triggers Disclosure or Guided | Possible, not reliable (about 22-31% and 12%) |
| Only adapts above a confidence threshold | **Remove: no such gate exists.** Reward subtracts .05 for any non-static layout; users can Pin or Undo |
| LLMs take 3-6 s; zero broken UI or lag | We measured no LLM. Say: only validated configs from a fixed catalogue, no generated HTML (A2UI-inspired, not compliant) |
| 3-arm test with causal estimators and p-values | Built and verified on simulated data. **No human results yet** |

Not yet tested: a real phone, a real Supabase round trip, the Vercel deployment.
Kannada text needs a native-speaker check.
