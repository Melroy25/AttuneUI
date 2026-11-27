import type { CloudRecord } from "@/lib/demo/cloud";
import { FEATURES, familiarity, total, type Behaviour, type NavTally } from "@/lib/demo/behaviour";
import { Box, Table } from "./ui";

const percent = (v: number) => `${Math.round(v * 100)}%`;
const nav = (t: NavTally) => (t.count === 0 ? "—"
  : `${t.count} moves, ${percent(t.back / t.count)} bounced back, ${(t.ms / t.count / 1000).toFixed(1)} s before each`);
const busiest = (b: Behaviour) => FEATURES.filter((f) => b.features[f].uses > 0)
  .sort((x, y) => b.features[y].uses - b.features[x].uses).slice(0, 3)
  .map((f) => `${f} ${b.features[f].uses}`).join(", ") || "—";
const sum = (b: Behaviour, k: "back") => FEATURES.reduce((s, f) => s + b.features[f][k], 0);

export function BehaviourBox({ users }: { users: CloudRecord[] }) {
  const people = users.map((u) => ({ id: u.id, b: u.state.behaviour, familiar: percent(familiarity(u.state.behaviour)) }));
  if (people.length > 1) {
    const mean = people.reduce((s, p) => s + familiarity(p.b), 0) / people.length;
    people.push({ id: "All users", b: total(people.map((p) => p.b)), familiar: percent(mean) });
  }
  const rows = (cells: (p: (typeof people)[number]) => (string | number)[]) => people.map((p) => [p.id, ...cells(p)]);
  const speed = (b: Behaviour) =>
    (b.reading.activeMs ? `${Math.round(b.reading.scrollPx / (b.reading.activeMs / 1000))} px/s` : "—");

  return (
    <Box title="Behaviour: muscle memory and reading"
      info="Fixed rules watching each user. Before-and-after figures describe what happened; they are not a controlled test.">
      <h3 className="text-sm font-semibold">Detected patterns</h3>
      <Table head={["User", "Familiarity", "Cued now", "Used most", "Searches (repeated)", "Bounced back", "Paragraph revisits", "Scroll reversals", "Reading time, scroll speed"]}
        rows={rows(({ b, familiar }) => [
          familiar, FEATURES.filter((f) => b.cues[f]).join(", ") || "—", busiest(b), `${b.searches} (${b.repeatedSearches})`,
          sum(b, "back"), b.reading.revisits, b.reading.reversals, `${Math.round(b.reading.activeMs / 1000)} s, ${speed(b)}`,
        ])} />
      <h3 className="text-sm font-semibold">Applied adaptations</h3>
      <Table head={["User", "Cues faded", "Articles pinned", "Unpinned", "Finished", "Inline explanations"]}
        rows={rows(({ b }) => [b.faded, b.reading.pins, b.reading.unpins, b.reading.finished, b.reading.helpers])} />
      <h3 className="text-sm font-semibold">Before and after</h3>
      <Table head={["User", "Moves without a cue", "Moves with a cue", "Moves after the cue faded", "Revisits to helped paragraphs: before → after"]}
        rows={rows(({ b }) => [
          nav(b.nav.plain), nav(b.nav.guided), nav(b.nav.faded),
          b.reading.helpers ? `${b.reading.helpedBefore} → ${b.reading.helpedAfter}` : "—",
        ])} />
    </Box>
  );
}
