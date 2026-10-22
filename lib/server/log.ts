type LogData = Record<string, unknown>;

function safeHost(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.host,
      database: parsed.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return { protocol: url.startsWith("file:") ? "file" : "invalid", host: null, database: null };
  }
}

export function dbEnvInfo() {
  const databaseUrl = process.env.DATABASE_URL || "";
  const parsed = safeHost(databaseUrl);
  return {
    hasDatabaseUrl: Boolean(databaseUrl),
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    protocol: parsed?.protocol || null,
    host: parsed?.host || null,
    database: parsed?.database || null,
    looksLikePostgres: databaseUrl.startsWith("postgres"),
    looksLikeSqlite: databaseUrl.startsWith("file:"),
  };
}

export function errorInfo(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };
  const extra = error as Error & { code?: string; meta?: unknown };
  return {
    name: error.name,
    message: error.message,
    code: extra.code || null,
    meta: extra.meta || null,
  };
}

export function apiLog(scope: string, step: string, data?: LogData) {
  console.log(`[${scope}] ${step}`, data ? JSON.stringify(data) : "");
}

export function apiError(scope: string, step: string, error: unknown, data?: LogData) {
  console.error(`[${scope}] ${step} FAILED`, JSON.stringify({ ...data, error: errorInfo(error), db: dbEnvInfo() }));
}
