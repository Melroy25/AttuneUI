import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminLive } from "@/components/admin/AdminLive";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ADMIN_COOKIE, adminConfigured, validToken } from "@/lib/server/admin";

export const metadata: Metadata = { title: "AttuneUI admin" };

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value; // also makes the page per-request
  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md space-y-2 p-6">
        <h1 className="text-2xl font-bold">Admin not set up</h1>
        <p>Set ADMIN_USER and ADMIN_PASSWORD in .env.local (or in Vercel), then restart or redeploy.</p>
      </main>
    );
  }
  return validToken(token) ? <AdminLive /> : <AdminLogin />;
}
