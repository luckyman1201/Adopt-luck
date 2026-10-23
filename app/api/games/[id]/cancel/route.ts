import { getSessionUser } from "@/lib/auth";
import { cancelGame } from "@/lib/server/games";
import { fail, ok } from "@/lib/server/http";
import { apiError, apiLog } from "@/lib/server/log";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const { id } = await context.params;
  apiLog("game", "cancel:start", { gameId: id, userId: user.id });
  try {
    const result = await cancelGame(user.id, id);
    apiLog("game", "cancel:ok", { gameId: id, mode: result.mode });
    return ok(result);
  } catch (error) {
    apiError("game", "cancel", error, { gameId: id, userId: user.id });
    return fail(error instanceof Error ? error.message : "Could not cancel");
  }
}
