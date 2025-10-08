import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import type { DateInput } from "@/app/types";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

function parseDateLoose(input: DateInput): Date | null {
  if (!input) return null;
  try {
    const raw = String(input).trim();
    if (!raw) return null;
    const m1 = raw.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const [_match, d, m, y] = m1;
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

// Top-level sanitize helper
function sanitize(input: unknown, { max = 120, pattern }: { max?: number; pattern?: RegExp } = {}) {
  let s = (input ?? "").toString().replace(/[<>]/g, "").trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (pattern && s && !pattern.test(s)) s = "";
  return s || null;
}

export async function GET() {
  try {
    const coaches = await prisma.coach.findMany({ 
      where: { isdeleted: false },
      orderBy: { createdat: "desc" },
      select: {
        id: true,
        fullname: true,
        specialty: true,
        email: true,
        phone: true,
        notes: true,
        dateofbirth: true,
        nationalid: true,
        registrationdate: true,
        endofservicedate: true,
        subscriptionperiod: true,
        haspromotion: true,
        promotionperiod: true,
        createdat: true,
        updatedat: true,
        deletedat: true,
        isdeleted: true
      }
    });
    // Transform field names to match frontend expectations
    const transformedCoaches = coaches.map(coach => ({
      ...coach,
      fullName: coach.fullname,
      dateOfBirth: coach.dateofbirth,
      nationalId: coach.nationalid,
      registrationDate: coach.registrationdate,
      endOfServiceDate: coach.endofservicedate,
      createdAt: coach.createdat,
      updatedAt: coach.updatedat,
    }));
    return NextResponse.json(transformedCoaches);
  } catch (error) {
    console.error('GET /api/coaches error:', error);
    return NextResponse.json({ error: "Database connection error" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const fullName = sanitize(data.fullName, { max: 80, pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/ }) || "";
    if (!fullName) {
      return NextResponse.json({ error: "Le nom complet est requis" }, { status: 400 });
    }
    const email = sanitize(data.email, { max: 120 })?.toLowerCase() || null;
    const specialty = sanitize(data.specialty, { max: 80 });
    const phoneRaw = (data.phone ?? "").toString();
    const phone = phoneRaw ? phoneRaw.replace(/[^0-9+]/g, "").slice(0, 12) : null;
    const notes = sanitize(data.notes, { max: 120 });
    const nationalId = sanitize(data.nationalId, { max: 30, pattern: /^[A-Za-z0-9]+$/ });
    const payload = {
      fullname: fullName,
      specialty,
      email,
      phone,
      notes,
      dateofbirth: parseDateLoose(data.dateOfBirth),
      nationalid: nationalId ? nationalId.toUpperCase() : null,
      registrationdate: parseDateLoose(data.registrationDate) || undefined,
      endofservicedate: parseDateLoose(data.endOfServiceDate) || null,
      subscriptionperiod: data.subscriptionPeriod ?? null,
      haspromotion: Boolean(data.hasPromotion),
      promotionperiod: data.promotionPeriod ?? null,
    } as const;

    try {
      const created = await prisma.coach.create({ data: payload });
      try {
        await prisma.coachHistory.create({
          data: { coachid: created.id, action: "CREATE", changes: JSON.stringify(created) },
        });
      } catch (histErr) {
        console.warn("POST /api/coaches history log failed:", histErr);
      }
      return NextResponse.json(created, { status: 201 });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === "P2002" && 
          'meta' in e && e.meta && typeof e.meta === 'object' && 'target' in e.meta && 
          Array.isArray(e.meta.target) && e.meta.target.includes("email")) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
      }
      console.error("POST /api/coaches error:", e);
      const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const coachId = Number(data.id);

    if (!coachId || isNaN(coachId)) {
      return NextResponse.json({ error: "ID coach invalide" }, { status: 400 });
    }

    // Check if coach exists and is not already deleted
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
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
      where: { id: coachId },
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
          coachid: coachId, 
          action: "DELETE", 
          changes: JSON.stringify({ fullname: coach.fullname, deletedat: updated.deletedat })
        },
      });
    } catch (histErr) {
      console.warn("DELETE /api/coaches history log failed:", histErr);
    }

    return NextResponse.json({ success: true, message: "Coach supprimé avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

