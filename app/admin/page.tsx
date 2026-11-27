import type { Metadata } from "next";
import { AdminLive } from "@/components/admin/AdminLive";

export const metadata: Metadata = { title: "AttuneUI admin" };

// No sign-in, by the owner's choice: anyone with the link can see the store users' activity.
export default function AdminPage() {
  return <AdminLive />;
}
