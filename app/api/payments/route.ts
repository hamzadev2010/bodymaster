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
    const where = includeDeleted ? {} : { isdeleted: false };
    const payments = await prisma.payment.findMany({
      where,
      include: { Client: true, Promotion: true },
      orderBy: { createdat: "desc" },
      take: 100,
    });
    
    // Transform field names to match frontend expectations
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      clientId: payment.clientid,
      promotionId: payment.promotionid,
      amount: payment.amount,
      paymentDate: payment.paymentdate,
      nextPaymentDate: payment.nextpaymentdate,
      subscriptionPeriod: payment.subscriptionperiod,
      notes: payment.notes,
      client: payment.Client ? {
        id: payment.Client.id,
        fullName: payment.Client.fullname,
        firstName: payment.Client.firstname,
        lastName: payment.Client.lastname,
        email: payment.Client.email,
        phone: payment.Client.phone,
        nationalId: payment.Client.nationalid,
        dateOfBirth: payment.Client.dateofbirth,
        registrationDate: payment.Client.registrationdate,
      } : null,
      promotion: payment.Promotion ? {
        id: payment.Promotion.id,
        name: payment.Promotion.name,
        subscriptionMonths: payment.Promotion.subscriptionmonths,
      } : null,
    }));
    
    return NextResponse.json(transformedPayments);
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
        isdeleted: false,
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

    // Transform the response to match frontend expectations
    const transformedPayment = {
      id: created.id,
      clientId: created.clientid,
      promotionId: created.promotionid,
      amount: created.amount,
      paymentDate: created.paymentdate,
      nextPaymentDate: created.nextpaymentdate,
      subscriptionPeriod: created.subscriptionperiod,
      notes: created.notes,
      client: created.Client ? {
        id: created.Client.id,
        fullName: created.Client.fullname,
        firstName: created.Client.firstname,
        lastName: created.Client.lastname,
        email: created.Client.email,
        phone: created.Client.phone,
        nationalId: created.Client.nationalid,
        dateOfBirth: created.Client.dateofbirth,
        registrationDate: created.Client.registrationdate,
      } : null,
      promotion: created.Promotion ? {
        id: created.Promotion.id,
        name: created.Promotion.name,
        subscriptionMonths: created.Promotion.subscriptionmonths,
      } : null,
    };

    return NextResponse.json(transformedPayment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const paymentId = Number(data.id);

    if (!paymentId || isNaN(paymentId)) {
      return NextResponse.json({ error: "ID paiement invalide" }, { status: 400 });
    }

    // Check if payment exists and is not already deleted
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, amount: true, isdeleted: true }
    });

    if (!payment) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    if (payment.isdeleted) {
      return NextResponse.json({ error: "Paiement déjà supprimé" }, { status: 400 });
    }

    // Soft delete the payment
    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        isdeleted: true,
        deletedat: new Date(),
        updatedat: new Date(),
      },
    });

    // Log the deletion in history
    try {
      await prisma.paymentHistory.create({
        data: { 
          paymentid: paymentId, 
          action: "DELETE", 
          changes: JSON.stringify({ amount: payment.amount, deletedat: updated.deletedat })
        },
      });
    } catch (histErr) {
      console.warn("DELETE /api/payments history log failed:", histErr);
    }

    return NextResponse.json({ success: true, message: "Paiement supprimé avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
