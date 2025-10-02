import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
export const runtime = "nodejs";

function parseDateLoose(input: any): Date | null {
  if (!input) return null;
  try {
    const raw = String(input).trim();
    if (!raw) return null;
    // dd/MM/yyyy -> yyyy-MM-dd
    const m1 = raw.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const [_, d, m, y] = m1;
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dt = new Date(iso);
      return isNaN(dt.getTime()) ? null : dt;
    }
    // yyyy-MM-dd or full ISO
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

// Top-level sanitize helper (module scope)
function sanitize(input: unknown, { max = 120, pattern }: { max?: number; pattern?: RegExp } = {}) {
  let s = (input ?? "").toString().replace(/[<>]/g, "").trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (pattern && s && !pattern.test(s)) {
    s = "";
  }
  return s || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "1";
  const where = includeDeleted ? {} : { deletedAt: null } as any;
  const clients = await prisma.client.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const fullName = (sanitize(data.fullName, { max: 80, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/ }) || "").toUpperCase();
    if (!fullName) {
      return NextResponse.json({ error: "Le nom complet est requis" }, { status: 400 });
    }

    const email = sanitize(data.email, { max: 120 })?.toLowerCase() || null;
    const rawNotes = sanitize(data.notes, { max: 75 });
    if (rawNotes && rawNotes.length > 75) {
      return NextResponse.json({ error: "Les notes ne doivent pas dépasser 75 caractères" }, { status: 400 });
    }
    const nationalId = sanitize(data.nationalId, { max: 30, pattern: /^[A-Za-z0-9]+$/ });
    const firstName = sanitize(data.firstName, { max: 60, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/ });
    const lastName = sanitize(data.lastName, { max: 60, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/ });
    const phoneRaw = (data.phone ?? "").toString();
    const phone = phoneRaw ? phoneRaw.replace(/[^0-9]/g, "").slice(0, 12) : null;

    // Enforce uniqueness on fullName OR nationalId (excluding soft-deleted records)
    const existing = await prisma.client.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { fullName: fullName },
          ...(nationalId ? [{ nationalId }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Un client avec le même nom complet ou N° carte nationale existe déjà" }, { status: 409 });
    }

    // Validate age >= 13
    const dob = parseDateLoose(data.dateOfBirth);
    if (dob) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 13);
      if (dob > cutoff) {
        return NextResponse.json({ error: "L'âge minimum est 13 ans" }, { status: 400 });
      }
    }

    const payload = {
      fullName,
      firstName,
      lastName,
      email,
      phone,
      notes: rawNotes,
      dateOfBirth: dob,
      nationalId: nationalId ? nationalId.toUpperCase() : null,
      registrationDate: parseDateLoose(data.registrationDate) || undefined,
      subscriptionPeriod: data.subscriptionPeriod ?? null,
      hasPromotion: Boolean(data.hasPromotion),
      promotionPeriod: data.promotionPeriod ?? null,
    } as const;

    try {
      const created = await prisma.client.create({ data: payload as any });
      try {
        await prisma.clientHistory.create({
          data: { clientId: created.id, action: "CREATE", changes: JSON.stringify(created) },
        });
      } catch (histErr) {
        console.warn("POST /api/clients history log failed:", histErr);
      }
      return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
      // Prisma unique violation (handle array or string meta.target)
      if (e?.code === "P2002") {
        const target = e?.meta?.target;
        const msg = (typeof target === "string" ? target : Array.isArray(target) ? target.join(",") : "") + (e?.message || "");
        if (msg.toLowerCase().includes("email")) {
          return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
        }
        return NextResponse.json({ error: "Contrainte d'unicité violée" }, { status: 409 });
      }
      console.error("POST /api/clients error:", e);
      return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
    }
  } catch (error: any) {
    const message = error?.message || "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


