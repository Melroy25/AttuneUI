"use client";

import { useEffect, useState } from "react";
import type { Shortcut } from "@/lib/bandit/shortcutBandit";
import {
  NO_HABITS, askSupport, habitsKey, hoverSupport, openOrder, parseHabits, toggleWish, type Habits,
} from "@/lib/demo/habits";

export function useHabits(user: string | null, onUse: (kind: Shortcut, habits: Habits) => void) {
  const key = habitsKey(user);
  const [habits, setHabits] = useState(NO_HABITS);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
      setHabits(parseHabits(localStorage.getItem(key)));
    } catch {
      // storage blocked: habits last as long as the tab
    }
  }, [key]);

  const save = (kind: Shortcut, next: Habits) => {
    onUse(kind, next);
    setHabits(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked
    }
  };

  return {
    habits,
    wish: (id: string) => save("wishlist", toggleWish(habits, id)),
    opened: (id: string) => save("similar", openOrder(habits, id)),
    support: () => save("support", askSupport(habits)),
    supportHover: () => save("support", hoverSupport(habits)),
  };
}

export type HabitsApi = ReturnType<typeof useHabits>;
