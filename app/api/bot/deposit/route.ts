import { db } from "@/lib/db";
import { newId } from "@/lib/server/helpers";
import { fail, ok, readJson } from "@/lib/server/http";
import { itemsValue } from "@/lib/pets";
import type { PetInstance } from "@/lib/types";

export async function POST(request: Request) {
  const secret = request.headers.get("x-bot-secret");
  if (!process.env.BOT_SECRET || secret !== process.env.BOT_SECRET) {
    return fail("Unauthorized bot", 401);
  }
  const body = await readJson<{ robloxId?: string; username?: string; items?: PetInstance[] }>(request);
  if (!body.items?.length) return fail("No pets in deposit");
  const user = body.robloxId
    ? await db.user.findUnique({ where: { robloxId: body.robloxId } })
    : await db.user.findFirst({ where: { name: body.username, isBot: false } });
  if (!user) return fail("User has not logged in yet", 404);
  await db.inventoryItem.createMany({
    data: body.items.map((item) => ({
      id: newId("inv"),
      userId: user.id,
      petId: item.petId,
      fly: Boolean(item.fly),
      ride: Boolean(item.ride),
      neon: Boolean(item.neon),
      mega: Boolean(item.mega),
    })),
  });
  const value = itemsValue(body.items);
  await db.transaction.create({
    data: {
      id: newId("tx"),
      userId: user.id,
      type: "deposit",
      itemsJson: JSON.stringify(body.items),
      value,
      status: "completed",
    },
  });
  return ok({ ok: true, userId: user.id, value, count: body.items.length });
}
