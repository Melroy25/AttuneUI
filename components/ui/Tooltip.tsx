"use client";

import { useEffect, useId, useRef } from "react";
import { placeTooltip } from "@/lib/demo/tooltip";

const DELAY_MS = 175; // a pointer passing by shows nothing

/**
 * One pill for every element with data-tip: no wrappers, so layouts and hover sensing are untouched.
 * A manual popover sits above open menus without closing them; it never takes the pointer.
 */
export function TooltipLayer() {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tip = ref.current;
    if (!tip?.showPopover) return; // old browser: no tooltips, labels still work
    let target: Element | null = null;
    let timer: ReturnType<typeof setTimeout>;

    /** Hides the pill but remembers the control, so it does not come straight back. */
    const dismiss = () => {
      clearTimeout(timer);
      target?.removeAttribute("aria-describedby");
      if (tip.matches(":popover-open")) tip.hidePopover();
    };
    const show = (el: Element) => {
      if (!el.isConnected) return;
      const text = el.getAttribute("data-tip") ?? "";
      tip.textContent = text;
      tip.showPopover();
      const at = placeTooltip(el.getBoundingClientRect(), tip.getBoundingClientRect(), document.documentElement.clientWidth);
      tip.style.top = `${at.top}px`;
      tip.style.left = `${at.left}px`;
      // Not when it would only repeat the control's name to a screen reader.
      if (el.getAttribute("aria-label") !== text) el.setAttribute("aria-describedby", id);
    };
    const aim = (el: Element | null) => {
      if (el === target) return;
      dismiss();
      target = el;
      if (el) timer = setTimeout(() => show(el), DELAY_MS);
    };
    const tipped = (node: EventTarget | null) => (node instanceof Element ? node.closest("[data-tip]") : null);

    const over = (e: PointerEvent) => { if (e.pointerType === "mouse") aim(tipped(e.target)); };
    const out = (e: PointerEvent) => { if (!e.relatedTarget) aim(null); }; // left the window
    const focus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) aim(tipped(e.target));
    };
    const blur = () => aim(null);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };

    const listeners = [
      ["pointerover", over], ["pointerout", out], ["pointerdown", dismiss], ["focusin", focus],
      ["focusout", blur], ["keydown", key], ["scroll", dismiss],
    ] as [string, EventListener][];
    for (const [type, fn] of listeners) document.addEventListener(type, fn, { capture: true, passive: true });
    return () => {
      dismiss();
      for (const [type, fn] of listeners) document.removeEventListener(type, fn, { capture: true });
    };
  }, [id]);

  return (
    <div ref={ref} id={id} role="tooltip" popover="manual"
      className="pointer-events-none fixed inset-auto m-0 w-max max-w-56 rounded-full border-0 bg-slate-900 px-2.5 py-1 text-center text-xs font-medium text-white shadow-lg" />
  );
}
