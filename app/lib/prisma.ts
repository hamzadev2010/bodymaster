import { PrismaClient } from "@prisma/client";

// Only set fallback DATABASE_URL during development, not during build
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
  const path = require("path");
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const normalized = dbPath.replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${normalized}`;
}

const globalForPrisma = globalThis as unknown as { 
  prisma?: PrismaClient 
};

// Create Prisma client only when needed, not during import
function createPrismaClient() {
  return new PrismaClient({ 
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Use global caching to prevent multiple PrismaClients in development
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;


