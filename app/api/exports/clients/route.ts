import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  // Export basic client registry as CSV
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
  });
  const header = [
    "id",
    "fullName",
    "email",
    "phone",
    "nationalId",
    "registrationDate",
    "createdAt",
    "updatedAt",
  ];
  const rows = clients.map((c) => [
    c.id,
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
}

function toISODate(d: any): string {
  try {
    if (!d) return "";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "" : dt.toISOString();
  } catch {
    return "";
  }
}

function toCSV(rows: any[][]): string {
  return rows
    .map((r) => r.map((cell) => formatCSVCell(cell)).join(","))
    .join("\n");
}

function formatCSVCell(v: any): string {
  const s = (v ?? "").toString();
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function safe(v: any): string {
  return (v ?? "").toString().replace(/[\r\n]+/g, " ").trim();
}
