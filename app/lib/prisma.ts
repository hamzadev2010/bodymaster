import { PrismaClient } from "@prisma/client";
import path from "path";

// Ensure DATABASE_URL exists for Prisma (fallback to local sqlite file)
if (!process.env.DATABASE_URL) {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const normalized = dbPath.replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${normalized}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;


