import { PrismaClient } from "./generated";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";

// Prisma 7 requires a driver adapter (the connection URL no longer lives in
// schema.prisma). We use node-postgres against Neon (prod) / docker Postgres (dev).
const adapter = new PrismaPg(env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Avoid exhausting connections during Next.js dev hot-reload.
if (!env.isProd) globalForPrisma.prisma = prisma;

// Re-export enums/types so callers import from one place, not the generated dir.
export * from "./generated";
