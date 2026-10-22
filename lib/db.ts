import { PrismaClient } from "@prisma/client";
import { apiError, apiLog, dbEnvInfo, errorInfo } from "@/lib/server/log";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function pingDb() {
  const env = dbEnvInfo();
  apiLog("db", "ping:start", env);
  try {
    await db.$queryRaw`SELECT 1`;
    apiLog("db", "ping:ok", env);
    return { ok: true as const, env };
  } catch (error) {
    apiError("db", "ping", error, env);
    return { ok: false as const, env, error: errorInfo(error) };
  }
}
