import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Lazy import Prisma to avoid build-time initialization
async function getPrisma() {
  const { default: prisma } = await import("@/app/lib/prisma");
  return prisma;
}

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || !Number.isFinite(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
    const prisma = await getPrisma();
    await prisma.presence.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
