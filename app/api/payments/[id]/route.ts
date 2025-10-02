import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";
  const payment = await prisma.payment.findUnique({ where: { id }, include: { client: true, promotion: true } });
  if (!includeDeleted && payment?.deletedAt) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!payment) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(payment);
}

export async function PUT(request: Request, { params }: Params) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const data = await request.json();

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      clientId: data.clientId ? Number(data.clientId) : undefined,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      subscriptionPeriod: data.subscriptionPeriod,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      nextPaymentDate: data.nextPaymentDate ? new Date(data.nextPaymentDate) : undefined,
      notes: data.notes?.toString().trim() ?? undefined,
    },
    include: { client: true, promotion: true },
  });

  await prisma.paymentHistory.create({
    data: { paymentId: id, action: "UPDATE", changes: JSON.stringify(updated) },
  });

  return NextResponse.json(updated);
}

export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
