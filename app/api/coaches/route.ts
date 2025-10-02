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

// Top-level sanitize helper
function sanitize(input: unknown, { max = 120, pattern }: { max?: number; pattern?: RegExp } = {}) {
  let s = (input ?? "").toString().replace(/[<>]/g, "").trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (pattern && s && !pattern.test(s)) s = "";
  return s || null;
}

export async function GET() {
  const coaches = await prisma.coach.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coaches);
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
      fullName,
      specialty,
      email,
      phone,
      notes,
      dateOfBirth: parseDateLoose(data.dateOfBirth),
      nationalId,
      registrationDate: parseDateLoose(data.registrationDate) || undefined,
      subscriptionPeriod: data.subscriptionPeriod ?? null,
      hasPromotion: Boolean(data.hasPromotion),
      promotionPeriod: data.promotionPeriod ?? null,
    } as const;

    try {
      const created = await prisma.coach.create({ data: payload as any });
      try {
        await prisma.coachHistory.create({
          data: { coachId: created.id, action: "CREATE", changes: JSON.stringify(created) },
        });
      } catch (histErr) {
        console.warn("POST /api/coaches history log failed:", histErr);
      }
      return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
      if (e?.code === "P2002" && Array.isArray(e.meta?.target) && e.meta.target.includes("email")) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
      }
      console.error("POST /api/coaches error:", e);
      return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}

