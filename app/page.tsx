import Link from "next/link";

const PAGES = [
  { href: "/demo", title: "Live testbed", note: "Adaptive order portal with X-Ray view" },
  { href: "/study", title: "3-arm study", note: "Anonymous usability study; needs an invite link" },
  { href: "/eval", title: "Judge inspector", note: "Causal metrics, off-policy estimates and participant timelines" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">AttuneUI</h1>
      <p>
        Team Veroxa. An interface that senses friction, adapts between block boundaries using a
        contextual bandit over validated layouts, and is built to be tested against static and
        random-change controls. No results are reported yet.
      </p>
      <ul className="space-y-2">
        {PAGES.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="block rounded border p-3 hover:bg-slate-50">
              <strong>{p.title}</strong>
              <span className="block text-sm text-gray-600">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
