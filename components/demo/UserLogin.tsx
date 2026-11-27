"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

export function UserLogin() {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-dvh bg-blue-50 p-4 text-slate-900">
      <form className="mx-auto mt-8 max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/user", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: data.get("user"), password: data.get("password"), create }),
            });
            if (response.ok) return router.refresh();
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            setError(body?.error ?? `Sign-in failed (${response.status}).`);
          } catch {
            setError("Cannot reach the server.");
          }
          setBusy(false);
        }}>
        <p className="inline-block rounded-xl bg-amber-300 px-3 py-1 font-extrabold italic text-blue-950">VeroxaKart</p>
        <h1 className="text-xl font-bold">{create ? "Create a demo account" : "Sign in"}</h1>
        <label className="block text-sm font-semibold">Username
          <input name="user" autoComplete="username" required minLength={3} maxLength={20} autoCapitalize="none" className={field} />
        </label>
        <label className="block text-sm font-semibold">Password
          <input name="password" type="password" required minLength={6} maxLength={72} className={field}
            autoComplete={create ? "new-password" : "current-password"} />
        </label>
        <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-blue-700 font-semibold text-white disabled:opacity-50">
          {busy ? "Please wait…" : create ? "Create account" : "Sign in"}
        </button>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" className="min-h-10 w-full text-sm font-semibold text-blue-700 underline"
          onClick={() => { setCreate(!create); setError(""); }}>
          {create ? "I already have an account" : "New here? Create an account"}
        </button>
        <p className="text-xs text-slate-600">
          Demo only. Use a made-up name and a password you use nowhere else. The site admin sees your
          username, clicks and layout changes. What you type in the store is not sent.
        </p>
      </form>
    </main>
  );
}
