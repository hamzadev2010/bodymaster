import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

function enumPeriodLabel(period: "MONTHLY" | "QUARTERLY" | "ANNUAL"): string {
  switch (period) {
    case "MONTHLY":
      return "Mensuel";
    case "QUARTERLY":
      return "3 mois";
    case "ANNUAL":
      return "Annuel";
    default:
      return String(period || "");
  }
}

function isDailyPass(paymentDate: any, nextPaymentDate: any): boolean {
  try {
    const start = new Date(paymentDate);
    const next = new Date(nextPaymentDate);
    if (isNaN(start.getTime()) || isNaN(next.getTime())) return false;
    const diffDays = (next.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    return Math.abs(diffDays - 1) < 0.01; // allow small timezone rounding
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const day = searchParams.get("day");

  let start: Date | null = null;
  let end: Date | null = null;
  try {
    if (year && !/^[0-9]{4}$/.test(year)) throw new Error("invalid year");
    if (month && !/^(0?[1-9]|1[0-2])$/.test(month)) throw new Error("invalid month");
    if (day && !/^([0-2]?[0-9]|3[01])$/.test(day)) throw new Error("invalid day");

    if (year && month && day) {
      const y = Number(year);
      const m = Number(month) - 1;
      const d = Number(day);
      start = new Date(Date.UTC(y, m, d, 0, 0, 0));
      end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    } else if (year && month) {
      const y = Number(year);
      const m = Number(month) - 1;
      start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
    } else if (year) {
      const y = Number(year);
      start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
      end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
    }

function enumPeriodLabel(period: "MONTHLY" | "QUARTERLY" | "ANNUAL"): string {
  switch (period) {
    case "MONTHLY":
      return "Mensuel";
    case "QUARTERLY":
      return "3 mois";
    case "ANNUAL":
      return "Annuel";
    default:
      return String(period || "");
  }
}

function isDailyPass(paymentDate: any, nextPaymentDate: any): boolean {
  try {
    const start = new Date(paymentDate);
    const next = new Date(nextPaymentDate);
    if (isNaN(start.getTime()) || isNaN(next.getTime())) return false;
    const diffDays = (next.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    return Math.abs(diffDays - 1) < 0.01; // allow small timezone rounding
  } catch {
    return false;
  }
}
  } catch {}

  const where: any = { deletedAt: null };
  if (start && end) {
    where.paymentDate = { gte: start, lt: end };
  }

  const payments = await prisma.payment.findMany({
    where,
    include: { client: true, promotion: true },
    orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
  });

  const header = [
    "id",
    "client_id",
    "client_nom",
    "client_phone",
    "montant",
    "date_paiement_iso",
    "echeance_iso",
    "promotion_id",
    "promotion_nom",
    "promotion_mois",
    "periode_enum",
    "periode_label",
    "pass_journee",
    "notes",
    "cree_le_iso",
  ];

  const rows = payments.map((p) => {
    const promotionMonths = p.promotion?.subscriptionMonths ?? null;
    const periodLabel = promotionMonths && promotionMonths > 0
      ? `${promotionMonths} mois`
      : enumPeriodLabel(p.subscriptionPeriod as any);
    const isDaily = isDailyPass(p.paymentDate as any, p.nextPaymentDate as any);
    return [
      p.id,
      p.clientId,
      safe(p.client?.fullName),
      safe(p.client?.phone),
      String(p.amount ?? ""),
      toISODate(p.paymentDate),
      toISODate(p.nextPaymentDate),
      p.promotionId ?? "",
      safe(p.promotion?.name),
      promotionMonths ?? "",
      safe(p.subscriptionPeriod),
      periodLabel,
      isDaily ? "1" : "0",
      safe(p.notes),
      toISODate(p.createdAt),
    ];
  });

  const csv = toCSV([header, ...rows]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=payments${year?`-${year}`:""}${month?`-${month}`:""}${day?`-${day}`:""}.csv`,
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
