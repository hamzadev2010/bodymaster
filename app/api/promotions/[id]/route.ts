import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const promotion = await prisma.promotion.findUnique({ 
      where: { id, isdeleted: false } 
    });
    if (!promotion) return NextResponse.json({ message: "Not found" }, { status: 404 });
    
    const transformed = {
      id: promotion.id,
      name: promotion.name,
      notes: promotion.notes ?? null,
      fixedPrice: promotion.fixedprice,
      subscriptionMonths: promotion.subscriptionmonths ?? null,
      startDate: promotion.startdate,
      endDate: promotion.enddate ?? null,
      active: promotion.active ?? true,
      createdAt: promotion.createdat ?? null,
      updatedAt: promotion.updatedat ?? null,
      deletedAt: promotion.deletedat ?? null,
    };
    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const data = await request.json();

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID promotion invalide" }, { status: 400 });
    }

    const name = String(data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const fixedPriceNum = Number(data.fixedPrice);
    if (!Number.isFinite(fixedPriceNum)) return NextResponse.json({ error: "fixedPrice must be a number" }, { status: 400 });

    if (!data.startDate) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) return NextResponse.json({ error: "startDate is invalid" }, { status: 400 });

    let endDate: Date | null = null;
    if (data.endDate) {
      const ed = new Date(data.endDate);
      if (isNaN(ed.getTime())) return NextResponse.json({ error: "endDate is invalid" }, { status: 400 });
      endDate = ed;
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        name,
        notes: data.notes || null,
        fixedprice: fixedPriceNum,
        subscriptionmonths: data.subscriptionMonths || null,
        startdate: startDate,
        enddate: endDate,
        active: data.active ?? true,
        updatedat: new Date(),
      },
    });

    const transformed = {
      id: updated.id,
      name: updated.name,
      notes: updated.notes ?? null,
      fixedPrice: updated.fixedprice,
      subscriptionMonths: updated.subscriptionmonths ?? null,
      startDate: updated.startdate,
      endDate: updated.enddate ?? null,
      active: updated.active ?? true,
      createdAt: updated.createdat ?? null,
      updatedAt: updated.updatedat ?? null,
      deletedAt: updated.deletedat ?? null,
    };
    return NextResponse.json(transformed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID promotion invalide" }, { status: 400 });
    }

    // Check if promotion exists and is not already deleted
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      select: { id: true, name: true, isdeleted: true }
    });

    if (!promotion) {
      return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 });
    }

    if (promotion.isdeleted) {
      return NextResponse.json({ error: "Promotion déjà supprimée" }, { status: 400 });
    }

    // Soft delete the promotion
    await prisma.promotion.update({
      where: { id },
      data: {
        isdeleted: true,
        deletedat: new Date(),
        updatedat: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}