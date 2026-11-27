"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UI_COOKIE, decodeUi, encodeUi, type UiState } from "@/lib/demo/uiState";
import { uiKey } from "./storage";

const OWNER_KEY = "attune-ui-owner"; // whose layout the cookie holds

export const writeUiCookie = (value: string, maxAge: number) => {
  document.cookie = `${UI_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
};

/** Server renders the new layout from the cookie; offline we render it here. */
export function usePublish(serverUi: UiState, user: string | null, onRestore: (ui: UiState) => void) {
  const router = useRouter();
  const [offlineUi, setOfflineUi] = useState<UiState | null>(null);
  const publish = (next: UiState) => {
    writeUiCookie(encodeUi(next), 60 * 60 * 24 * 30);
    try {
      localStorage.setItem(uiKey(user), encodeUi(next));
    } catch {
      // storage blocked: the cookie still holds it
    }
    if (navigator.onLine) {
      setOfflineUi(null);
      router.refresh();
    } else setOfflineUi(next);
  };

  // Each account gets its own layout back, and never inherits another account's.
  useEffect(() => {
    try {
      const me = user ?? "guest";
      const saved = localStorage.getItem(uiKey(user));
      const owner = localStorage.getItem(OWNER_KEY);
      localStorage.setItem(OWNER_KEY, me);
      if (!saved && (owner === null || owner === me)) {
        localStorage.setItem(uiKey(user), encodeUi(serverUi));
        return;
      }
      const next = decodeUi(saved ?? undefined, navigator.language);
      if (encodeUi(next) === encodeUi(serverUi)) return;
      onRestore(next);
      publish(next);
    } catch {
      // storage blocked: the cookie decides
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [user]);

  return { ui: offlineUi ?? serverUi, offline: offlineUi !== null, publish };
}
