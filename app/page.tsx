import Link from "next/link";

const PAGES = [
  { href: "/demo", icon: "🛍️", title: "User", note: "Sign in and shop at VeroxaKart" },
  { href: "/admin", icon: "📊", title: "Admin", note: "All users, and each user's live X-Ray" },
];

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center bg-blue-50 p-4 text-slate-900">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-extrabold">AttuneUI</h1>
          <p className="text-slate-600">A store that notices where people struggle and adapts. Team Veroxa.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PAGES.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="block h-full rounded-2xl bg-white p-6 text-center shadow hover:shadow-lg">
                <span aria-hidden className="text-4xl">{p.icon}</span>
                <strong className="mt-2 block text-xl">{p.title}</strong>
                <span className="block text-sm text-slate-600">{p.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
