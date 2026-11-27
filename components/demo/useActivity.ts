"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_ACTIVITY, activityKey, parseActivity, type Activity, type Change } from "@/lib/demo/activity";

/** Newest first, kept in this browser until Reset. */
export function useActivity(user: string | null) {
  const key = activityKey(user);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    try {
      const saved = parseActivity(JSON.parse(localStorage.getItem(key) ?? "[]"), MAX_ACTIVITY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
      if (saved) setActivity(saved);
    } catch {
      // blocked or damaged storage: start empty
    }
  }, [key]);

  useEffect(() => {
    if (activity.length === 0) return;
    try {
      localStorage.setItem(key, JSON.stringify(activity));
    } catch {
      // storage full or blocked
    }
  }, [key, activity]);

  const add = useCallback((c: Change) => {
    const entry = { at: Date.now(), trigger: c.trigger.slice(0, 200), change: c.change.slice(0, 200) };
    setActivity((list) => [entry, ...list].slice(0, MAX_ACTIVITY));
  }, []);

  return { activity, add };
}
