import type { PortalContext } from "@/components/portal/context";
import type { Shortcut } from "@/lib/bandit/shortcutBandit";
import { similarTo } from "@/lib/demo/habits";
import { PAGE_TEXT } from "./text";
import type { Shop } from "./useShop";

export function WishlistButton({ ctx, id, compact }: { ctx: PortalContext; id: string; compact?: boolean }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const saved = ctx.habits?.habits.wished.includes(id) ?? false;
  return (
    <button type="button" aria-pressed={saved} aria-label={`${t.wishlist}: ${id}`} onClick={() => {
        if (compact) ctx.shortcuts?.use("wishlist"); // only the promoted copy earns a reward
        ctx.habits?.wish(id);
      }}
      className={`flex-none rounded-full border px-3 text-xs font-semibold ${ctx.control} ${compact ? "" : "mt-2"}`}>
      <span aria-hidden>{saved ? "♥" : "♡"}</span>
      <span className={compact ? "hidden sm:inline" : ""}> {t.wishlist}</span>
    </button>
  );
}

export function DismissShortcut({ ctx, kind, label }: { ctx: PortalContext; kind: Shortcut; label?: boolean }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  return (
    <button type="button" aria-label={t.hideShortcut} title={t.hideShortcut}
      className={`flex-none rounded-full border bg-white px-3 text-xs text-slate-700 ${ctx.control}`}
      onClick={() => ctx.shortcuts?.dismiss(kind, "Pressed ✕")}>
      ✕{label && ` ${t.hideShortcut}: ${t.wishlist}`}
    </button>
  );
}

export function SimilarCards({ ctx, shop, onPick }: { ctx: PortalContext; shop: Shop; onPick: () => void }) {
  const t = PAGE_TEXT[ctx.preferences.locale];
  const items = ctx.habits && ctx.shortcuts?.on("similar") ? similarTo(ctx.habits.habits, 1).slice(0, 3) : [];
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.map((p) => (
        <button key={p.id} type="button"
          className={`flex flex-none items-center gap-2 rounded-xl border bg-white px-3 py-1 text-xs font-semibold ${ctx.control}`}
          onClick={() => {
            ctx.shortcuts?.use("similar");
            shop.setQuery(""); shop.setPreset(""); shop.setSelected(null); shop.setCategory(p.category);
            onPick();
          }}>
          <span aria-hidden className="text-xl">{p.icon}</span>
          {t.similarTo}: {p.name}
        </button>
      ))}
      <DismissShortcut ctx={ctx} kind="similar" />
    </div>
  );
}
