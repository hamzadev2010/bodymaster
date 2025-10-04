import { NextResponse } from "next/server";

export const revalidate = 30;

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
    if (!includeDeleted && payment?.deletedat) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(payment);
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

  return NextResponse.json(updated);
}

export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
