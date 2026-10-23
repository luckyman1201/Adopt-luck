import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaderboard, listChat, listGames, listHistory, listLiveUpgrades } from "@/lib/server/games";
import { toItem, toPlayer } from "@/lib/server/helpers";
import { fail, ok } from "@/lib/server/http";
import { apiError, apiLog } from "@/lib/server/log";
import { mergeNameTwins } from "@/lib/server/users";

export async function GET() {
  try {
    const session = await getSessionUser();
    const user = session ? await mergeNameTwins(session) : null;
    const [games, chat, stats, upgrades] = await Promise.all([listGames(), listChat(), leaderboard(), listLiveUpgrades()]);
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
      upgrades,
      ...games,
    });
  } catch (error) {
    apiError("state", "load", error);
    return fail("Could not load site state from the database.", 503);
  }
}
