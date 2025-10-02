import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";

function parseDateLoose(input: any): Date | null {
  if (!input) return null;
  try {
    const raw = String(input).trim();
    if (!raw) return null;
    const m1 = raw.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const [_, d, m, y] = m1;
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dt = new Date(iso);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "1";
  const client = await prisma.client.findUnique({ where: { id } });
  if (!includeDeleted && client?.deletedAt) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!client) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const data = await request.json();

    const fullName = String(data.fullName || "").trim().toUpperCase();
    if (!fullName) {
      return NextResponse.json({ error: "Le nom complet est requis" }, { status: 400 });
    }

    const email = data.email?.toString().trim() || null;
    const rawNotes = data.notes?.toString().trim() || null;
    if (rawNotes && rawNotes.length > 75) {
      return NextResponse.json({ error: "Les notes ne doivent pas dépasser 75 caractères" }, { status: 400 });
    }
    const nationalId = data.nationalId?.toString().trim().toUpperCase() || null;

    // Uniqueness: no other active client with same fullName or nationalId
    const existing = await prisma.client.findFirst({
      where: {
        id: { not: id },
        deletedAt: null,
        OR: [
          { fullName: fullName },
          ...(nationalId ? [{ nationalId }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Un autre client avec le même nom complet ou N° carte nationale existe déjà" }, { status: 409 });
    }

    // Validate age >= 13 if DOB provided
    const dob = parseDateLoose(data.dateOfBirth);
    if (dob) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 13);
      if (dob > cutoff) {
        return NextResponse.json({ error: "L'âge minimum est 13 ans" }, { status: 400 });
      }
    }

    const current = await prisma.client.findUnique({ where: { id }, select: { id: true, fullName: true } });
    if (!current) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

    // Restrict fullName change to once per 15 days
    if (fullName !== current.fullName) {
      const hist = await prisma.clientHistory.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      // Find the most recent entry where fullName changed (compare consecutive snapshots)
      let lastChangeAt: Date | null = null;
      for (let i = 0; i < hist.length - 1; i++) {
        try {
          const a = JSON.parse(hist[i].changes || "{}");
          const b = JSON.parse(hist[i+1].changes || "{}");
          if (a?.fullName && b?.fullName && a.fullName !== b.fullName) {
            lastChangeAt = new Date(hist[i].createdAt as any);
            break;
          }
        } catch {}
      }
      if (!lastChangeAt && hist.length > 0) {
        // Also compare with current DB value if only one history entry exists
        try {
          const a = JSON.parse(hist[0].changes || "{}");
          if (a?.fullName && a.fullName === current.fullName) {
            // Name was set in last update; treat that time as last change
            lastChangeAt = new Date(hist[0].createdAt as any);
          }
        } catch {}
      }
      if (lastChangeAt) {
        const days15 = 15 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastChangeAt.getTime() < days15) {
          return NextResponse.json({ error: "Le nom complet ne peut être modifié qu'une seule fois tous les 15 jours" }, { status: 429 });
        }
      }
    }

    const payload = {
      fullName,
      firstName: data.firstName?.toString().trim() ? data.firstName.toString().trim() : null,
      lastName: data.lastName?.toString().trim() ? data.lastName.toString().trim() : null,
      email,
      phone: data.phone?.toString().trim() ? data.phone.toString().trim().replace(/[^0-9]/g, "").slice(0,12) : null,
      notes: rawNotes,
      dateOfBirth: dob,
      nationalId,
      registrationDate: parseDateLoose(data.registrationDate) || undefined,
      subscriptionPeriod: data.subscriptionPeriod ?? null,
      hasPromotion: Boolean(data.hasPromotion),
      promotionPeriod: data.promotionPeriod ?? null,
    } as const;

    try {
      const updated = await prisma.client.update({
        where: { id },
        data: payload as any,
        include: { history: true },
      });
      await prisma.clientHistory.create({
        data: { clientId: id, action: "UPDATE", changes: JSON.stringify(updated) },
      });
      return NextResponse.json(updated);
    } catch (e: any) {
      if (e?.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("email")) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
      }
      console.error("PUT /api/clients/[id] error:", e);
      return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}


