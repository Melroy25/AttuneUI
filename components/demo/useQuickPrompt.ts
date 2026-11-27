"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Change } from "@/lib/demo/activity";
import { promptFor, type Prompt } from "@/lib/demo/quick";
import { CONTROLS } from "./useComfort";

/** A click that does nothing on a marked area offers the shortcut that fits that area. */
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
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // detail > 1 is the second half of a double click, already answered by the first.
      if (e.detail > 1 || target.closest(CONTROLS)) return;
      const context = target.closest("[data-dead-context]")?.getAttribute("data-dead-context") ?? "";
      const found = promptFor(context, noCartQuestion.current ? null : now.current.latestInCart);
      if (!found) return;
      setPrompt(found.prompt);
      now.current.log({
        trigger: found.product ? `Dead click on the ${found.product.name} card` : "Dead click on the delivery location",
        change: found.latest ? `Showed "Are you searching based on ${found.latest.name}?"`
          : found.product ? `Showed "Is this what you were searching for?" for ${found.product.name}, with its guide link`
          : "Showed the shortcut \"Change delivery location?\"",
      });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef]);

  /** From the cart question to the card that was clicked. */
  const aboutClicked = () => {
    if (prompt?.kind !== "cart") return;
    noCartQuestion.current = true;
    setPrompt({ kind: "product", id: prompt.id });
    log({ trigger: "Turned down the cart question", change: "Showed \"Is this what you were searching for?\"" });
  };
  const dismiss = () => {
    if (prompt?.kind === "cart") noCartQuestion.current = true;
    setPrompt(null);
  };

  return { prompt, setPrompt, aboutClicked, dismiss };
}
