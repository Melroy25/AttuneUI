import { cookies, headers } from "next/headers";
import { DemoSync } from "@/components/demo/DemoSync";
import { UserLogin } from "@/components/demo/UserLogin";
import { UI_COOKIE, decodeUi } from "@/lib/demo/uiState";
import { webConfig } from "@/lib/server/firebase";
import { NAME_DOMAIN, USER_COOKIE, loginRequired, userFromToken } from "@/lib/server/users";
import "./store.css";

export default async function DemoPage() {
  const jar = await cookies();
  const user = userFromToken(jar.get(USER_COOKIE)?.value);
  if (loginRequired() && !user) return <UserLogin config={webConfig()!} domain={NAME_DOMAIN} />;
  const raw = jar.get(UI_COOKIE)?.value;
  const language = (await headers()).get("accept-language") ?? "";
  return <DemoSync serverUi={decodeUi(raw, language)} renderedAt={new Date().toISOString()} user={user?.name ?? null} />;
}
