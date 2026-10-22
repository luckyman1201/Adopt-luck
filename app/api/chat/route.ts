import { getSessionUser } from "@/lib/auth";
import { listChat, sendChat } from "@/lib/server/games";
import { fail, ok, readJson } from "@/lib/server/http";

export async function GET() {
  return ok({ chat: await listChat() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const body = await readJson<{ text?: string }>(request);
  try {
    return ok({ chat: await sendChat(user.id, body.text || "") });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not send");
  }
}
