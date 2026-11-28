"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { PAGE_TEXT } from "@/components/store/text";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Activity, Change } from "@/lib/demo/activity";
import { deliberate, nextBurst, type Burst, type Scales } from "@/lib/demo/textSize";
import { ORDERS_TEXT, zoneTaps, zoneTag, type Zone } from "@/lib/demo/zones";

const SUMMARY: Record<Locale, string> = {
  en: "Refunds within 7 days of delivery; delayed orders qualify earlier. UPI takes 1–2 working days, cards 5–7.",
  kn: "ತಲುಪಿದ 7 ದಿನಗಳೊಳಗೆ ಮರುಪಾವತಿ; ವಿಳಂಬವಾದ ಆರ್ಡರ್‌ಗಳು ಮೊದಲೇ ಅರ್ಹ. UPI 1–2, ಕಾರ್ಡ್ 5–7 ಕೆಲಸದ ದಿನಗಳು.",
};

export function useZones(
  activity: Activity[], log: (change: Change) => void,
  text: { scales: Scales; drop: (prefix: string) => void },
  consent: { approved: boolean; request: (target: string, apply: () => void) => void },
) {
  const taps = zoneTaps(activity);
  const big = (zone: Zone) => consent.approved && taps[zone].length > 0;
  const ordersText = Object.keys(text.scales).some((id) => id.startsWith(ORDERS_TEXT));
  return {
    big,
    tapped: (zone: Zone) => {
      if (big(zone)) return;
      consent.request(`the ${zone} section`, () => log({
        trigger: `Clicked the ${zone} section 4 times in 2.5 s`,
        change: zoneTag("Enlarged the section and showed a summary", "tap", zone),
      }));
    },
    canUndoOrders: taps["orders:policy"].length > 0 || ordersText,
    /** The Orders page only: its policy card and its order texts. */
    undoOrders: () => {
      text.drop(ORDERS_TEXT);
      log({ trigger: "Pressed Undo on the Orders page", change: zoneTag("Orders page back to its normal text", "undo", "orders:policy") });
    },
  };
}

export const ZonesContext = createContext<ReturnType<typeof useZones> | null>(null);

/** Outside the demo store there is no provider, so this changes nothing. */
export function AutoZone({ zone, locale, children }: { zone: Zone; locale: Locale; children: ReactNode }) {
  const z = useContext(ZonesContext);
  const burst = useRef<Burst | null>(null);
  if (!z) return children;
  const big = z.big(zone);
  return (
    <div className="space-y-2" onClickCapture={(e) => {
      // Keyboard clicks and controls that do something never count; opening a heading does.
      if (e.detail === 0 || (e.target as Element).closest("button,a,input,select,textarea")) return;
      burst.current = nextBurst(burst.current, zone, performance.now());
      if (!deliberate(burst.current)) return;
      burst.current = null;
      z.tapped(zone);
    }}>
      {big && <p className="rounded-lg border-l-4 border-sky-500 bg-sky-50 p-3 text-lg font-semibold text-slate-900">{SUMMARY[locale]}</p>}
      <div className={big ? "[&_*]:text-lg! [&_*]:leading-8!" : ""}>{children}</div>
    </div>
  );
}

export function OrdersUndo({ locale, className }: { locale: Locale; className: string }) {
  const z = useContext(ZonesContext);
  if (!z) return null;
  return (
    <button type="button" className={`${className} disabled:opacity-40`} disabled={!z.canUndoOrders} onClick={z.undoOrders}>
      ↩︎ {PAGE_TEXT[locale].undoAction}
    </button>
  );
}
