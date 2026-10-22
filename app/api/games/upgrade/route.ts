import { getSessionUser } from "@/lib/auth";
import { rollUpgrade } from "@/lib/server/games";
import { fail, ok, readJson } from "@/lib/server/http";
import type { PetInstance } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const body = await readJson<{ itemIds?: string[]; target?: PetInstance }>(request);
  if (!body.itemIds?.length || !body.target) return fail("Select stake pets and a target");
  try {
    return ok(await rollUpgrade(user.id, body.itemIds, body.target));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upgrade failed");
  }
}
