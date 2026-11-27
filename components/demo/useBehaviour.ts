"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import { hashString } from "@/lib/attune-ui/rng";
import type { Change } from "@/lib/demo/activity";
import { ARTICLES } from "@/lib/demo/articles";
import {
  NO_BEHAVIOUR, behaviourKey, cueChanges, cuesFor, familiarity, navigate, parseBehaviour, pinExpired, searched,
  type Behaviour, type Step,
} from "@/lib/demo/behaviour";
import { readJsonItem } from "./cloudCache";

const SEARCH_PAUSE_MS = 1500;
const title = (id: string) => ARTICLES.find((a) => a.id === id)?.title ?? id;

/** Watches how the user moves around. Changes only emphasis and the reading pin; asks nothing. */
export function useBehaviour(user: string | null, page: Page, shop: Shop, log: (change: Change) => void) {
  const key = behaviourKey(user);
  const [state, setState] = useState(NO_BEHAVIOUR);
  const current = useRef(state);
  const record = useRef(log);
  useEffect(() => { record.current = log; });

  const update = useCallback((change: (b: Behaviour) => Behaviour) => {
    const next = change(current.current);
    if (next === current.current) return;
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  }, [key]);

  // Declared first: the effects below must see the saved copy.
  useEffect(() => {
    current.current = parseBehaviour(readJsonItem(key));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    setState(current.current);
  }, [key]);

  const step = useRef<Step | null>(null);
  useEffect(() => {
    const now = Date.now();
    const last = step.current;
    if (!last) { step.current = { page, at: now, from: null, phase: "plain" }; return; }
    if (last.page === page) return;
    const moved = navigate(current.current, last, page, now);
    step.current = moved.step;
    update(() => moved.behaviour);
  }, [page, update]);

  useEffect(() => {
    const now = current.current;
    const cues = cuesFor(now);
    const changes = cueChanges(now.cues, cues);
    if (changes.length === 0) return;
    const familiar = `familiarity ${Math.round(familiarity(now) * 100)}%`;
    for (const c of changes) {
      record.current({
        trigger: `Muscle memory: ${c.feature} used ${now.features[c.feature].uses}×, ${familiar}`,
        change: c.level === 0 ? `Removed the cue on ${c.feature}` : `${c.faded ? "Faded" : "Emphasised"} ${c.feature}`,
      });
    }
    update((b) => ({ ...b, cues, faded: b.faded + changes.filter((c) => c.faded).length }));
  }, [state, update]);

  // Search words never leave this function: only whether the same search came again is counted.
  const query = shop.query.trim().toLowerCase();
  useEffect(() => {
    if (query.length < 3) return;
    const timer = setTimeout(() => {
      const seenKey = `${key}:searches`;
      const saved = readJsonItem(seenKey);
      const earlier = Array.isArray(saved) ? saved : [];
      const hash = hashString(query);
      try {
        localStorage.setItem(seenKey, JSON.stringify([...earlier, hash].slice(-30)));
      } catch {
        // storage full or blocked
      }
      update((b) => searched(b, earlier.includes(hash)));
    }, SEARCH_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [query, key, update]);

  const dismissed = useRef(new Set<string>()); // closed by hand: not pinned again on this visit
  const unpin = useCallback((reason: string, byUser = false) => {
    const pin = current.current.pinned;
    if (!pin) return;
    if (byUser) dismissed.current.add(pin.article);
    record.current({ trigger: reason, change: `Unpinned "${title(pin.article)}"` });
    update((b) => ({ ...b, pinned: null, reading: { ...b.reading, unpins: b.reading.unpins + 1 } }));
  }, [update]);

  const reading = page === "articles" ? shop.article : null;
  useEffect(() => {
    const check = () => {
      const pin = current.current.pinned;
      if (pin && pinExpired(pin, Date.now(), reading === pin.article)) unpin("No reading activity for a while");
    };
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [reading, unpin]);

  return { state, current, dismissed, update, unpin, log: useCallback((c: Change) => record.current(c), []) };
}

export type BehaviourApi = ReturnType<typeof useBehaviour>;
