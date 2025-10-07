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
    const presence = await prisma.presence.findUnique({ 
      where: { id, isdeleted: false } 
    });
    if (!presence) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(presence);
  } catch (error) {
    console.error("Error fetching presence:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || !Number.isFinite(id)) return NextResponse.json({ error: "id invalide" }, { status: 400 });
    const prisma = await getPrisma();
    
    // Check if presence exists and is not already deleted
    const presence = await prisma.presence.findUnique({
      where: { id },
      select: { id: true, isdeleted: true }
    });

    if (!presence) {
      return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });
    }

    if (presence.isdeleted) {
      return NextResponse.json({ error: "Pointage déjà supprimé" }, { status: 400 });
    }

    // Soft delete the presence
    await prisma.presence.update({
      where: { id },
      data: {
        isdeleted: true,
        deletedat: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
