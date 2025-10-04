import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/payments/[id]?includeDeleted=1
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ message: "Invalid payment ID" }, { status: 400 });

  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        Client: true,      // ✅ Must match schema exactly
        Promotion: true,   // ✅ Must match schema exactly
      },
    });

    if (!payment || (!includeDeleted && payment.deletedat)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json({ message: "Server error fetching payment" }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/[id]
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ message: "Invalid payment ID" }, { status: 400 });

  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: "Payment not found" }, { status: 404 });

    const deleted = await prisma.payment.update({
      where: { id },
      data: { deletedat: new Date() },
      include: {
        Client: true,
        Promotion: true,
      },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json({ message: "Server error deleting payment" }, { status: 500 });
  }
}

/**
 * PATCH /api/payments/[id]
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ message: "Invalid payment ID" }, { status: 400 });

  try {
    const body = await req.json();

    const allowedFields = ["amount", "notes", "nextpaymentdate", "subscriptionperiod", "promotionid"];
    const data: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined && body[key] !== null) data[key] = body[key];
    }

    const updated = await prisma.payment.update({
      where: { id },
      data,
      include: {
        Client: true,
        Promotion: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json({ message: "Server error updating payment" }, { status: 500 });
  }
}
