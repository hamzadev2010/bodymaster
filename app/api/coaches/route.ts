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
    const coaches = await prisma.coach.findMany({ orderBy: { createdat: "desc" } });
    return NextResponse.json(coaches);
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
      nationalid: nationalId,
      registrationdate: parseDateLoose(data.registrationDate) || undefined,
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

