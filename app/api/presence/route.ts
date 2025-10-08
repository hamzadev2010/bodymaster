import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/presence?year=YYYY&month=MM&day=DD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const day = searchParams.get("day");

  let start: Date | null = null;
  let end: Date | null = null;
  try {
    if (year && !/^[0-9]{4}$/.test(year)) throw new Error("invalid year");
    if (month && !/^(0?[1-9]|1[0-2])$/.test(month)) throw new Error("invalid month");
    if (day && !/^([0-2]?[0-9]|3[01])$/.test(day)) throw new Error("invalid day");

    if (year && month && day) {
      const y = Number(year);
      const m = Number(month) - 1;
      const d = Number(day);
      start = new Date(Date.UTC(y, m, d, 0, 0, 0));
      end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    } else {
      // Default: today
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const d = now.getUTCDate();
      start = new Date(Date.UTC(y, m, d, 0, 0, 0));
      end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
    }
  } catch {}

  const where: any = { isdeleted: false };
  if (start && end) where.time = { gte: start, lt: end };

  try {
    const presences = await prisma.presence.findMany({
      where,
      include: { 
        Client: { 
          select: { id: true, fullname: true, phone: true }
        }
      },
      orderBy: { time: "desc" },
    });
    return NextResponse.json(presences);
  } catch (e: unknown) {
    // Most common cause: database not migrated (table Presence missing)
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur lors du chargement des présences";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/presence { clientId, time? }
export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => null);
    if (!data) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const clientId = Number(data.clientId);
    if (!clientId || !Number.isFinite(clientId)) return NextResponse.json({ error: "clientId invalide" }, { status: 400 });
    const time = data.time ? new Date(data.time) : new Date();
    if (isNaN(time.getTime())) return NextResponse.json({ error: "time invalide" }, { status: 400 });

    // ensure client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

    // 1) Prevent double check-in for the same person on the same day (UTC day)
    try {
      const y = time.getUTCFullYear();
      const m = time.getUTCMonth();
      const d = time.getUTCDate();
      const start = new Date(Date.UTC(y, m, d, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
      const existingToday = await prisma.presence.findFirst({
        where: { clientid: clientId, time: { gte: start, lt: end }, isdeleted: false },
        select: { id: true },
      });
      if (existingToday) {
        return NextResponse.json(
          { error: "Ce client a déjà été pointé aujourd'hui" },
          { status: 409 }
        );
      }
    } catch {}

    // 2) Block check-in for clients who are not up to date on payments
    try {
      const latestPayment = await prisma.payment.findFirst({
        where: { clientid: clientId, isdeleted: false },
        orderBy: { paymentdate: "desc" },
        select: { id: true, nextpaymentdate: true },
      });
      const now = new Date();
      if (!latestPayment || !latestPayment.nextpaymentdate || new Date(latestPayment.nextpaymentdate) <= now) {
        return NextResponse.json(
          { error: "Client non à jour de paiement. Pointage refusé." },
          { status: 403 }
        );
      }
    } catch {}

    const created = await prisma.presence.create({ data: { clientid: clientId, time } });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
