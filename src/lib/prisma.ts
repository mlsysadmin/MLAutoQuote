import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client per container.
 *
 * Cloud Run reuses an instance across many requests, and `next dev` reloads
 * modules on every edit — both would otherwise open a new connection pool each
 * time and exhaust Cloud SQL's connection limit.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
