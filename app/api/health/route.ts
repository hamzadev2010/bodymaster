import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Quick DB ping
    await prisma.$queryRaw`SELECT 1`;

    // List tables (SQLite-specific)
    const tables = (await prisma.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )).map((r) => r.name);

    // Try minimal counts to validate key tables (ignore errors)
    const counts: Record<string, number | string> = {};
    const tryCount = async (name: string) => {
      try {
        const row = await prisma.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*) as c FROM ${name} LIMIT 1`);
        counts[name] = Number(row?.[0]?.c ?? 0);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        counts[name] = `err: ${errorMessage}`;
      }
    };
    for (const t of ["Client", "Coach", "Payment", "Promotion", "Presence", "ClientHistory", "CoachHistory", "PaymentHistory"]) {
      await tryCount(t).catch(() => {});
    }

    const hints: string[] = [];
    if (!tables.includes("Presence")) {
      hints.push("Table Presence manquante: exécutez les migrations Prisma");
    }
    return NextResponse.json({ ok: true, databaseUrl: process.env.DATABASE_URL, tables, counts, hints });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

