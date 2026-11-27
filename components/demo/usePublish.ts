"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UI_COOKIE, encodeUi, type UiState } from "@/lib/demo/uiState";

export const writeUiCookie = (value: string, maxAge: number) => {
  document.cookie = `${UI_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
};

/** Server renders the new layout from the cookie; offline we render it here. */
export function usePublish(serverUi: UiState) {
  const router = useRouter();
  const [offlineUi, setOfflineUi] = useState<UiState | null>(null);
  const publish = (next: UiState) => {
    writeUiCookie(encodeUi(next), 60 * 60 * 24 * 30);
    if (navigator.onLine) {
      setOfflineUi(null);
      router.refresh();
    } else setOfflineUi(next);
  };
  return { ui: offlineUi ?? serverUi, offline: offlineUi !== null, publish };
}
