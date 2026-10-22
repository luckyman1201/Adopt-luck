import { pingDb } from "@/lib/db";
import { apiError, apiLog } from "@/lib/server/log";
import { ok } from "@/lib/server/http";

export async function GET() {
  apiLog("health", "check");
  try {
    const db = await pingDb();
    return ok({
      ok: db.ok,
      db,
    }, db.ok ? 200 : 503);
  } catch (error) {
    apiError("health", "check", error);
    return ok({
      ok: false,
      error: error instanceof Error ? error.message : "Health check failed",
    }, 503);
  }
}