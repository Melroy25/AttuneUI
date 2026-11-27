"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_SIGNALS, READ_THRESHOLD_MS, derivePreferences,
  type Locale, type PreferenceSignals, type Preferences,
} from "@/lib/attune-ui/preferences/rules";
import { SURFACES } from "@/lib/attune-ui/surface/catalog";
import { describeChanges } from "@/lib/attune-ui/surface/diff";
import { startCapture, type Capture } from "@/lib/attune-ui/telemetry/capture";
import { modalityOf } from "@/lib/attune-ui/telemetry/context";
import { summarizeFriction } from "@/lib/attune-ui/telemetry/friction";
import type { ArmId, InteractionEvent, Modality } from "@/lib/attune-ui/types";
import { shouldAdapt } from "@/lib/demo/auto";
import { habitsKey } from "@/lib/demo/habits";
import { encodeMemory, memoryKey, parseMemory } from "@/lib/demo/memory";
import { simulatorPrior } from "@/lib/demo/prior";
import {
  GOALS_PER_LESSON, fastForward, finishBlock, goalOutcome, learn, newSession, previewSurface, togglePin, undo,
  type DemoMode, type Outcome,
} from "@/lib/demo/session";
import { UI_COOKIE, encodeUi, type UiState } from "@/lib/demo/uiState";
import type { PortalAction } from "@/lib/study/tasks";

