import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";

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
  const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "1";
  const where = includeDeleted ? {} : { deletedAt: null } as any;
  const payments = await prisma.payment.findMany({
    where,
    include: { client: true, promotion: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(payments);
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
      const startsOk = !p.startDate || new Date(p.startDate) <= now;
      const endsOk = !p.endDate || now <= new Date(p.endDate);
      if (!p.active || !startsOk || !endsOk) {
        return NextResponse.json({ error: "Promotion inactive ou hors période" }, { status: 400 });
      }
      promotion = { id: p.id, fixedPrice: p.fixedPrice, subscriptionMonths: p.subscriptionMonths };
      // Always enforce amount from promotion when a promotion is selected
      amount = p.fixedPrice;
      // If promotion defines subscriptionMonths, compute nextPaymentDate from paymentDate accordingly
      if (p.subscriptionMonths && Number.isFinite(p.subscriptionMonths) && p.subscriptionMonths > 0) {
        nextPaymentDate = addMonths(paymentDate, Number(p.subscriptionMonths));
      }
    }

    if (!(amount > 0) || isNaN(amount)) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // Prevent overlapping intervals for the same client (exclude soft-deleted)
    // Overlap condition: existing.paymentDate < nextPaymentDate AND existing.nextPaymentDate > paymentDate
    const overlap = await prisma.payment.findFirst({
      where: {
        deletedAt: null,
        clientId,
        paymentDate: { lt: nextPaymentDate },
        nextPaymentDate: { gt: paymentDate },
      },
      select: { id: true, paymentDate: true, nextPaymentDate: true },
    });
    if (overlap) {
      return NextResponse.json({ error: "Ce client possède déjà un paiement couvrant cette période" }, { status: 409 });
    }

    const created = await prisma.payment.create({
      data: {
        clientId,
        promotionId: promotion?.id,
        amount,
        subscriptionPeriod,
        paymentDate,
        nextPaymentDate,
        notes,
      },
      include: { client: true, promotion: true },
    });

    try {
      await prisma.paymentHistory.create({
        data: { paymentId: created.id, action: "CREATE", changes: JSON.stringify(created) },
      });
    } catch (histErr) {
      console.warn("POST /api/payments history log failed:", histErr);
    }

    // Optionnel: mettre à jour la période d'abonnement du client selon le dernier paiement
    await prisma.client.update({
      where: { id: clientId },
      data: { subscriptionPeriod },
    }).catch(() => undefined);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    const message = error?.message || "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
