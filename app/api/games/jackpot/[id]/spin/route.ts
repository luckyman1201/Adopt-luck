import { getSessionUser } from "@/lib/auth";
import { resolvePot } from "@/lib/server/games";
import { fail, ok } from "@/lib/server/http";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return fail("Login required", 401);
  const { id } = await context.params;
  try {
    return ok(await resolvePot(id, "spinning"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not spin");
  }
}
