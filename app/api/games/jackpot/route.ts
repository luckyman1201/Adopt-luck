import { getSessionUser } from "@/lib/auth";
import { createPot } from "@/lib/server/games";
import { fail, ok, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const body = await readJson<{ itemIds?: string[] }>(request);
  if (!body.itemIds?.length) return fail("Select pets");
  try {
    return ok(await createPot(user.id, body.itemIds, "jackpot"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not create jackpot");
  }
}
