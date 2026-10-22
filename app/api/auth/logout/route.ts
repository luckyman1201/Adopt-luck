import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/server/http";

export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
