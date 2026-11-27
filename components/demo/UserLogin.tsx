"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WebConfig } from "@/lib/server/firebase";
import { firebaseAuth, signInMessage, withGoogle, withName } from "./firebaseClient";

const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

export function UserLogin({ config, domain }: { config: WebConfig; domain: string }) {
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (getToken: () => Promise<string>) => {
    setBusy(true);
    setError("");
    try {
      const idToken = await getToken();
      const response = await fetch("/api/user", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }),
      });
      if (response.ok) return router.refresh();
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `Sign-in failed (${response.status}).`);
    } catch (e) {
      setError(signInMessage(e));
    }
    setBusy(false);
  };

  return (
    <main className="min-h-dvh bg-blue-50 p-4 text-slate-900">
      <div className="mx-auto mt-8 max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow">
        <p className="inline-block rounded-xl bg-amber-300 px-3 py-1 font-extrabold italic text-blue-950">VeroxaKart</p>
        <h1 className="text-xl font-bold">{create ? "Create your account" : "Sign in"}</h1>
        <button type="button" disabled={busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 disabled:opacity-50"
          onClick={() => void finish(() => withGoogle(firebaseAuth(config)))}>
          <span aria-hidden className="text-lg font-extrabold text-blue-600">G</span> Continue with Google
        </button>
        <p className="text-center text-xs text-slate-500">or use a username</p>
        <form className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const name = String(data.get("user")).trim().toLowerCase();
            const password = String(data.get("password"));
            void finish(() => withName(firebaseAuth(config), `${name}@${domain}`, password, create));
          }}>
          <label className="block text-sm font-semibold">Username
            <input name="user" autoComplete="username" required pattern="[A-Za-z0-9_]{3,20}"
              title="3 to 20 letters, numbers or _" autoCapitalize="none" className={field} />
          </label>
          <label className="block text-sm font-semibold">Password
            <input name="password" type="password" required minLength={6} maxLength={72} className={field}
              autoComplete={create ? "new-password" : "current-password"} />
          </label>
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg bg-blue-700 font-semibold text-white disabled:opacity-50">
            {busy ? "Please wait…" : create ? "Create account" : "Sign in"}
          </button>
        </form>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        <button type="button" className="min-h-10 w-full text-sm font-semibold text-blue-700 underline"
          onClick={() => { setCreate(!create); setError(""); }}>
          {create ? "I already have an account" : "New here? Create an account"}
        </button>
        <p className="text-xs text-slate-600">
          Demo store. The admin page, which anyone with the link can open, shows your name (and a masked
          email for Google sign-in), clicks and layout changes. What you type in the store is not sent.
        </p>
      </div>
    </main>
  );
}
