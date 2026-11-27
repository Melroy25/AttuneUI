"use client";

import { useEffect, useState, type RefObject } from "react";
import type { BehaviourApi } from "@/components/demo/useBehaviour";
import {
  READING, confusedAbout, newTracker, progressOf, readingState, scrolled, seen,
} from "@/lib/demo/articleReading";
import type { Article } from "@/lib/demo/articles";

const TICK_MS = 1000;
const SAVE_EVERY = 5; // ticks: saving each second would mean many database writes

/** Times, scrolling and which paragraphs come back into view. Returns the paragraphs to help with. */
export function useArticleReading(article: Article, ref: RefObject<HTMLElement | null>, behaviour?: BehaviourApi) {
  const [helped, setHelped] = useState<string[]>([]);
  const update = behaviour?.update;
  const unpin = behaviour?.unpin;
  const log = behaviour?.log;
  const current = behaviour?.current;
  const dismissed = behaviour?.dismissed;

  useEffect(() => {
    const root = ref.current;
    if (!root || !update || !unpin || !log || !current || !dismissed) return;
    let tracker = newTracker();
    const onScreen = new Set<string>();
    const shown: string[] = [];
    let lastInput = Date.now();
    let activeMs = 0;
    let ticks = 0;
    let finished = false;
    const sent = { activeMs: 0, scrollPx: 0, reversals: 0, revisits: 0 };
    let reversals = 0;
    let after = 0; // revisits to paragraphs that already have their helper

    const input = () => { lastInput = Date.now(); };
    const onScroll = () => {
      input();
      const was = tracker.reversals.at(-1);
      tracker = scrolled(tracker, Date.now(), window.scrollY);
      if (tracker.reversals.at(-1) !== was) reversals++;
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.paragraph!;
        if (entry.isIntersecting) onScreen.add(id);
        else onScreen.delete(id);
        const before = tracker.revisits[id] ?? 0;
        tracker = seen(tracker, id, entry.isIntersecting);
        if (shown.includes(id) && (tracker.revisits[id] ?? 0) > before) after++;
      }
    }, { threshold: 0.5 });
    root.querySelectorAll("[data-paragraph]").forEach((el) => observer.observe(el));

    const progress = () => {
      const box = root.getBoundingClientRect();
      return progressOf(box.top, box.height, window.innerHeight);
    };
    const save = () => {
      const total = {
        activeMs, scrollPx: Math.round(tracker.travelled), reversals,
        revisits: Object.values(tracker.revisits).reduce((s, n) => s + n, 0),
      };
      const add = (k: keyof typeof sent) => total[k] - sent[k];
      const more = { activeMs: add("activeMs"), scrollPx: add("scrollPx"), reversals: add("reversals"), revisits: add("revisits") };
      const later = after;
      after = 0;
      Object.assign(sent, total);
      if (Object.values(more).every((n) => n === 0) && later === 0) return;
      update((b) => ({
        ...b,
        reading: {
          ...b.reading,
          activeMs: b.reading.activeMs + more.activeMs, scrollPx: b.reading.scrollPx + more.scrollPx,
          reversals: b.reading.reversals + more.reversals, revisits: b.reading.revisits + more.revisits,
          helpedAfter: b.reading.helpedAfter + later,
        },
      }));
    };

    const tick = () => {
      const now = Date.now();
      const idleMs = now - lastInput;
      if (!document.hidden && idleMs < READING.activeMs) activeMs += TICK_MS;
      const far = progress();
      const state = readingState({ activeMs, progress: far, travelled: tracker.travelled, idleMs });
      if (state === "finished" && !finished) {
        finished = true;
        unpin("Finished reading");
        update((b) => ({ ...b, reading: { ...b.reading, finished: b.reading.finished + 1, bestProgress: 1 } }));
      }
      const pin = current.current.pinned;
      const paragraph = article.content.find((p) => onScreen.has(p.id))?.id;
      const fresh = pin?.article !== article.id;
      const wanted = state === "reading" && !finished && !dismissed.current.has(article.id);
      if (wanted && paragraph && (fresh || ticks % SAVE_EVERY === 0)) {
        if (fresh) log({ trigger: `Reading "${article.title}" steadily (${Math.round(far * 100)}%)`, change: "Pinned \"Currently Reading\"" });
        update((b) => ({
          ...b,
          pinned: { article: article.id, paragraph, progress: far, at: now },
          reading: { ...b.reading, pins: b.reading.pins + (fresh ? 1 : 0), bestProgress: Math.max(b.reading.bestProgress, far) },
        }));
      }
      const hard = confusedAbout(tracker, now, [...onScreen], shown);
      if (hard) {
        const times = tracker.revisits[hard];
        shown.push(hard);
        // The next helper needs new back-and-forth scrolling.
        tracker = { ...tracker, reversals: [] };
        setHelped([...shown]);
        log({
          trigger: `Scrolled back to paragraph ${hard.split("-p")[1]} of "${article.title}" ${times}× while scrolling up and down`,
          change: "Showed a simpler explanation under it",
        });
        update((b) => ({
          ...b,
          reading: { ...b.reading, helpers: b.reading.helpers + 1, helpedBefore: b.reading.helpedBefore + times },
        }));
      }
      if (++ticks % SAVE_EVERY === 0) save();
    };

    const timer = setInterval(tick, TICK_MS);
    const inputs = ["pointermove", "pointerdown", "keydown", "touchstart"];
    inputs.forEach((type) => window.addEventListener(type, input, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearInterval(timer);
      observer.disconnect();
      inputs.forEach((type) => window.removeEventListener(type, input));
      window.removeEventListener("scroll", onScroll);
      save();
    };
  }, [article, ref, update, unpin, log, current, dismissed]);

  return helped;
}
