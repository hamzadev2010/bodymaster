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
		const coach = await prisma.coach.findUnique({ where: { id } });
		if (!coach) return NextResponse.json({ message: "Not found" }, { status: 404 });
		return NextResponse.json(coach);
	} catch (error) {
		console.error("Error fetching coach:", error);
		return NextResponse.json({ message: "Internal server error" }, { status: 500 });
	}
}

export async function PUT(request: Request, { params }: Params) {
	const { id: idStr } = await params;
	const id = Number(idStr);
	const data = await request.json();
	
	const prisma = await getPrisma();
	const updated = await prisma.coach.update({
		where: { id },
		data: {
			fullname: String(data.fullName),
			specialty: data.specialty?.toString().trim() ? data.specialty.toString().trim() : null,
			email: data.email?.toString().trim() ? data.email.toString().trim() : null,
			phone: data.phone?.toString().trim() ? data.phone.toString().trim() : null,
			notes: data.notes?.toString().trim() ? data.notes.toString().trim() : null,
			dateofbirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
			nationalid: data.nationalId?.toString().trim() ? data.nationalId.toString().trim().toUpperCase() : null,
			registrationdate: data.registrationDate ? new Date(data.registrationDate) : undefined,
			subscriptionperiod: data.subscriptionPeriod ?? null,
			haspromotion: Boolean(data.hasPromotion),
			promotionperiod: data.promotionPeriod ?? null,
		},
	});

	await prisma.coachHistory.create({
		data: { coachid: id, action: "UPDATE", changes: JSON.stringify(updated) },
	});
	return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID coach invalide" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Check if coach exists and is not already deleted
    const coach = await prisma.coach.findUnique({
      where: { id },
      select: { id: true, fullname: true, isdeleted: true }
    });

    if (!coach) {
      return NextResponse.json({ error: "Coach introuvable" }, { status: 404 });
    }

    if (coach.isdeleted) {
      return NextResponse.json({ error: "Coach déjà supprimé" }, { status: 400 });
    }

    // Soft delete the coach
    const updated = await prisma.coach.update({
      where: { id },
      data: {
        isdeleted: true,
        deletedat: new Date(),
        updatedat: new Date(),
      },
    });

    // Log the deletion in history
    try {
      await prisma.coachHistory.create({
        data: { 
          coachid: id, 
          action: "DELETE", 
          changes: JSON.stringify({ fullname: coach.fullname, deletedat: updated.deletedat })
        },
      });
    } catch (histErr) {
      console.warn("DELETE /api/coaches/[id] history log failed:", histErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
