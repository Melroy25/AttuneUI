# Showcase guide: try it yourself

## Store users and the admin (live)

| Who | Address |
|---|---|
| Shopper (phone or laptop) | https://attune-ui-smoky.vercel.app/demo |
| Admin | https://attune-ui-smoky.vercel.app/admin |

**One-time database step:** run all of `supabase/schema.sql` in Supabase's SQL editor (tables
`demo_users` and `live_sessions`). Without it, creating a store account fails.

1. Store: "New here? Create an account" with a made-up name (3-20 letters, numbers, _) and a
   password used nowhere else. Each person needs their own account. On one computer use a private
   window for the second user.
2. Admin: sign in. **All users** = totals, where users struggle, layouts shown and chosen, a table
   and recent activity. **One user** = that user's totals, layout history and live X-Ray.
3. In the store, click two or three status labels on Orders, a couple of seconds apart. After 3
   struggles the store adapts by itself (at most every 8 s). The admin follows about 1-2 s behind.
4. The sampled layout may be the one already shown. Undo pauses automatic adapting.

Totals add up a user's browser tabs from the last 24 hours; reloading a tab starts that tab's
counts again. Locally, put `ADMIN_USER` and `ADMIN_PASSWORD` in `.env.local` (without them the
store has no sign-in). Anyone can create a store account and there is no rate limit.

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

Demo clicks never appear in `/eval` (only `/study` runs do). The admin view keeps just the latest
snapshot per visitor, for about an hour at most; it is not study data and holds no typed text.

## Demo script (Reset Session before each step; gear -> X-Ray HUD shows what was sensed)

Decisions are sampled. After a Reset the random seed is the same, but the result also depends on
exactly what was sensed (a resting mouse counts as hesitation). Read "Why this layout".

| # | Do this | Then | Expect |
|---|---|---|---|
| 0 | Click the body of one order card twice, not its arrow | at once | That card's **arrow turns bold and glows**. A fixed rule, not the model; opening the order clears it |
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

The store shows no task list. Trigger Adaptation (in the X-Ray HUD) or the automatic rule adapts it.
Phone layout: Chrome DevTools (F12) -> device toolbar -> 375 px.

## More pages to test (demo only)

Click in the page, then press Trigger Adaptation in the HUD; you stay on the same page.

| Page | Do this | What is sensed or changes |
|---|---|---|
| Products | Click a card twice | Its arrow glows; `dead` rises |
| Products | Open the Steel kettle, tap the greyed "Add to cart" 3 times | `dead` (and `rage` if fast) |
| Products | Click "In stock" labels or the cart badge | `dead` |
| Returns | Aim just beside Approve / Reject | `miss` |
| Reports | Click the number tiles and bars, scroll up and down fast | `dead`, `thrash` |
| Help | Open Refund policy, wait 7 s | Larger text, sections and bullets |
| Help | Type Kannada in the message box, leave it, twice (or once plus a Kannada search) | UI switches to Kannada |
| Any | Go Orders -> Products -> Orders | `backtrack` |

Layout changes apply fully on Orders. On the other pages mainly the control size (large targets)
changes; filters, quick actions and step hints belong to Orders.

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
