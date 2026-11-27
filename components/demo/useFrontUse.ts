"use client";

import { useEffect, useRef, useState } from "react";
import type { Page } from "@/components/store/text";
import type { Change } from "@/lib/demo/activity";
import { NO_USE, parseUse, startVisit, useKey, used, type VisitUse } from "@/lib/demo/frontUse";
import { readJsonItem } from "./cloudCache";

/** One id per page load. Signing in starts a visit for that account; a remount does not. */
const visit = () => (typeof performance === "undefined" ? "" : String(Math.round(performance.timeOrigin)));

/** Counts silently. The front of the navigation is decided once, when a visit starts. */
export function useFrontUse(user: string | null, page: Page, category: string, log: (change: Change) => void) {
  const key = useKey(user);
  const [state, setState] = useState(NO_USE);
  const current = useRef(NO_USE);
  const record = useRef(log);
  useEffect(() => { record.current = log; });

  const commit = (next: VisitUse) => {
    current.current = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  };
  const count = (part: string) => commit(used(current.current, part));

  useEffect(() => {
    const { state: next, started } = startVisit(parseUse(readJsonItem(key)), visit());
    commit(next);
    if (started && next.front.length > 0) {
      record.current({
        trigger: `Used ${next.front.map((k) => `${k} ${next.last[k]}×`).join(", ")} in the previous visit`,
        change: `Placed ${next.front.join(", ")} at the front of the navigation for this visit`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [key]);

  // Declared after the load above, so these count into the visit that has just started.
  useEffect(() => {
    if (page !== "home") count(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- counts arrivals only
  }, [page]);
  useEffect(() => {
    if (page === "products" && category) count(`category:${category}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- counts arrivals only
  }, [page, category]);

  return {
    front: state.front,
    wished: () => {
      count("wishlist");
      record.current({ trigger: "Pressed Wishlist", change: "Counted for the next visit; nothing moves now" });
    },
  };
}
