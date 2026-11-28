"use client";

import { useState, type ReactNode } from "react";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Activity, Change } from "@/lib/demo/activity";
import { approved, consentTag } from "@/lib/demo/consent";

const WORDS = {
  en: { ask: "Do you want to keep changes?", yes: "Yes", no: "No" },
  kn: { ask: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಬೇಕೇ?", yes: "ಹೌದು", no: "ಬೇಡ" },
};

export function useConsent(activity: Activity[], log: (change: Change) => void) {
  const [pending, setPending] = useState<{ target: string; apply: () => void } | null>(null);
  const ok = approved(activity);
  return {
    approved: ok,
    pending,
    /** Applies at once when already approved; otherwise asks first. One question at a time. */
    request: (target: string, apply: () => void) => {
      if (ok) {
        log({ trigger: `Repeated clicks on ${target}`, change: `Applied automatically to ${target}: approved earlier` });
        return apply();
      }
      if (pending) return;
      setPending({ target, apply });
      log({ trigger: `Repeated clicks on ${target}`, change: `Asked "Do you want to keep changes?" for ${target}` });
    },
    answer: (yes: boolean) => {
      if (!pending) return;
      log({
        trigger: `Said ${yes ? "yes" : "no"} to keeping changes`,
        change: consentTag(yes ? "Saved the approval for matching changes" : `Left ${pending.target} as it was`, yes),
      });
      if (yes) pending.apply();
      setPending(null);
    },
  };
}

/** Lives in the one floating slot, so it never stacks on another prompt. */
export function ConsentPrompt({ locale, consent, fallback }: {
  locale: Locale;
  consent: ReturnType<typeof useConsent>;
  fallback: ReactNode;
}) {
  if (!consent.pending) return fallback;
  const t = WORDS[locale];
  return (
    <section aria-live="polite" className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500 bg-amber-50 p-3 text-sm shadow-xl">
      <p className="w-full font-semibold">{t.ask}</p>
      <button type="button" className="min-h-11 flex-1 rounded-lg bg-blue-700 px-4 font-semibold text-white"
        onClick={() => consent.answer(true)}>{t.yes}</button>
      <button type="button" className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-semibold"
        onClick={() => consent.answer(false)}>{t.no}</button>
    </section>
  );
}
