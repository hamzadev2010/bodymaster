import { NextResponse } from "next/server";

export const revalidate = 30;

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
			nationalid: data.nationalId?.toString().trim() ? data.nationalId.toString().trim() : null,
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

export async function DELETE() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}
