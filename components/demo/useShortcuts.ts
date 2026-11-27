"use client";

import { useEffect, useRef, useState } from "react";
import {
  consider, dropEarly, eligible, feedback, newShortcuts, parseShortcuts, shortcutContext, usesOf, type Shortcut, type ShortcutState,
} from "@/lib/bandit/shortcutBandit";
import type { Change } from "@/lib/demo/activity";
import { similarTo, type Habits } from "@/lib/demo/habits";
import { shortcutsKey } from "./storage";

const HIGHLIGHT_MS = 3000;
const NAMES: Record<Shortcut, string> = { wishlist: "Wishlist", similar: "Search similar", support: "Customer Support" };
const ACTIONS: Record<Shortcut, string> = { wishlist: "Wishlist presses", similar: "opens of one order", support: "support clicks and hovers" };

export function useShortcuts(user: string | null, record: (change: Change) => void) {
  const key = shortcutsKey(user);
  const [state, setState] = useState(newShortcuts);
  const current = useRef(state); // two events in one click must both see the newest weights
  const [latest, setLatest] = useState<Shortcut | null>(null); // what Undo would remove
  const [fresh, setFresh] = useState(false); // support was promoted just now

  const commit = (next: ShortcutState) => {
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: learning lasts as long as the tab
    }
  };

  useEffect(() => {
    let saved = newShortcuts();
    try {
      saved = dropEarly(parseShortcuts(localStorage.getItem(key)));
    } catch {
      // storage blocked
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    commit({ ...saved, visits: saved.visits + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key]);

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(false), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  return {
    fresh,
    latest,
    on: (kind: Shortcut) => !!state.promoted[kind],
    supersede: () => setLatest(null),
    consider: (kind: Shortcut, habits: Habits, friction: number) => {
      if (!eligible(kind, habits)) return;
      const x = shortcutContext(kind, habits, friction, current.current.visits);
      const decided = consider(current.current, kind, x);
      commit(decided.state);
      if (decided.confidence === null) return;
      setLatest(kind);
      if (kind === "support") setFresh(true);
      const change = kind === "wishlist" ? "Promoted the Wishlist button to order cards"
        : kind === "support" ? "Replaced Support with a Customer Support button in the header"
        : `Added "Search similar to ${similarTo(habits, 1)[0]?.name}" cards`;
      record({
        trigger: `${ACTIONS[kind]}: ${usesOf(kind, habits)}, struggles: ${friction}, visit ${decided.state.visits}`,
        change: `${change} (Bandit: ${Math.round(decided.confidence * 100)}% confidence)`,
      });
    },
    use: (kind: Shortcut) => commit(feedback(current.current, kind, 1)),
    dismiss: (kind: Shortcut, how: string) => {
      commit(feedback(current.current, kind, -1));
      setLatest(null);
      record({ trigger: how, change: `Removed the ${NAMES[kind]} shortcut; the bandit scored it -1` });
    },
  };
}

export type ShortcutsApi = ReturnType<typeof useShortcuts>;
