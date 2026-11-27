"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Change } from "@/lib/demo/activity";
import { promptFor, type Prompt } from "@/lib/demo/quick";
import { CONTROLS } from "./useComfort";

/** A click that does nothing on a marked area offers the shortcut that fits that area. */
export function useQuickPrompt(rootRef: RefObject<HTMLElement | null>, log: (change: Change) => void) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const record = useRef(log);
  useEffect(() => { record.current = log; });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // detail > 1 is the second half of a double click, already answered by the first.
      if (e.detail > 1 || target.closest(CONTROLS)) return;
      const found = promptFor(target.closest("[data-dead-context]")?.getAttribute("data-dead-context") ?? "");
      if (!found) return;
      setPrompt(found.prompt);
      record.current(found.product ? {
        trigger: `Dead click on the ${found.product.name} card`,
        change: "Showed a quick summary: title, price, key spec and Add to cart",
      } : { trigger: "Dead click on the delivery location", change: "Showed the shortcut \"Change delivery location?\"" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef]);

  return { prompt, setPrompt };
}
