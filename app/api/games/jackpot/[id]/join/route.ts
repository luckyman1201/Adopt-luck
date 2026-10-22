import { getSessionUser } from "@/lib/auth";
import { joinPot } from "@/lib/server/games";
import { fail, ok, readJson } from "@/lib/server/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const { id } = await context.params;
  const body = await readJson<{ itemIds?: string[] }>(request);
  if (!body.itemIds?.length) return fail("Select pets");
  try {
    return ok(await joinPot(user.id, id, body.itemIds));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not join");
  }
}
