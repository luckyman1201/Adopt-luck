import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId } from "@/lib/server/helpers";
import { fail, ok, readJson } from "@/lib/server/http";
import type { PetInstance } from "@/lib/types";

export async function POST(request: Request) {
  const key = request.headers.get("x-admin-key");
  const user = await getSessionUser();
  const allowed = (process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) || user?.isStaff;
  if (!allowed) return fail("Admin only", 401);
  const body = await readJson<{ userId?: string; items?: PetInstance[] }>(request);
  const userId = body.userId || user?.id;
  if (!userId || !body.items?.length) return fail("userId and items required");
  await db.inventoryItem.createMany({
    data: body.items.map((item) => ({
      id: newId("inv"),
      userId,
      petId: item.petId,
      fly: Boolean(item.fly),
      ride: Boolean(item.ride),
      neon: Boolean(item.neon),
      mega: Boolean(item.mega),
    })),
  });
  return ok({ ok: true, count: body.items.length });
}
