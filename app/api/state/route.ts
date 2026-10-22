import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaderboard, listChat, listGames, listHistory } from "@/lib/server/games";
import { toItem, toPlayer } from "@/lib/server/helpers";
import { fail, ok } from "@/lib/server/http";
import { apiError, apiLog } from "@/lib/server/log";

export async function GET() {
  try {
    const user = await getSessionUser();
    const [games, chat, stats] = await Promise.all([listGames(), listChat(), leaderboard()]);
    const inventory = user
      ? await db.inventoryItem.findMany({ where: { userId: user.id, locked: false }, orderBy: { createdAt: "desc" } })
      : [];
    const history = user ? await listHistory(user.id) : [];
    apiLog("state", "ok", { loggedIn: Boolean(user), games: Object.keys(games).length });
    return ok({
      user: user ? toPlayer(user) : null,
      inventory: inventory.map(toItem),
      history,
      chat,
      stats,
      robloxEnabled: true,
      ...games,
    });
  } catch (error) {
    apiError("state", "load", error);
    return fail("Could not load site state from the database.", 503);
  }
}
