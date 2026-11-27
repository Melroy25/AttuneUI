"use client";

const ID = "attune-settings";
const item =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent";

/** Native popover: Escape and outside taps close it. */
export function SettingsMenu({ canUndo, pinned, hud, onUndo, onPin, onHud, onReset, user }: {
  canUndo: boolean;
  pinned: boolean;
  hud: boolean;
  onUndo: () => void;
  onPin: () => void;
  onHud: () => void;
  onReset: () => void;
  user: string | null;
}) {
  const close = { popoverTarget: ID, popoverTargetAction: "hide" } as const;
  return (
    <>
      <button type="button" aria-label="Settings" popoverTarget={ID}
        className="grid h-11 w-11 place-items-center bg-white/15 text-2xl leading-none hover:bg-white/25"
        onClick={(e) => {
          // Runs before the popover opens, so it appears under the gear wherever that is.
          const gear = e.currentTarget.getBoundingClientRect();
          const menu = document.getElementById(ID);
          if (!menu) return;
          menu.style.top = `${gear.bottom + 8}px`;
          menu.style.right = `${Math.max(document.documentElement.clientWidth - gear.right, 8)}px`;
        }}>
        ⚙︎
      </button>
      <div id={ID} popover="auto" lang="en"
        className="fixed inset-auto m-0 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl">
        <button type="button" {...close} className={item} disabled={!canUndo} onClick={onUndo}>
          <span>Revert Last Change (Undo)</span><span aria-hidden>↩︎</span>
        </button>
        <button type="button" {...close} className={item} aria-pressed={pinned} onClick={onPin}>
          <span>Lock / Pin Current Layout</span><span className="text-xs font-semibold">{pinned ? "ON" : "OFF"}</span>
        </button>
        <button type="button" {...close} className={item} onClick={onReset}>
          <span>Reset Session</span><span aria-hidden>⟲</span>
        </button>
        <button type="button" {...close} className={item} aria-pressed={hud} onClick={onHud}>
          <span>X-Ray HUD</span><span className="text-xs font-semibold">{hud ? "ON" : "OFF"}</span>
        </button>
        {user && (
          <button type="button" className={`${item} border-t border-slate-200`}
            onClick={async () => { await fetch("/api/user", { method: "DELETE" }); window.location.reload(); }}>
            <span>Sign out ({user})</span><span aria-hidden>⎋</span>
          </button>
        )}
      </div>
    </>
  );
}
