"use client";

import { useRef, useState } from "react";
import type { Dataset } from "@/lib/eval/dataset";
import { filterParticipants } from "@/lib/eval/inspect";
import { Timeline } from "./Timeline";
import { Card, Pills, field } from "./ui";

const SHOWN = 200;

export function Participants({ dataset }: { dataset: Dataset }) {
  const [query, setQuery] = useState("");
  const [arm, setArm] = useState("All");
  const [pointer, setPointer] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const journey = useRef<HTMLDivElement>(null);
  const { participants, events } = dataset.log;
  const matches = filterParticipants(participants, { query, arm, pointer });
  const person = participants.find((p) => p.id === selected);

  const open = (id: string) => {
    setSelected(id);
    // On narrow screens the timeline sits below the list.
    requestAnimationFrame(() => journey.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card title="Participants" note={`${matches.length} of ${participants.length} match (all phases in this file).`}>
        <input type="search" aria-label="Search participant ID" placeholder="Search participant_id" className={field}
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <Pills label="Arm" options={["All", "A", "B", "C"]} value={arm} onChange={setArm} />
        <Pills label="Device" options={["All", "touch", "mouse"]} value={pointer} onChange={setPointer} />
        <ul className="max-h-80 space-y-1 overflow-y-auto lg:max-h-[32rem]">
          {matches.slice(0, SHOWN).map((p) => (
            <li key={p.id}>
              <button type="button" aria-pressed={selected === p.id} onClick={() => open(p.id)}
                className="w-full rounded-lg border border-slate-200 p-2 text-left text-sm aria-pressed:border-blue-700 aria-pressed:bg-blue-50">
                <span className="block break-all font-mono font-semibold">{p.id}</span>
                <span className="text-slate-600">Arm {p.arm} · {p.pointer} · {p.phase}</span>
              </button>
            </li>
          ))}
        </ul>
        {matches.length > SHOWN && <p className="text-sm">Showing the first {SHOWN}. Search to narrow.</p>}
        {matches.length === 0 && <p className="text-sm">No participant matches.</p>}
      </Card>
      <div ref={journey} className="min-w-0 scroll-mt-3">
        {person ? <Timeline participant={person} events={events} />
          : <p className="rounded-xl bg-white p-4 text-sm shadow-sm">Select a participant to see Block 1 → decision → Block 2.</p>}
      </div>
    </div>
  );
}
