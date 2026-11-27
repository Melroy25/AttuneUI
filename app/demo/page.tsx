import { cookies, headers } from "next/headers";
import { DemoShell } from "@/components/demo/DemoShell";
import { UserLogin } from "@/components/demo/UserLogin";
import { UI_COOKIE, decodeUi } from "@/lib/demo/uiState";
import { USER_COOKIE, loginRequired, userFromToken } from "@/lib/server/users";
import "./store.css";

export default async function DemoPage() {
  const jar = await cookies();
  const user = userFromToken(jar.get(USER_COOKIE)?.value);
  if (loginRequired() && !user) return <UserLogin />;
  const raw = jar.get(UI_COOKIE)?.value;
  const language = (await headers()).get("accept-language") ?? "";
  return <DemoShell serverUi={decodeUi(raw, language)} renderedAt={new Date().toISOString()} user={user} />;
}
