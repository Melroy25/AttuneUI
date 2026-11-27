"use client";

import { useEffect, useRef, useState } from "react";
import type { Change } from "@/lib/demo/activity";
import { NO_WISH, parseWish, pressed, startVisit, wishKey, type WishSession } from "@/lib/demo/wishSession";
import { readJsonItem } from "./cloudCache";

/** One id per page load. Signing in starts a visit for that account; a remount does not. */
const visit = () => (typeof performance === "undefined" ? "" : String(Math.round(performance.timeOrigin)));

export function useWishSession(user: string | null, log: (change: Change) => void) {
  const key = wishKey(user);
  const [state, setState] = useState(NO_WISH);
  const current = useRef(NO_WISH);
  const record = useRef(log);
  useEffect(() => { record.current = log; });

  const commit = (next: WishSession) => {
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };

  useEffect(() => {
    const { state: next, started } = startVisit(parseWish(readJsonItem(key)), visit());
    commit(next);
    if (started && next.promoted) {
      record.current({
        trigger: `Pressed Wishlist ${next.last}× in the previous visit`,
        change: "Wishlist placed first in the navigation from the start of this visit",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key]);

  return {
    promoted: state.promoted,
    used: () => {
      const next = pressed(current.current);
      commit(next);
      record.current({ trigger: "Pressed Wishlist", change: `Counted (${next.current} this visit); nothing moves until the next visit` });
    },
  };
}
