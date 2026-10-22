import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toItem, toPlayer } from "@/lib/server/helpers";
import { listHistory } from "@/lib/server/games";
import { ok } from "@/lib/server/http";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return ok({ user: null, inventory: [], history: [] });
  const inventory = await db.inventoryItem.findMany({
    where: { userId: user.id, locked: false },
    orderBy: { createdAt: "desc" },
  });
  return ok({
    user: toPlayer(user),
    inventory: inventory.map(toItem),
    history: await listHistory(user.id),
  });
}
