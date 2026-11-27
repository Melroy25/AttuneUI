"use client";

import { useEffect, useState } from "react";
import {
  NO_HABITS, REPEAT, askSupport, habitsKey, openOrder, parseHabits, toggleWish, type Habits,
} from "@/lib/demo/habits";

const HIGHLIGHT_MS = 3000;

export function useHabits(user: string | null) {
  const key = habitsKey(user);
  const [habits, setHabits] = useState(NO_HABITS);
  const [fresh, setFresh] = useState(false); // support was promoted just now, not on an earlier visit

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
      setHabits(parseHabits(localStorage.getItem(key)));
    } catch {
      // storage blocked: habits last as long as the tab
    }
  }, [key]);

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(false), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [fresh]);

  const save = (next: Habits) => {
    setHabits(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked
    }
  };

  return {
    habits,
    fresh,
    wish: (id: string) => save(toggleWish(habits, id)),
    opened: (id: string) => save(openOrder(habits, id)),
    support: () => {
      const next = askSupport(habits);
      if (next.supportUses === REPEAT) setFresh(true);
      save(next);
    },
  };
}

export type HabitsApi = ReturnType<typeof useHabits>;
