"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { Page } from "@/components/store/text";
import type { Shop } from "@/components/store/useShop";
import { parseActivity, type Activity, type Change } from "@/lib/demo/activity";
import { newTracker, scrolled } from "@/lib/demo/articleReading";
import { CATALOG } from "@/lib/demo/catalog";
import { mergeActivity } from "@/lib/demo/cloud";
import {
  DEAD_RULE, TABS_RULE, excessiveScroll, rapidTabs, replay, tagged, within, type ExtraEvent,
} from "@/lib/demo/extras";
import { guestId } from "./cloudCache";
import { CONTROLS } from "./useComfort";

export type Ask = { kind: "search" | "scroll"; yes: boolean } | { kind: "quick"; id: string };

const SAVED = 200; // the most the server returns
const FLASH_MS = 1500;

export function useExtras(
  user: string | null, activity: Activity[], log: (change: Change) => void, page: Page, shop: Shop,
  setPage: (page: Page) => void,
) {
  const [remote, setRemote] = useState<Activity[]>([]);
  // shortcut: replayed from the newest 500 local + 200 saved entries; add a state document if older ones must count.
  const state = replay(mergeActivity(activity, remote));
  const [ask, setAsk] = useState<Ask | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const asked = useRef(new Set<string>()); // each question once per visit
  const switches = useRef<number[]>([]);
  const lastPage = useRef(page);
  const now = useRef({ ask, quick: state.quick, log });
  useEffect(() => { now.current = { ask, quick: state.quick, log }; });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(`/api/demo-user?id=${user ?? guestId()}&activity=${SAVED}`,
          { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!response.ok) return;
        setRemote(parseActivity((await response.json()).activity, SAVED) ?? []);
      } catch {
        // offline or storage blocked: this browser's log is enough
      }
    })();
  }, [user]);

  const offer = (key: string, next: Ask, trigger: string, change: string) => {
    if (now.current.ask || asked.current.has(key)) return;
    asked.current.add(key);
    now.current.ask = next;
    setAsk(next);
    now.current.log({ trigger, change });
  };
  const switched = () => {
    switches.current = within(switches.current, Date.now(), TABS_RULE.ms);
    if (!rapidTabs(switches.current)) return;
    offer("search", { kind: "search", yes: false }, `Switched tabs ${switches.current.length}× in 6 s`,
      "Asked \"Are you searching for shoes or another product?\"");
  };

  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    switched();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- counts arrivals only
  }, [page]);

  useEffect(() => {
    const dead = new Map<string, number[]>();
    const onShown = () => { if (document.visibilityState === "visible") switched(); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Controls do their own job; text belongs to the text-size rule.
      if (target.closest(CONTROLS) || target.closest("[data-text-id]")) return;
      const context = target.closest("[data-dead-context]")?.getAttribute("data-dead-context");
      const product = CATALOG.find((p) => `product:${p.id}` === context);
      if (!product || now.current.quick.includes(product.id)) return;
      const taps = within(dead.get(product.id) ?? [], Date.now(), DEAD_RULE.ms);
      dead.set(product.id, taps);
      if (taps.length < DEAD_RULE.taps) return;
      offer(`quick:${product.id}`, { kind: "quick", id: product.id }, `${taps.length} dead taps on the ${product.name} card`,
        `Offered to put ${product.name} in the quick area`);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onShown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onShown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the latest values through the ref
  }, []);

  useEffect(() => {
    if (page !== "articles") return;
    let tracker = newTracker();
    const onScroll = () => {
      tracker = scrolled(tracker, Date.now(), window.scrollY);
      if (!excessiveScroll(tracker.reversals, Date.now())) return;
      offer("scroll", { kind: "scroll", yes: false }, "Scrolled up and down repeatedly in Articles",
        "Asked whether to suggest other articles");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a fresh tracker per visit to Articles
  }, [page]);

  const record = (event: ExtraEvent, trigger: string, change: string) => log({ trigger, change: tagged(change, event) });
  const close = () => setAsk(null);
  const highlight = (id: string) => {
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), FLASH_MS);
  };
  const nameOf = (id: string) => CATALOG.find((p) => p.id === id)?.name ?? id;

  return {
    ...state, ask, flash, close,
    setPolicy: (on: boolean) => record(on ? "policy:on" : "policy:off",
      on ? "Pressed Increase Font & Summary" : "Pressed Undo on the refund policy",
      on ? "Enlarged the refund policy and showed its summary" : "Refund policy back to normal"),
    answer: (yes: boolean) => {
      if (!ask) return;
      const question = ask.kind === "quick" ? `the quick area offer for ${nameOf(ask.id)}`
        : ask.kind === "search" ? "the product search question" : "the articles question";
      if (ask.kind === "quick" && yes) {
        record(`quick:add:${ask.id}`, `Said yes to ${question}`, `Added ${nameOf(ask.id)} to the quick area`);
        highlight(ask.id);
        return close();
      }
      log({ trigger: `Said ${yes ? "yes" : "no"} to ${question}`, change: yes ? "Showed suggestions" : "Closed it" });
      if (!yes || ask.kind === "quick") return close();
      setAsk({ ...ask, yes: true });
    },
    remove: (id: string) => record(`quick:remove:${id}`, "Pressed Undo in the quick area", `Removed ${nameOf(id)} from the quick area`),
    openProduct: (id: string) => {
      highlight(id);
      shop.setCategory(CATALOG.find((p) => p.id === id)?.category ?? "");
      shop.setQuery(""); shop.setPreset(""); shop.setSelected(id); setPage("products");
      log({ trigger: `Chose ${nameOf(id)} from a suggestion or the quick area`, change: "Opened the product" });
    },
    openArticle: (id: string, title: string) => {
      shop.openArticle(id); setPage("articles"); window.scrollTo(0, 0); close();
      log({ trigger: "Chose a suggested article", change: `Opened "${title}"` });
    },
  };
}

export const ExtrasContext = createContext<ReturnType<typeof useExtras> | null>(null);
