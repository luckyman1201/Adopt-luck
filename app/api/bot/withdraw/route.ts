import { db } from "@/lib/db";
import { newId, toItem } from "@/lib/server/helpers";
import { fail, ok, readJson } from "@/lib/server/http";
import { itemsValue } from "@/lib/pets";

export async function POST(request: Request) {
  const secret = request.headers.get("x-bot-secret");
  if (!process.env.BOT_SECRET || secret !== process.env.BOT_SECRET) {
    return fail("Unauthorized bot", 401);
  }
  const body = await readJson<{ userId?: string; itemIds?: string[] }>(request);
  if (!body.userId || !body.itemIds?.length) return fail("userId and itemIds required");
  const rows = await db.inventoryItem.findMany({
    where: { id: { in: body.itemIds }, userId: body.userId, locked: false },
  });
  if (rows.length !== body.itemIds.length) return fail("Some pets are locked or missing");
  const items = rows.map(toItem);
  await db.inventoryItem.deleteMany({ where: { id: { in: body.itemIds } } });
  await db.transaction.create({
    data: {
      id: newId("tx"),
      userId: body.userId,
      type: "withdraw",
      itemsJson: JSON.stringify(items),
      value: itemsValue(items),
      status: "completed",
    },
  });
  return ok({ ok: true, count: items.length, items });
}