const writeCookie = (value: string, maxAge: number) => {
  document.cookie = `${UI_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
};

export function useDemo(serverUi: UiState, user: string | null) {
  const router = useRouter();
  const [session, setSession] = useState(() => newSession(serverUi.arm));
  const [offlineUi, setOfflineUi] = useState<UiState | null>(null);
  const [mode, setMode] = useState<DemoMode>("attune");
  const [demoReading, setDemoReading] = useState(true);
  const [changes, setChanges] = useState<string[]>([]);
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [modality, setModality] = useState<Modality>("fine");
  const [portalKey, setPortalKey] = useState(0);
  const [priorPreferences, setPriorPreferences] = useState<Preferences | null>(null);
  const [auto, setAuto] = useState(true);
  const lastAuto = useRef(-Infinity);

  const rootRef = useRef<HTMLDivElement>(null);
  const capture = useRef<Capture | null>(null);
  const signals = useRef<PreferenceSignals>({ ...EMPTY_SIGNALS });
  const goals = useRef<Outcome[]>([]);
  const goalStart = useRef(0);
  const store = memoryKey(user);

  // Built up front (and cached), or the first adaptation stalls while the prior is computed.
  useEffect(() => {
    const timer = setTimeout(simulatorPrior, 0);
    return () => clearTimeout(timer);
  }, []);

  // What was learned stays in this browser, one memory per account.
  useEffect(() => {
    try {
      const memory = parseMemory(localStorage.getItem(store));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage exists only after mount
      if (memory) setSession((s) => ({ ...s, ...memory }));
    } catch {
      // storage blocked: this tab starts from the prior
    }
  }, [store]);
  const { models, liveUpdates, simulatedUpdates } = session;
  useEffect(() => {
    if (!models || liveUpdates + simulatedUpdates === 0) return;
    try {
      localStorage.setItem(store, encodeMemory({ models, liveUpdates, simulatedUpdates }));
    } catch {
      // storage full or blocked: learning lasts as long as the tab
    }
  }, [store, models, liveUpdates, simulatedUpdates]);

  const ui = offlineUi ?? serverUi;

  /** HUD refresh. It must not drain: ending a hover each second would hide long hovers. */
  const refresh = useCallback(() => {
    if (!capture.current) return;
    setEvents(capture.current.peek());
    setModality(modalityOf(capture.current.pointer()));
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    capture.current = startCapture(rootRef.current);
    goalStart.current = performance.now();
    const timer = setInterval(refresh, 1000);
    return () => {
      clearInterval(timer);
      capture.current?.stop();
    };
  }, [refresh]);

  /** Server renders the new layout from the cookie; offline we render it here. */
  const publish = (next: UiState) => {
    writeCookie(encodeUi(next), 60 * 60 * 24 * 30);
    if (navigator.onLine) {
      setOfflineUi(null);
      router.refresh();
    } else setOfflineUi(next);
  };

  /** A finished action in the store. After a few, the layout on screen is scored; nothing moves. */
  const onGoal = () => {
    const now = performance.now();
    goals.current.push(goalOutcome(now - goalStart.current));
    goalStart.current = now;
    if (goals.current.length < GOALS_PER_LESSON) return;
    const done = goals.current;
    goals.current = [];
    // peek, not drain: these events are still the context of the next decision.
    const friction = summarizeFriction(capture.current?.peek() ?? [], modalityOf(capture.current?.pointer() ?? "mouse"));
    setSession((s) => learn(s, friction, done, simulatorPrior().models));
  };

  const onAction = (action: PortalAction) => {
    if (action.type !== "filter") onGoal();
  };

  const onSignal = (delta: Partial<PreferenceSignals>) => {
    const s = signals.current;
    for (const [key, value] of Object.entries(delta) as [keyof PreferenceSignals, number][]) {
      s[key] = key === "longestReadMs" ? Math.max(s[key], value) : s[key] + value;
    }
  };

  const derive = () =>
    derivePreferences(ui.preferences, signals.current, READ_THRESHOLD_MS[demoReading ? "demo" : "normal"]);

  /** A decision from what was just sensed. Automatic ones keep the page, tasks and filters. */
  const adapt = (automatic: boolean) => {
    const blockEvents = capture.current?.drain() ?? [];
    const next = finishBlock(session, {
      mode,
      events: blockEvents,
      outcomes: goals.current,
      pointer: capture.current?.pointer() ?? "mouse",
      viewportWidth: window.innerWidth,
      seed: 2026 + session.blocks,
      prior: simulatorPrior(),
      now: () => performance.now(),
    });
    const derived = session.pinned ? { preferences: ui.preferences, reasons: [] } : derive();
    // A boundary that changes nothing must not discard what Undo would restore.
    if (next.rendered !== session.rendered || derived.reasons.length > 0) setPriorPreferences(ui.preferences);
    // A preference-only change is the "last change": Undo must not also revert an older layout.
    const previous = next.rendered === session.rendered && derived.reasons.length > 0 ? null : next.previous;
    setSession({ ...next, previous, log: [...derived.reasons.map((r) => `Preference rule: ${r}`), ...next.log].slice(0, 20) });
    setChanges([...describeChanges(SURFACES[ui.arm], SURFACES[next.rendered]), ...derived.reasons]);
    publish({ arm: next.rendered, preferences: derived.preferences });
    if (automatic) clearBlock();
    else startBlock();
  };

  const clearBlock = () => {
    capture.current?.drain();
    goals.current = [];
    goalStart.current = performance.now();
    signals.current.longestReadMs = 0;
    setEvents([]);
  };

  const startBlock = () => {
    clearBlock();
    setPortalKey((k) => k + 1); // fresh filters and selection for the next block
  };

  // Runs on each one-second refresh of the sensed events.
  useEffect(() => {
    if (!auto || events.length === 0 && signals.current.longestReadMs === 0) return;
    const now = performance.now();
    if (shouldAdapt(summarizeFriction(events, modality), now - lastAuto.current)) {
      lastAuto.current = now;
      adapt(true);
      return;
    }
    // Preference rules need no struggle: apply them as soon as their evidence is there.
    const derived = derive();
    if (session.pinned || derived.reasons.length === 0) return;
    setPriorPreferences(ui.preferences);
    setSession((s) => ({ ...s, previous: null, log: [...derived.reasons.map((r) => `Preference rule: ${r}`), ...s.log].slice(0, 20) }));
    setChanges(derived.reasons);
    publish({ arm: ui.arm, preferences: derived.preferences });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the closure of this render is the current one
  }, [events]);

  const preview = (arm: ArmId) => {
    if (arm !== ui.arm) setPriorPreferences(ui.preferences);
    setSession((s) => previewSurface(s, arm));
    setChanges(describeChanges(SURFACES[ui.arm], SURFACES[arm]));
    publish({ arm, preferences: ui.preferences });
    startBlock();
  };

  const undoLast = () => {
    const next = undo(session);
    const preferences = priorPreferences ?? ui.preferences;
    // Forget the evidence, or the same rule would fire again at the next boundary.
    signals.current = { ...EMPTY_SIGNALS };
    // Otherwise the next automatic change would simply redo what was undone.
    setAuto(false);
    setSession({
      ...next,
      overrides: { ...next.overrides, undo: next.overrides.undo + 1 },
      log: ["Automatic adapting paused after Undo", ...next.log].slice(0, 20),
    });
    setPriorPreferences(null);
    setChanges([]);
    publish({ arm: next.rendered, preferences });
  };

  const chooseLocale = (locale: Locale) => {
    onSignal(locale === "kn" ? { kannada: 1 } : { english: 1 });
    // An explicit choice applies at once and outranks the rule.
    if (locale === "en") signals.current.kannada = 0;
    setPriorPreferences((p) => p && { ...p, locale }); // Undo must not revert it
    publish({ arm: ui.arm, preferences: { ...ui.preferences, locale } });
  };

  const reset = () => {
    writeCookie("", 0);
    try {
      localStorage.removeItem(store);
      localStorage.removeItem(habitsKey(user));
    } catch {
      // nothing was saved
    }
    window.location.reload();
  };

  return {
    rootRef, session, ui, mode, setMode, demoReading, setDemoReading, changes, events, modality,
    portalKey, canUndo: session.previous !== null || priorPreferences !== null,
    offline: offlineUi !== null, onAction, onGoal, onSignal, onView: (v: string) => capture.current?.view(v),
    endBlock: () => adapt(false), preview, undoLast, chooseLocale, reset, auto, setAuto,
    togglePin: () => setSession(togglePin),
    forward: (n: number) => setSession((s) => fastForward(s, n, simulatorPrior().models)),
  };
}
