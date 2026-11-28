// AttuneUI Anywhere: the rules, with no access to the page or the browser, so they can be tested.
// Loaded before content.js and popup.js; both read globalThis.AttuneRules.
(() => {
  const SIZES = [100, 112.5, 125, 137.5]; // percent of the text's own size
  const MAX_ITEMS = 100;
  const MAX_LOG = 50;
  const okKey = (k) => typeof k === "string" && k.length > 0 && k.length <= 400 && k !== "__proto__";
  const okText = (t) => !!t && SIZES.includes(t.size) && t.size !== 100 && Number.isFinite(t.base) && t.base > 0 && t.base < 200;
  const push = (list, item) => [...list, item].slice(-MAX_ITEMS);

  const R = {
    SIZES,
    BURST: { ms: 2500, clicks: 4 }, // clicks on one text
    MISS: { near: 24, count: 2, ms: 30_000 }, // taps just beside one small control
    DEAD: { taps: 3, ms: 2000, reach: 200 }, // taps on nothing
    SCROLL: { turnPx: 60, reversals: 4, ms: 15_000 }, // up-and-down scrolling
    CONSENT_KEY: "attune-ext:consent",
    siteKey: (host) => `attune-ext:${host}`,
    emptySite: () => ({ texts: {}, targets: [], focus: false, history: [], log: [] }),

    /** Clicks on one text within the window add up; another text, or a pause, starts again. */
    nextBurst(last, key, t) {
      const same = last !== null && last.key === key && t - last.start <= R.BURST.ms;
      return same ? { ...last, count: last.count + 1 } : { key, start: t, count: 1 };
    },
    deliberate: (b) => b.count >= R.BURST.clicks,
    /** Keeps the times inside the window and adds this one. */
    within: (times, now, ms) => [...times.filter((t) => now - t <= ms), now],
    isSmall: (r) => r.width < 48 || r.height < 32,
    /** Space between a point and a box, 0 inside it. */
    distance(r, x, y) {
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      return Math.hypot(dx, dy);
    },

    /** One step bigger, or null at the largest size. `base` is its size before any change, in px. */
    enlargeText(site, key, base) {
      const now = site.texts[key];
      const size = SIZES[(now ? SIZES.indexOf(now.size) : 0) + 1];
      if (!size || !(base > 0)) return null;
      const texts = { ...site.texts, [key]: { size, base: now ? now.base : base } };
      return { size, site: { ...site, texts, history: push(site.history, { kind: "text", key, before: now ?? null }) } };
    },
    addTarget(site, key) {
      if (site.targets.includes(key)) return null;
      return { ...site, targets: push(site.targets, key), history: push(site.history, { kind: "target", key }) };
    },
    setFocus(site) {
      return site.focus ? null : { ...site, focus: true, history: push(site.history, { kind: "focus" }) };
    },
    /** Takes back the newest change only. */
    undoLast(site) {
      const last = site.history.at(-1);
      if (!last) return null;
      const history = site.history.slice(0, -1);
      if (last.kind === "text") {
        const texts = { ...site.texts };
        if (last.before) texts[last.key] = last.before;
        else delete texts[last.key];
        return { site: { ...site, texts, history }, label: "Text size back one step" };
      }
      if (last.kind === "target") {
        return { site: { ...site, targets: site.targets.filter((k) => k !== last.key), history }, label: "Bigger link back to normal" };
      }
      return { site: { ...site, focus: false, history }, label: "Reading focus off" };
    },
    /** Newest first. */
    addLog(site, trigger, change, at) {
      const entry = { at, trigger: String(trigger).slice(0, 200), change: String(change).slice(0, 200) };
      return { ...site, log: [entry, ...site.log].slice(0, MAX_LOG) };
    },

    newTracker: () => ({ y: null, turn: 0, direction: 0, reversals: [] }),
    /** Counts changes of scroll direction; small wobbles under turnPx do not count. */
    scrolled(s, t, y) {
      if (s.y === null) return { ...s, y, turn: y };
      const way = Math.sign(y - s.turn);
      if (s.direction !== 0 && way === s.direction) return { ...s, y, turn: y };
      if (Math.abs(y - s.turn) < R.SCROLL.turnPx) return { ...s, y };
      const reversals = s.direction === 0 ? s.reversals : [...s.reversals.filter((r) => t - r <= R.SCROLL.ms), t];
      return { y, turn: y, direction: way, reversals };
    },
    restless: (s, t) => s.reversals.filter((r) => t - r <= R.SCROLL.ms).length >= R.SCROLL.reversals,

    /** Browser storage can hold anything: keep only what fits. */
    parseSite(v) {
      const s = R.emptySite();
      if (!v || typeof v !== "object") return s;
      for (const [k, t] of Object.entries(v.texts ?? {})) if (okKey(k) && okText(t)) s.texts[k] = { size: t.size, base: t.base };
      s.targets = Array.isArray(v.targets) ? v.targets.filter(okKey).slice(-MAX_ITEMS) : [];
      s.focus = v.focus === true;
      s.history = (Array.isArray(v.history) ? v.history : []).filter((h) => h && (h.kind === "focus"
        || (h.kind === "target" && okKey(h.key))
        || (h.kind === "text" && okKey(h.key) && (h.before === null || okText(h.before))))).slice(-MAX_ITEMS);
      s.log = (Array.isArray(v.log) ? v.log : []).filter((e) => e && Number.isFinite(e.at)
        && typeof e.trigger === "string" && typeof e.change === "string").slice(0, MAX_LOG);
      return s;
    },
  };

  globalThis.AttuneRules = R;
})();
