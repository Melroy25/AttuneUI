# AttuneUI Anywhere (browser extension)

Brings the AttuneUI adaptations to any website. It changes only how a page looks (CSS and
attributes) and shows one small prompt box. It never clicks, submits, buys, or reads what you type.
Everything is saved in this browser only, per website. Nothing is sent anywhere.

## Install (Chrome or Edge)
1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top right in Chrome, left side in Edge).
3. Click **Load unpacked** and pick the folder `E:\RESSURECT\extension`.
4. Click the puzzle icon in the toolbar and pin **AttuneUI Anywhere**.
5. Open or reload a website. Pages that were already open need a reload.

After editing these files, press the ↻ reload button on the extension's card, then reload the page.

## What it does
| You do | It does |
|---|---|
| Click one piece of text 4 times within 2.5 s | Makes only that text bigger (112.5% → 125% → 137.5%) |
| Tap twice just beside a small link or button (within 30 s) | Outlines that one control and gives it a bigger tap area |
| Tap 3 times quickly where nothing happens | Pulses the nearest button or link (nothing is kept) |
| Scroll up and down 4 times within 15 s | Turns on reading focus: wider line spacing, narrower text |

The first change asks **"Do you want to keep changes?"**. **No** changes nothing and asks again next
time. **Yes** applies it, and from then on changes apply by themselves with a small **Undo** box.

The toolbar popup shows what changed on the current site, the last 10 log entries,
**Undo last change**, **Reset this site**, and **Reset all sites and ask again**.

## Three sites to demonstrate
Start with **Reset all sites and ask again** in the popup so the question appears.

1. **Wikipedia: hard-to-read text** · https://en.wikipedia.org/wiki/Bengaluru
   - Click on the words of one paragraph 4 times quickly (on letters, not links).
   - The paragraph gets a dashed blue outline and the question appears. Press **Yes**: it grows.
   - Click another paragraph 4 times: it grows straight away, no question.
   - Reload the page: both stay big. Popup → **Undo last change**: the second one goes back.

2. **Hacker News: tiny links** · https://news.ycombinator.com
   - Tap twice just under a small grey link such as "hide" or "comments" (a few pixels below it).
   - Only that link gets an amber outline and padding. The rest of the page is unchanged.
   - Tap 3 times quickly on empty space at the far right of a row: the nearest link pulses.
   - Popup → **Reset this site**: back to normal.

3. **GOV.UK: lost while reading** · https://www.gov.uk/apply-renew-passport
   - Scroll down and up 4 times within 15 seconds.
   - Reading focus turns on: more space between lines and a narrower column.
   - Open Wikipedia again: Wikipedia keeps its own changes; GOV.UK's do not carry over.

## Limits
- It cannot run on `chrome://` pages, the Chrome Web Store, or the browser's PDF viewer.
- Text found again after a reload is matched by its place in the page. If a site changes its
  layout, a saved change may no longer find its text; **Reset this site** clears it.
- On pages where something (not a link) reacts to clicks, a click may still count as "nothing happens".
- These numbers are fixed rules, not measured results; this extension is not part of the study data.

## Files
`manifest.json` (Manifest V3) · `rules.js` (rules, tested by `tests/extension-rules.test.ts`) ·
`content.js` + `content.css` (in each page) · `popup.html` + `popup.js` (toolbar popup)
