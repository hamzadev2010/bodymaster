import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id: idStr } = await params;
	const id = Number(idStr);
	const coach = await prisma.coach.findUnique({ where: { id } });
	if (!coach) return NextResponse.json({ message: "Not found" }, { status: 404 });
	return NextResponse.json(coach);
}

export async function PUT(request: Request, { params }: Params) {
	const { id: idStr } = await params;
	const id = Number(idStr);
	const data = await request.json();
	const updated = await prisma.coach.update({
		where: { id },
		data: {
			fullName: String(data.fullName),
			specialty: data.specialty?.toString().trim() ? data.specialty.toString().trim() : null,
			email: data.email?.toString().trim() ? data.email.toString().trim() : null,
			phone: data.phone?.toString().trim() ? data.phone.toString().trim() : null,
			notes: data.notes?.toString().trim() ? data.notes.toString().trim() : null,
			dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
			nationalId: data.nationalId?.toString().trim() ? data.nationalId.toString().trim() : null,
			registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,
			subscriptionPeriod: data.subscriptionPeriod ?? null,
			hasPromotion: Boolean(data.hasPromotion),
			promotionPeriod: data.promotionPeriod ?? null,
		},
	});

	await prisma.coachHistory.create({
		data: { coachId: id, action: "UPDATE", changes: JSON.stringify(updated) },
	});
	return NextResponse.json(updated);
}

export async function DELETE() {
    return new NextResponse("Method Not Allowed", { status: 405 });
}
