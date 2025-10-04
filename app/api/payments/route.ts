import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle month overflow (e.g., Jan 31 + 1 month)
  if (d.getDate() < day) {
    d.setDate(0); // go to last day of previous month
  }
  return d;
}

function nextDateFromPeriod(paymentDate: Date, period: "MONTHLY" | "QUARTERLY" | "ANNUAL") {
  switch (period) {
    case "MONTHLY":
      return addMonths(paymentDate, 1);
    case "QUARTERLY":
      return addMonths(paymentDate, 3);
    case "ANNUAL":
      return addMonths(paymentDate, 12);
    default:
      return addMonths(paymentDate, 1);
  }
}

export async function GET(request: Request) {
  try {
    const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "1";
    const where = includeDeleted ? {} : { deletedat: null };
    const payments = await prisma.payment.findMany({
      where,
      include: { Client: true, Promotion: true },
      orderBy: { createdat: "desc" },
      take: 100,
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: "Database connection error" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const clientId = Number(data.clientId);
    let amount = data.amount !== undefined && data.amount !== null ? Number(data.amount) : NaN;
    const subscriptionPeriod = String(data.subscriptionPeriod) as "MONTHLY" | "QUARTERLY" | "ANNUAL";
    const notes = data.notes?.toString().trim() ? data.notes.toString().trim() : null;
    const promotionId = data.promotionId ? Number(data.promotionId) : undefined;

    if (!clientId || isNaN(clientId)) {
      return NextResponse.json({ error: "clientId invalide" }, { status: 400 });
    }
    if (!subscriptionPeriod || !["MONTHLY", "QUARTERLY", "ANNUAL"].includes(subscriptionPeriod)) {
      return NextResponse.json({ error: "Période d'abonnement invalide" }, { status: 400 });
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    let nextPaymentDate = data.nextPaymentDate ? new Date(data.nextPaymentDate) : nextDateFromPeriod(paymentDate, subscriptionPeriod);

    if (notes && notes.length > 75) {
      return NextResponse.json({ error: "Les notes ne doivent pas dépasser 75 caractères" }, { status: 400 });
    }

    // If promotionId provided, validate and default amount to fixedPrice when needed
    let promotion: { id: number; fixedPrice: number; subscriptionMonths?: number | null } | null = null;
    if (promotionId) {
      const p = await prisma.promotion.findUnique({ where: { id: promotionId } });
      if (!p) return NextResponse.json({ error: "Promotion introuvable" }, { status: 400 });
      // Check active window if provided
      const now = paymentDate;
      const startsOk = !p.startdate || new Date(p.startdate) <= now;
      const endsOk = !p.enddate || now <= new Date(p.enddate);
      if (!p.active || !startsOk || !endsOk) {
        return NextResponse.json({ error: "Promotion inactive ou hors période" }, { status: 400 });
      }
      promotion = { id: p.id, fixedPrice: p.fixedprice, subscriptionMonths: p.subscriptionmonths };
      // Always enforce amount from promotion when a promotion is selected
      amount = p.fixedprice;
      // If promotion defines subscriptionMonths, compute nextPaymentDate from paymentDate accordingly
      if (p.subscriptionmonths && Number.isFinite(p.subscriptionmonths) && p.subscriptionmonths > 0) {
        nextPaymentDate = addMonths(paymentDate, Number(p.subscriptionmonths));
      }
    }

    if (!(amount > 0) || isNaN(amount)) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Prevent overlapping intervals for the same client (exclude soft-deleted)
    // Overlap condition: existing.paymentDate < nextPaymentDate AND existing.nextPaymentDate > paymentDate
    const overlap = await prisma.payment.findFirst({
      where: {
        deletedat: null,
        clientid: clientId,
        paymentdate: { lt: nextPaymentDate },
        nextpaymentdate: { gt: paymentDate },
      },
      select: { id: true, paymentdate: true, nextpaymentdate: true },
    });
    if (overlap) {
      return NextResponse.json({ error: "Ce client possède déjà un paiement couvrant cette période" }, { status: 409 });
    }

    const created = await prisma.payment.create({
      data: {
        clientid: clientId,
        promotionid: promotion?.id,
        amount,
        subscriptionperiod: subscriptionPeriod,
        paymentdate: paymentDate,
        nextpaymentdate: nextPaymentDate,
        notes,
      },
      include: { Client: true, Promotion: true },
    });

    try {
      await prisma.paymentHistory.create({
        data: { paymentid: created.id, action: "CREATE", changes: JSON.stringify(created) },
      });
    } catch (histErr) {
      console.warn("POST /api/payments history log failed:", histErr);
    }

    // Optionnel: mettre à jour la période d'abonnement du client selon le dernier paiement
    await prisma.client.update({
      where: { id: clientId },
      data: { subscriptionperiod: subscriptionPeriod },
    }).catch(() => undefined);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
