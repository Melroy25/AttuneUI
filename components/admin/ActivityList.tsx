import type { Activity } from "@/lib/demo/activity";

export function ActivityList({ entries }: { entries: (Activity & { name?: string })[] }) {
  if (entries.length === 0) return <p className="text-sm text-slate-600">Nothing yet.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="rounded-lg bg-slate-100 p-2">
          <p className="text-xs text-slate-600">
            <time dateTime={new Date(e.at).toISOString()}>{new Date(e.at).toLocaleTimeString()}</time>
            {e.name && <> · <strong>{e.name}</strong></>}
          </p>
          <p><span className="font-semibold">Problem:</span> {e.trigger}</p>
          <p><span className="font-semibold">Change:</span> {e.change}</p>
        </li>
      ))}
    </ol>
  );
}
