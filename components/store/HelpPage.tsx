import { useState } from "react";
import type { PortalContext } from "@/components/portal/context";
import { PolicyCard } from "@/components/portal/PolicyCard";
import { POLICY } from "@/components/portal/strings";
import { hasKannada } from "@/lib/attune-ui/preferences/rules";
import { PAGE_TEXT } from "./text";

/** Reading (policy dwell) and typing (language signals) in one place. */
export function HelpPage({ ctx }: { ctx: PortalContext }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const large = ctx.preferences.textScale === "large" ? "text-lg leading-8" : "text-sm";

  return (
    <div className="grid items-start gap-3 md:grid-cols-2">
      <div className="space-y-3">
        <PolicyCard ctx={ctx} />
        <section data-part="detail" className={`space-y-1 p-3 ${large}`}>
          <h2 className="font-bold">{t.faq}</h2>
          {POLICY[ctx.preferences.locale].map((section) => (
            <details key={section.heading}>
              <summary className={`cursor-pointer ${ctx.control}`}>{section.heading}?</summary>
              <p className="pb-2">{section.points.join(" ")}</p>
            </details>
          ))}
        </section>
      </div>
      <form data-part="detail" className="space-y-2 p-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) { setSent(true); setMessage(""); ctx.onGoal?.(); }
        }}>
        <h2 className="font-bold">{t.contactTitle}</h2>
        <label className="block">
          {t.message}
          <textarea rows={4} maxLength={500} value={message} className="mt-1 w-full rounded-lg border p-2"
            onChange={(e) => { setMessage(e.target.value); setSent(false); }}
            onBlur={(e) => { if (hasKannada(e.target.value)) ctx.onSignal({ kannada: 1 }); }} />
        </label>
        <button type="submit" data-part="primary" disabled={!message.trim()}
          className={`px-4 disabled:opacity-50 ${ctx.control}`}>{t.send}</button>
        {sent && <p role="status" className="text-green-800">{t.sent}</p>}
      </form>
    </div>
  );
}
