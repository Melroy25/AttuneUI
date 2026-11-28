// AttuneUI Anywhere, inside each web page. It only adds attributes and CSS values that content.css
// reads, plus one small prompt box. It never clicks, submits, or reads what is typed.
(() => {
  const R = globalThis.AttuneRules;
  if (!R || window.top !== window || window.__attuneAnywhere) return;
  window.__attuneAnywhere = true;

  const KEY = R.siteKey(location.hostname);
  const CONTROLS = "a[href],button,input,select,textarea,summary,label,[role=button],[role=link],[role=tab],[role=menuitem],[onclick]";
  const TEXT_BLOCKS = "p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,figcaption,pre,caption";
  let site = R.emptySite();
  let approved = false;
  let asking = null; // { el, run, what }
  let burst = null;
  let deadTaps = [];
  const misses = new Map();
  let tracker = R.newTracker();
  let focusAsked = false;

  // ---------- page helpers ----------
  const inBox = (e) => box && e.composedPath().includes(box);
  const isControl = (el) => !!el.closest(CONTROLS) || getComputedStyle(el).cursor === "pointer";

  /** A selector that finds the same element after a reload. */
  function cssPath(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      if (n.id && /^[A-Za-z][\w-]*$/.test(n.id) && document.querySelectorAll(`#${CSS.escape(n.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(n.id)}`);
        break;
      }
      if (n === document.body) { parts.unshift("body"); break; }
      let i = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === n.tagName) i++;
      parts.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${i})`);
    }
    return parts.join(" > ");
  }
  const find = (key) => { try { return document.querySelector(key); } catch { return null; } };

  /** The text block under the pointer, only when the pointer is on actual letters. */
  function textAt(x, y) {
    const r = document.caretRangeFromPoint?.(x, y);
    const node = r?.startContainer;
    if (!node || node.nodeType !== 3 || !node.textContent.trim()) return null;
    for (const i of [r.startOffset - 1, r.startOffset]) {
      if (i < 0 || i >= node.length) continue;
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const b = range.getBoundingClientRect();
      if (R.distance(b, x, y) <= 2) return node.parentElement.closest(TEXT_BLOCKS) ?? node.parentElement;
    }
    return null;
  }

  function nearestControl(x, y, reach) {
    let best = null;
    for (const el of document.querySelectorAll(CONTROLS)) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const d = R.distance(rect, x, y);
      if (d <= reach && (!best || d < best.d)) best = { el, rect, d };
    }
    return best;
  }

  // ---------- applying saved changes ----------
  function apply() {
    for (const el of document.querySelectorAll("[data-attune-size]")) {
      el.removeAttribute("data-attune-size");
      el.style.removeProperty("--attune-fs");
    }
    for (const el of document.querySelectorAll("[data-attune-roomy]")) el.removeAttribute("data-attune-roomy");
    for (const [key, t] of Object.entries(site.texts)) {
      const el = find(key);
      if (!el) continue;
      el.setAttribute("data-attune-size", String(t.size));
      el.style.setProperty("--attune-fs", `${((t.base * t.size) / 100).toFixed(2)}px`);
    }
    for (const key of site.targets) find(key)?.setAttribute("data-attune-roomy", "");
    document.documentElement.toggleAttribute("data-attune-focus", site.focus);
  }
  let queued = false;
  const reapply = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  };
  // Pages that rebuild themselves lose the marks; attributes are not watched, so this cannot loop.
  new MutationObserver(reapply).observe(document.documentElement, { childList: true, subtree: true });

  const save = (next) => {
    site = next;
    chrome.storage.local.set({ [KEY]: site });
    apply();
  };
  const log = (trigger, change) => save(R.addLog(site, trigger, change, Date.now()));

  // ---------- the one prompt box ----------
  let box = null;
  let hideTimer = 0;
  function show(lines, buttons, stay) {
    if (!box) {
      box = document.createElement("div");
      box.id = "attune-ext-box";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
    }
    if (!box.isConnected) document.documentElement.append(box);
    box.replaceChildren();
    lines.forEach((text, i) => {
      const line = document.createElement("span");
      line.className = i === 0 ? "attune-q" : "attune-d";
      line.textContent = text;
      box.append(line);
    });
    for (const [label, main, onClick] of buttons) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (main) b.className = "attune-main";
      b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
      box.append(b);
    }
    box.hidden = false;
    clearTimeout(hideTimer);
    if (!stay) hideTimer = setTimeout(hide, 6000);
  }
  const hide = () => { if (box) box.hidden = true; };

  function undo() {
    const back = R.undoLast(site);
    if (!back) return hide();
    save(back.site);
    log("Pressed Undo", back.label);
    show([`↩︎ ${back.label}`], [], false);
  }

  /** Asks until the first Yes; after that every matching change applies by itself. */
  function gate(el, what, run) {
    if (approved) {
      run();
      return show([`✓ ${what}`, "Applied automatically, because you said Yes before."], [["↩︎ Undo", false, undo]], false);
    }
    if (asking) return;
    asking = { el, what, run };
    el?.setAttribute("data-attune-ask", "");
    log(`Wanted to: ${what}`, 'Asked "Do you want to keep changes?"');
    show(["Do you want to keep changes?", `AttuneUI wants to: ${what}.`],
      [["Yes", true, () => answer(true)], ["No", false, () => answer(false)]], true);
  }
  function answer(yes) {
    const { el, what, run } = asking;
    asking = null;
    el?.removeAttribute("data-attune-ask");
    if (!yes) {
      log('Said No to "Do you want to keep changes?"', `Left as it was: ${what}`);
      return hide();
    }
    approved = true;
    chrome.storage.local.set({ [R.CONSENT_KEY]: true });
    log('Said Yes to "Do you want to keep changes?"', "Approved: later changes apply automatically");
    run();
    show([`✓ ${what}`], [["↩︎ Undo", false, undo]], false);
  }

  // ---------- the triggers ----------
  function onText(el) {
    const key = cssPath(el);
    const base = site.texts[key]?.base ?? parseFloat(getComputedStyle(el).fontSize);
    if (!R.enlargeText(site, key, base)) return; // already the largest
    window.getSelection()?.removeAllRanges(); // fast clicks select words; that is not wanted
    gate(el, "make this text bigger", () => {
      const next = R.enlargeText(site, key, base);
      if (!next) return;
      save(next.site);
      log("Clicked one text 4 times in 2.5 s", `Text size raised to ${next.size}%`);
    });
  }

  function onMiss(near) {
    const key = cssPath(near.el);
    if (site.targets.includes(key)) return;
    const taps = R.within(misses.get(key) ?? [], Date.now(), R.MISS.ms);
    misses.set(key, taps);
    if (taps.length < R.MISS.count) return;
    misses.delete(key);
    const name = (near.el.textContent || near.el.getAttribute("aria-label") || "link").trim().slice(0, 40);
    gate(near.el, `make "${name}" easier to tap`, () => {
      const next = R.addTarget(site, key);
      if (!next) return;
      save(next);
      log(`Missed "${name}" twice by a few pixels`, "Outlined it and gave it a bigger tap area");
    });
  }

  function onDead(x, y) {
    deadTaps = R.within(deadTaps, Date.now(), R.DEAD.ms);
    if (deadTaps.length < R.DEAD.taps) return;
    deadTaps = [];
    const near = nearestControl(x, y, R.DEAD.reach);
    if (!near) return;
    near.el.setAttribute("data-attune-pulse", "");
    setTimeout(() => near.el.removeAttribute("data-attune-pulse"), 2600);
    log("Tapped 3 times where nothing happens", "Pointed out the nearest button or link (no lasting change)");
  }

  document.addEventListener("click", (e) => {
    if (e.button !== 0 || inBox(e) || !(e.target instanceof Element)) return;
    if (e.detail === 0 || isControl(e.target)) return; // keyboard clicks and working controls never count
    const text = textAt(e.clientX, e.clientY);
    if (text) {
      burst = R.nextBurst(burst, cssPath(text), performance.now());
      if (R.deliberate(burst)) { burst = null; onText(text); }
      return;
    }
    const near = nearestControl(e.clientX, e.clientY, R.MISS.near);
    if (near && R.isSmall(near.rect)) return onMiss(near);
    onDead(e.clientX, e.clientY);
  }, true);

  window.addEventListener("scroll", () => {
    if (site.focus || focusAsked) return;
    const t = Date.now();
    tracker = R.scrolled(tracker, t, window.scrollY);
    if (!R.restless(tracker, t)) return;
    focusAsked = true; // once per page load
    gate(null, "turn on reading focus (more space between lines)", () => {
      const next = R.setFocus(site);
      if (!next) return;
      save(next);
      log("Scrolled up and down 4 times in 15 s", "Reading focus on: wider line spacing, narrower text");
    });
  }, { passive: true });

  // ---------- storage ----------
  chrome.storage.local.get([KEY, R.CONSENT_KEY], (saved) => {
    site = R.parseSite(saved[KEY]);
    approved = saved[R.CONSENT_KEY] === true;
    apply();
  });
  // The popup's Undo and Reset arrive here.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (KEY in changes) { site = R.parseSite(changes[KEY].newValue); apply(); }
    if (R.CONSENT_KEY in changes) approved = changes[R.CONSENT_KEY].newValue === true;
  });
})();
