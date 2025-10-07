import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import type { CSVData, CSVRow, DateInput, DateFormatter, CSVFormatter, CellFormatter, SafeStringFormatter } from "@/app/types";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Export payments as CSV
    const payments = await prisma.payment.findMany({
      include: {
        Client: true,
        Promotion: true,
      },
      orderBy: { createdat: "desc" },
    });
    
    const header: CSVRow = [
      "id",
      "clientid",
      "clientname",
      "amount",
      "paymentdate",
      "nextpaymentdate",
      "subscriptionperiod",
      "promotionid",
      "promotionname",
      "notes",
      "createdat",
      "updatedat",
    ];
    
    const rows: CSVData = payments.map((p: any) => [
      p.id.toString(),
      p.clientid?.toString() || "",
      safe(p.Client?.fullname || ""),
      p.amount.toString(),
      toISODate(p.paymentdate),
      toISODate(p.nextpaymentdate),
      safe(p.subscriptionperiod),
      p.promotionid?.toString() || "",
      safe(p.Promotion?.name || ""),
      safe(p.notes),
      toISODate(p.createdat),
      toISODate(p.updatedat),
    ]);
    
    const csv = toCSV([header, ...rows]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=payments.csv`,
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