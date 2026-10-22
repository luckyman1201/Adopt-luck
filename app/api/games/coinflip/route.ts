import { getSessionUser } from "@/lib/auth";
import { createCoin } from "@/lib/server/games";
import { fail, ok, readJson } from "@/lib/server/http";
import type { CoinSide } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const body = await readJson<{ itemIds?: string[]; side?: CoinSide }>(request);
  if (!body.itemIds?.length) return fail("Select pets");
  try {
    return ok(await createCoin(user.id, body.itemIds, body.side === "tails" ? "tails" : "heads"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not create CoinFlip");
  }
}
