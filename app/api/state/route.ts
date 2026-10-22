import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaderboard, listChat, listGames, listHistory } from "@/lib/server/games";
import { toItem, toPlayer } from "@/lib/server/helpers";
import { ok } from "@/lib/server/http";

export async function GET() {
  const user = await getSessionUser();
  const [games, chat, stats] = await Promise.all([listGames(), listChat(), leaderboard()]);
  const inventory = user
    ? await db.inventoryItem.findMany({ where: { userId: user.id, locked: false }, orderBy: { createdAt: "desc" } })
    : [];
  const history = user ? await listHistory(user.id) : [];
  return ok({
    user: user ? toPlayer(user) : null,
    inventory: inventory.map(toItem),
    history,
    chat,
    stats,
    robloxEnabled: true,
    ...games,
  });
}
