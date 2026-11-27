"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Change } from "@/lib/demo/activity";
import { newTracker, scrolled } from "@/lib/demo/articleReading";
import { RULES } from "@/lib/demo/comfort";
import { CONFUSION, confused } from "@/lib/demo/confusion";
import { promptFor, type Prompt } from "@/lib/demo/quick";
import { CONTROLS, measure } from "./useComfort";

/**
 * "Deliver to" answers one click. A product card answers only confusion: 4 dead taps in 3 s, or
 * repeated taps while scrolling up and down. Taps on its text belong to the text-size rule.
 */
export function useQuickPrompt(
  rootRef: RefObject<HTMLElement | null>, latestInCart: string | null, log: (change: Change) => void,
) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const noCartQuestion = useRef(false); // dismissed once: not asked again on this visit
  const now = useRef({ latestInCart, log });
  useEffect(() => { now.current = { latestInCart, log }; });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const taps = new Map<string, number[]>();
    let tracker = newTracker();
    const onScroll = () => { tracker = scrolled(tracker, Date.now(), window.scrollY); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(CONTROLS)) return;
      const context = target.closest("[data-dead-context]")?.getAttribute("data-dead-context") ?? "";
      const found = promptFor(context, noCartQuestion.current ? null : now.current.latestInCart);
      if (!found) return;
      if (!found.product) return show(found, "Dead click on the delivery location");
      // Beside a control is a missed tap; on its text, a text-size click. Other rules answer those.
      if (target.closest("[data-text-id]") || measure(root, e).distance <= RULES.halo) return;
      const t = Date.now();
      const mine = [...(taps.get(context) ?? []).filter((x) => t - x <= CONFUSION.slowMs), t];
      taps.set(context, mine);
      const why = confused(mine, tracker.reversals, t);
      if (!why) return;
      taps.delete(context);
      show(found, why === "rapid"
        ? `${mine.length} dead taps in 3 s on the ${found.product.name} card`
        : `Scrolled up and down and tapped the ${found.product.name} card ${mine.length}×`);
    };
    const show = (found: NonNullable<ReturnType<typeof promptFor>>, trigger: string) => {
      setPrompt(found.prompt);
      now.current.log({
        trigger,
        change: found.latest ? `Help: "Are you searching based on ${found.latest.name}?"`
          : found.product ? `Help card for ${found.product.name}, with its guide link`
          : "Showed the shortcut \"Change delivery location?\"",
      });
    };
    root.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [rootRef]);

  /** From the cart question to the card that was clicked. */
  const aboutClicked = () => {
    if (prompt?.kind !== "cart") return;
    noCartQuestion.current = true;
    setPrompt({ kind: "product", id: prompt.id });
    log({ trigger: "Turned down the cart question", change: "Showed the help card for the clicked item" });
  };
  const dismiss = () => {
    if (prompt?.kind === "cart") noCartQuestion.current = true;
    setPrompt(null);
  };

  return { prompt, setPrompt, aboutClicked, dismiss };
}
