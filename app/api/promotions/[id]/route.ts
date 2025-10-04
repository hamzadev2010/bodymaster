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

export async function GET(_req: Request, { params }: Params) {
    try {
        const { id: idStr } = await params;
        const id = Number(idStr);
        const prisma = await getPrisma();
        const promotion = await prisma.promotion.findUnique({ where: { id } });
        if (!promotion) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(promotion);
    } catch (e: unknown) {
        console.error("GET /api/promotions/[id] error:", e);
        const errorMessage = e instanceof Error ? e.message : "Server error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: Params) {
    try {
        const { id: idStr } = await params;
        const id = Number(idStr);
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

        const prisma = await getPrisma();
        const updated = await prisma.promotion.update({
            where: { id },
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

        await prisma.promotionHistory.create({
            data: { promotionid: id, action: "UPDATE", changes: JSON.stringify(updated) },
        });
        return NextResponse.json(updated);
    } catch (e: unknown) {
        console.error("PUT /api/promotions/[id] error:", e);
        const errorMessage = e instanceof Error ? e.message : "Server error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function DELETE() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}
