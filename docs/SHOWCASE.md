# Showcase guide

## Links

| Who | Address |
|---|---|
| Home | https://attune-ui-smoky.vercel.app |
| User (phone or laptop) | https://attune-ui-smoky.vercel.app/demo |
| Admin (no sign-in, public) | https://attune-ui-smoky.vercel.app/admin |
| Study (invite only) | `/study?code=<STUDY_CODE>` |
| Judge dashboard | `/eval` (Load Sample Study needs no setup) |

## Show it

1. User signs in once (Google, or username and password). Admin is open on the big screen.
2. On **Orders**, tap three status labels about 2 s apart. After 3 struggles the store changes by
   itself (at most every 8 s). The layout is sampled, so it may stay the same.
3. Admin -> **Find a user** shows what was sensed, the layout picked and the chances.
4. To show learning: after a change, finish 3 actions (open an order or product, add to cart,
   place the order, decide a return, send a message). The layout stays; Admin shows
   **Learned: ... scored N out of 100**. Struggling again with nothing finished scores low.
5. To show a chosen layout: gear -> X-Ray HUD -> **Preview a layout**. Say it was picked by hand.

| Layout | What the user sees |
|---|---|
| Large touch targets | Bigger buttons, tabs, categories and search |
| Simplified filters | Preset buttons; extra shelves and charts folded away |
| Quick actions | Shortcut bar, **+ Add** on products, clickable refund labels |
| Step hints | A tip on each page |

Fixed rules: two taps on a product or order card make its arrow glow; after 5 s on the refund policy a
bubble offers larger text (✓ or ✕); two photo searches move photo search first; Kannada.
Gear menu: Undo (also turns automatic changes off), Pin, automatic changes on/off, Reset
(only the screen goes back to Baseline and default shortcuts; logs, totals and learning
are kept). Admin -> **Saved logs** shows every saved user: behaviour totals, and each change
with its cause and model confidence. Press Refresh there for new entries.

## Judge dashboard in 30 seconds

Load Sample Study -> **SYNTHETIC** badge -> both contrasts are null (8% faster than placebo,
Holm p = .555; 23% faster than static, p = .356; simulated, about 10 per arm) -> off-policy table
with effective sample size -> copy the Python verifier command; it reproduces the numbers.

## Setup

- Vercel env and `.env.local`: see `.env.example`.
- Firebase: Authentication (Google, Email/Password) and Firestore in production mode.
- The free plan limits daily reads and writes: close admin tabs after a demo.
- Local: `npm run build`, then `npm start`.
- Practise the study with `STUDY_PHASE` empty, so runs are filed as `test` and never analysed.

## What you can claim

| Pitch claim | Say this instead |
|---|---|
| Learns from every session | The store learns in each visitor's own browser (kept after reload, not shared between users); the study policy is frozen |
| Adapts in under 1 ms | Decision time measured: median 0.85 ms over 20 in Chrome (first ones 1.35-1.5 ms), 0.33-0.37 ms in Node |
| Dead clicks trigger shortcuts | They make Quick actions **more likely** (59-64% in the simulated starting model) |
| Rage clicks enlarge buttons | **Not with the current model** (large targets 3-13%) |
| Only adapts above a confidence threshold | **No such gate exists** |
| Faster than static or random | Built and checked on **simulated** data. **No human results yet** |

Kannada text needs a native-speaker check. Demo activity never appears in `/eval`.
