import { cookies, headers } from "next/headers";
import { DemoShell } from "@/components/demo/DemoShell";
import { UI_COOKIE, decodeUi } from "@/lib/demo/uiState";

export default async function DemoPage() {
  const raw = (await cookies()).get(UI_COOKIE)?.value;
  const language = (await headers()).get("accept-language") ?? "";
  return <DemoShell serverUi={decodeUi(raw, language)} renderedAt={new Date().toISOString()} />;
}
