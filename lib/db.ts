import { PrismaClient } from "@prisma/client";
import { apiError, apiLog, dbEnvInfo, errorInfo } from "@/lib/server/log";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function databaseUrl(url = process.env.DATABASE_URL || "") {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url.replace(/([?&])channel_binding=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

function isTransientDbError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || "";
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    /can't reach database|connection timed out|server has closed the connection|too many connections|kind: Closed/i.test(
      message,
    )
  );
}

export async function withDbRetry<T>(work: () => Promise<T>, attempts = 4) {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      last = error;
      if (!isTransientDbError(error) || attempt === attempts) throw error;
      apiLog("db", "retry", { attempt, error: errorInfo(error) });
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw last;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasourceUrl: databaseUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function pingDb() {
  const env = dbEnvInfo();
  apiLog("db", "ping:start", env);
  try {
    await withDbRetry(() => db.$queryRaw`SELECT 1`);
    apiLog("db", "ping:ok", env);
    return { ok: true as const, env };
  } catch (error) {
    apiError("db", "ping", error, env);
    return { ok: false as const, env, error: errorInfo(error) };
  }
}
