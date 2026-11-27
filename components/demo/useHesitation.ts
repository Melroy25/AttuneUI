"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import type { InteractionEvent } from "@/lib/attune-ui/types";
import type { Change } from "@/lib/demo/activity";
import { CATALOG, type Category } from "@/lib/demo/catalog";
import {
  H, NO_HESITATION, answer, hesitationKey, parseHesitation, shouldAsk, visitSignal,
  type Hesitation, type Signal, type SignalKind, type Visit,
} from "@/lib/demo/hesitation";
import { readJsonItem } from "./cloudCache";

const REASONS: Record<SignalKind, string> = {
  thrash: "fast up-and-down scrolling", repeat: "repeat visits", pingpong: "going back and forth",
};
export interface Offer { category: Category | null; stage: "ask" | "picks" }

/** Watches browsing, asks at most one question at a time, and learns from the answer. */
export function useHesitation(user: string | null, page: Page, shop: Shop, log: (change: Change) => void) {
  const key = hesitationKey(user);
  const [state, setState] = useState(NO_HESITATION);
  const [offer, setOffer] = useState<Offer | null>(null);
  const seen = useRef<{ visits: Visit[]; signals: Signal[] }>({ visits: [], signals: [] });
  const latest = useRef({ state, offer, page, log });
  useEffect(() => { latest.current = { state, offer, page, log }; });

  const commit = useCallback((next: Hesitation) => {
    latest.current.state = next;
    setState(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or blocked: it lasts as long as the tab
    }
  }, [key]);

  useEffect(() => {
    latest.current.state = parseHesitation(readJsonItem(key));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
    setState(latest.current.state);
  }, [key]);

  const sense = useCallback((signal: Signal) => {
    const now = latest.current;
    const signals = [...seen.current.signals.filter((s) => signal.t - s.t <= H.windowMs), signal];
    seen.current.signals = signals;
    // Never interrupt the cart, or a question already on screen.
    if (now.offer || now.page === "cart") return;
    const ask = shouldAsk(now.state, signals, signal.t);
    if (!ask) return;
    seen.current = { visits: [], signals: [] };
    latest.current.offer = { category: ask.category, stage: "ask" };
    setOffer(latest.current.offer);
    commit({ ...now.state, askedAt: signal.t });
    now.log({
      trigger: `Predicted hesitation: ${ask.kinds.map((k) => REASONS[k]).join(", ")}`,
      change: `Asked Yes/No: show ${ask.category ? `${ask.category} quick picks` : "categories"}?`,
    });
  }, [commit]);

  const selected = CATALOG.find((p) => p.id === shop.selected);
  const visit = page !== "products" ? `page:${page}`
    : selected ? `product:${selected.id}` : shop.category ? `category:${shop.category}` : "page:products";
  const category = page === "products" ? selected?.category ?? (shop.category || null) : null;

  useEffect(() => {
    const now: Visit = { t: Date.now(), key: visit, category };
    const signal = visitSignal(seen.current.visits, now);
    seen.current.visits = [...seen.current.visits, now].slice(-20);
    if (signal) sense(signal);
  }, [visit, category, sense]);

  useEffect(() => {
    let scrolls: InteractionEvent[] = [];
    const onScroll = () => {
      const t = Date.now();
      scrolls = [...scrolls.filter((s) => t - s.t <= 4000), { type: "scroll" as const, t, y: window.scrollY }];
      if (summarizeFriction(scrolls, "coarse").thrash === 0) return;
      scrolls = [];
      sense({ t, kind: "thrash", category: seen.current.visits.at(-1)?.category ?? null });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sense]);

  const reply = (yes: boolean) => {
    if (!offer) return;
    commit(answer(state, yes, offer.category));
    const about = offer.category ?? "categories";
    log(yes
      ? { trigger: `hesitation_confirmed (${about})`, change: `Showed ${offer.category ? "quick picks" : "category shortcuts"}; will ask a little sooner` }
      : { trigger: `hesitation_rejected (${about})`, change: "Dismissed; will ask less often" });
    setOffer(yes ? { ...offer, stage: "picks" } : null);
  };

  // A question already open waits out of sight while the user is on the cart.
  return { state, offer: page === "cart" ? null : offer, reply, close: () => setOffer(null) };
}
