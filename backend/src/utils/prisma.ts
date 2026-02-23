import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const rawDatabaseUrl = String(process.env.DATABASE_URL || "").trim();

const withPoolDefaults = (databaseUrl: string): string => {
  const normalized = String(databaseUrl || "").trim();
  if (!normalized) return normalized;
  const isSupported =
    normalized.startsWith("mysql://") ||
    normalized.startsWith("postgresql://") ||
    normalized.startsWith("postgres://");
  if (!isSupported) return normalized;

  try {
    const parsed = new URL(normalized);
    const currentConnectionLimit = Number(parsed.searchParams.get("connection_limit") || 0);
    if (!currentConnectionLimit || currentConnectionLimit < 15) {
      parsed.searchParams.set("connection_limit", "15");
    }
    const currentPoolTimeout = Number(parsed.searchParams.get("pool_timeout") || 0);
    if (!currentPoolTimeout || currentPoolTimeout < 20) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return normalized;
  }
};

const datasourceUrl = withPoolDefaults(rawDatabaseUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: datasourceUrl
      ? {
          db: {
            url: datasourceUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
