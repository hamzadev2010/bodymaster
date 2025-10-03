import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import type { CSVData, CSVRow, DateInput, DateFormatter, CSVFormatter, CellFormatter, SafeStringFormatter } from "@/app/types";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Export basic client registry as CSV
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    const header: CSVRow = [
      "id",
      "fullName",
      "email",
      "phone",
      "nationalId",
      "registrationDate",
      "createdAt",
      "updatedAt",
    ];
    const rows: CSVData = clients.map((c: { id: number; fullName: string; email: string | null; phone: string | null; nationalId: string | null; registrationDate: Date | null; createdAt: Date; updatedAt: Date }) => [
      c.id.toString(),
      safe(c.fullName),
      safe(c.email),
      safe(c.phone),
      safe(c.nationalId),
      toISODate(c.registrationDate),
      toISODate(c.createdAt),
      toISODate(c.updatedAt),
    ]);
    const csv = toCSV([header, ...rows]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=clients.csv`,
      },
    });
  } catch (error) {
    // Handle database connection errors during build
    console.error('Database connection error:', error);
    return new NextResponse('Database not available', {
      status: 503,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

const toISODate: DateFormatter = (d: DateInput): string => {
  try {
    if (!d) return "";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "" : dt.toISOString();
  } catch {
    return "";
  }
};

const toCSV: CSVFormatter = (rows: CSVData): string => {
  return rows
    .map((r) => r.map((cell) => formatCSVCell(cell)).join(","))
    .join("\n");
};

const formatCSVCell: CellFormatter = (v: unknown): string => {
  const s = (v ?? "").toString();
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const safe: SafeStringFormatter = (v: unknown): string => {
  return (v ?? "").toString().replace(/[\r\n]+/g, " ").trim();
};
