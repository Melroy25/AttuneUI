import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/attune-ui/preferences/rules";
import type { Page } from "./text";

const HOVER_MS = 600; // a pointer resting this long counts as looking for help

const TEXT = {
  en: {
    about: "About", help: "Help", policy: "Consumer policy", mail: "Mail us", office: "Registered office address",
    contact: "Contact Us", support: "Customer Support", returns: "Cancellation & Returns", faq: "FAQ",
    map: "View on map", sketch: "Drawing only, not a real location",
  },
  kn: {
    about: "ನಮ್ಮ ಬಗ್ಗೆ", help: "ಸಹಾಯ", policy: "ಗ್ರಾಹಕ ನೀತಿ", mail: "ನಮಗೆ ಬರೆಯಿರಿ", office: "ನೋಂದಾಯಿತ ಕಚೇರಿ ವಿಳಾಸ",
    contact: "ಸಂಪರ್ಕಿಸಿ", support: "ಗ್ರಾಹಕ ಬೆಂಬಲ", returns: "ರದ್ದತಿ ಮತ್ತು ಹಿಂತಿರುಗಿಸುವಿಕೆ", faq: "ಸಾಮಾನ್ಯ ಪ್ರಶ್ನೆಗಳು",
    map: "ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ", sketch: "ಚಿತ್ರ ಮಾತ್ರ, ನಿಜವಾದ ಸ್ಥಳವಲ್ಲ",
  },
};
const ADDRESS = ["VeroxaKart (demo store)", "1 Example Road, Bengaluru 560001", "Karnataka, India"];
const SOCIAL = [["f", "Facebook"], ["X", "X"], ["▶", "YouTube"], ["◎", "Instagram"]];

/** /demo only. Entries without a page are plain text, so nothing pretends to be a link. */
export function StoreFooter({ locale, onSupport, onSupportHover, onPage }: {
  locale: Locale;
  onSupport: () => void;
  onSupportHover: () => void;
  onPage: (page: Page) => void;
}) {
  const t = TEXT[locale];
  const [map, setMap] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  const link = "min-h-8 text-left hover:underline";
  const go = (page: Page) => { onPage(page); window.scrollTo(0, 0); };
  const support = (label: string) => (
    <button key={label} type="button" className={link}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") timer.current = setTimeout(onSupportHover, HOVER_MS); }}
      onPointerLeave={stop}
      onClick={() => { stop(); onSupport(); go("help"); }}>
      {label}
    </button>
  );
  const to = (label: string, page: Page) =>
    <button key={label} type="button" className={link} onClick={() => go(page)}>{label}</button>;
  const columns = [
    [t.about, [support(t.contact), "About Us", "Careers", "Press", "Corporate Info"]],
    [t.help, [support(t.support), "Payments", "Shipping", to(t.returns, "returns"), to(t.faq, "help")]],
    [t.policy, ["Terms of Use", "Security", "Privacy", "Sitemap", "Grievance Redressal"]],
  ] as const;
  const heading = "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400";

  return (
    <footer className="mx-auto mt-6 grid max-w-6xl gap-6 rounded-xl bg-[#172337] p-5 text-sm text-white sm:grid-cols-3 lg:grid-cols-5">
      {columns.map(([title, items]) => (
        <nav key={title} aria-label={title}>
          <h2 className={heading}>{title}</h2>
          <ul>{items.map((item, i) => <li key={i} className="flex min-h-8 items-center">{item}</li>)}</ul>
        </nav>
      ))}
      <section>
        <h2 className={heading}>{t.mail}</h2>
        <address className="not-italic">{ADDRESS.map((line) => <p key={line}>{line}</p>)}</address>
        <ul className="mt-3 flex gap-2">
          {SOCIAL.map(([glyph, name]) => (
            <li key={name} title={name} aria-label={name} className="grid h-8 w-8 place-items-center rounded-full bg-slate-700">
              <span aria-hidden>{glyph}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className={heading}>{t.office}</h2>
        <address className="not-italic">{ADDRESS.map((line) => <p key={line}>{line}</p>)}</address>
        <button type="button" aria-expanded={map} className="min-h-8 font-semibold text-sky-300 underline"
          onClick={() => setMap(!map)}>
          📍 {t.map}
        </button>
        {map && (
          <figure className="mt-2">
            <div aria-hidden className="grid h-24 place-items-center rounded-lg bg-emerald-100 text-2xl
              bg-[linear-gradient(35deg,transparent_46%,#fff_46%_54%,transparent_54%),linear-gradient(-65deg,transparent_47%,#fff_47%_53%,transparent_53%)]">
              📍
            </div>
            <figcaption className="text-xs text-slate-400">{t.sketch}</figcaption>
          </figure>
        )}
      </section>
    </footer>
  );
}
