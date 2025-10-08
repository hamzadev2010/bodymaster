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
    // dd/MM/yyyy -> yyyy-MM-dd
    const m1 = raw.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m1) {
      const [_match, d, m, y] = m1;
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
  try {
    // Check if database URL is available
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL environment variable is not set");
      return NextResponse.json({ error: "Database configuration missing" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    const where = includeDeleted ? {} : { isdeleted: false };
    
    console.log("Fetching clients from database...");
    const clients = await prisma.client.findMany({ where, orderBy: { createdat: "desc" } });
    console.log(`Successfully fetched ${clients.length} clients`);
    
    // Transform field names to match frontend expectations
    const transformedClients = clients.map(client => ({
      ...client,
      fullName: client.fullname,
      firstName: client.firstname,
      lastName: client.lastname,
      dateOfBirth: client.dateofbirth,
      nationalId: client.nationalid,
      registrationDate: client.registrationdate,
      createdAt: client.createdat,
      updatedAt: client.updatedat,
    }));
    return NextResponse.json(transformedClients);
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: "Database connection error" }, { status: 503 });
  }
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
        isdeleted: false,
        OR: [
          { fullname: fullName },
          ...(nationalId ? [{ nationalid: nationalId }] : []),
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
      fullname: fullName,
      firstname: firstName,
      lastname: lastName,
      email,
      phone,
      notes: rawNotes,
      dateofbirth: dob,
      nationalid: nationalId ? nationalId.toUpperCase() : null,
      registrationdate: parseDateLoose(data.registrationDate) || undefined,
      subscriptionperiod: data.subscriptionPeriod ?? null,
      haspromotion: Boolean(data.hasPromotion),
      promotionperiod: data.promotionPeriod ?? null,
      isdeleted: false,
    } as const;

    try {
      const created = await prisma.client.create({ data: payload });
      try {
        await prisma.clientHistory.create({
          data: { clientid: created.id, action: "CREATE", changes: JSON.stringify(created) },
        });
      } catch (histErr) {
        console.warn("POST /api/clients history log failed:", histErr);
      }
      return NextResponse.json(created, { status: 201 });
    } catch (e: unknown) {
      // Prisma unique violation (handle array or string meta.target)
      if (e && typeof e === 'object' && 'code' in e && e.code === "P2002") {
        const target = 'meta' in e && e.meta && typeof e.meta === 'object' && 'target' in e.meta ? e.meta.target : undefined;
        const message = 'message' in e ? String(e.message) : "";
        const msg = (typeof target === "string" ? target : Array.isArray(target) ? target.join(",") : "") + message;
        if (msg.toLowerCase().includes("email")) {
          return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
        }
        return NextResponse.json({ error: "Contrainte d'unicité violée" }, { status: 409 });
      }
      console.error("POST /api/clients error:", e);
      const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const clientId = Number(data.id);

    if (!clientId || isNaN(clientId)) {
      return NextResponse.json({ error: "ID client invalide" }, { status: 400 });
    }

    // Check if client exists and is not already deleted
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, fullname: true, isdeleted: true }
    });

    if (!client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    if (client.isdeleted) {
      return NextResponse.json({ error: "Client déjà supprimé" }, { status: 400 });
    }

    // Soft delete the client
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        isdeleted: true,
        deletedat: new Date(),
        updatedat: new Date(),
      },
    });

    // Log the deletion in history
    try {
      await prisma.clientHistory.create({
        data: { 
          clientid: clientId, 
          action: "DELETE", 
          changes: JSON.stringify({ fullname: client.fullname, deletedat: updated.deletedat })
        },
      });
    } catch (histErr) {
      console.warn("DELETE /api/clients history log failed:", histErr);
    }

    return NextResponse.json({ success: true, message: "Client supprimé avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


