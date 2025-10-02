import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || !Number.isFinite(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
    await prisma.presence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
