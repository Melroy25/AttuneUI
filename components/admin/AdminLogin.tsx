"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

export function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-dvh bg-slate-100 p-4 text-slate-900">
      <form className="mx-auto mt-10 max-w-sm space-y-3 rounded-xl bg-white p-5 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/admin", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: data.get("user"), password: data.get("password") }),
            });
            if (response.ok) router.refresh();
            else setError(response.status === 401 ? "Wrong username or password." : `Sign-in failed (${response.status}).`);
          } catch {
            setError("Cannot reach the server.");
          } finally {
            setBusy(false);
          }
        }}>
        <h1 className="text-xl font-bold">VeroxaKart admin</h1>
        <label className="block text-sm font-semibold">Username
          <input name="user" autoComplete="username" required maxLength={100} className={field} />
        </label>
        <label className="block text-sm font-semibold">Password
          <input name="password" type="password" autoComplete="current-password" required maxLength={200} className={field} />
        </label>
        <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-blue-700 font-semibold text-white disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      </form>
    </main>
  );
}
