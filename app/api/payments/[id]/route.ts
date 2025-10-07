import { NextResponse } from "next/server";

// Vercel-compatible configuration
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

// Lazy import Prisma to avoid build-time initialization
async function getPrisma() {
  const { default: prisma } = await import("@/app/lib/prisma");
  return prisma;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";
    const prisma = await getPrisma();
    const payment = await prisma.payment.findUnique({ where: { id }, include: { Client: true, Promotion: true } });
    if (!includeDeleted && payment?.isdeleted) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });
    
    // Transform field names to match frontend expectations
    const transformedPayment = {
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
    };
    
    return NextResponse.json(transformedPayment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const data = await request.json();

  const prisma = await getPrisma();
  const updated = await prisma.payment.update({
    where: { id },
    data: {
      clientid: data.clientId ? Number(data.clientId) : undefined,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      subscriptionperiod: data.subscriptionPeriod,
      paymentdate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      nextpaymentdate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : undefined,
      notes: data.notes?.toString().trim() ?? undefined,
    },
    include: { Client: true, Promotion: true },
  });

  await prisma.paymentHistory.create({
    data: { paymentid: id, action: "UPDATE", changes: JSON.stringify(updated) },
  });

  // Transform the response to match frontend expectations
  const transformedPayment = {
    id: updated.id,
    clientId: updated.clientid,
    promotionId: updated.promotionid,
    amount: updated.amount,
    paymentDate: updated.paymentdate,
    nextPaymentDate: updated.nextpaymentdate,
    subscriptionPeriod: updated.subscriptionperiod,
    notes: updated.notes,
    client: updated.Client ? {
      id: updated.Client.id,
      fullName: updated.Client.fullname,
      firstName: updated.Client.firstname,
      lastName: updated.Client.lastname,
      email: updated.Client.email,
      phone: updated.Client.phone,
      nationalId: updated.Client.nationalid,
      dateOfBirth: updated.Client.dateofbirth,
      registrationDate: updated.Client.registrationdate,
    } : null,
    promotion: updated.Promotion ? {
      id: updated.Promotion.id,
      name: updated.Promotion.name,
      subscriptionMonths: updated.Promotion.subscriptionmonths,
    } : null,
  };

  return NextResponse.json(transformedPayment);
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID paiement invalide" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Check if payment exists and is not already deleted
    const payment = await prisma.payment.findUnique({
      where: { id },
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
      where: { id },
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
          paymentid: id, 
          action: "DELETE", 
          changes: JSON.stringify({ amount: payment.amount, deletedat: updated.deletedat })
        },
      });
    } catch (histErr) {
      console.warn("DELETE /api/payments/[id] history log failed:", histErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
