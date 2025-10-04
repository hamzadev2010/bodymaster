import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdat: "desc" } });
    return NextResponse.json(promotions);
  } catch (e: unknown) {
    console.error("GET /api/promotions error:", e);
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => null);
    if (!data) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

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

    const subscriptionMonths = (data.subscriptionMonths !== undefined && data.subscriptionMonths !== null && data.subscriptionMonths !== "")
      ? Number(data.subscriptionMonths)
      : null;
    if (subscriptionMonths !== null && (!Number.isInteger(subscriptionMonths) || subscriptionMonths <= 0)) {
      return NextResponse.json({ error: "subscriptionMonths must be a positive integer" }, { status: 400 });
    }

    const created = await prisma.promotion.create({
      data: {
        name,
        notes: data.notes?.toString().trim() ? data.notes.toString().trim() : null,
        fixedprice: fixedPriceNum,
        subscriptionmonths: subscriptionMonths,
        startdate: startDate,
        enddate: endDate,
        active: data.active ?? true,
      },
    });
    try {
      await prisma.promotionHistory.create({
        data: { promotionid: created.id, action: "CREATE", changes: JSON.stringify(created) },
      });
    } catch (histErr) {
      console.warn("POST /api/promotions history log failed:", histErr);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    console.error("POST /api/promotions error:", e);
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
