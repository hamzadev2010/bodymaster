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

// Dynamic route handler that prevents build-time analysis
export async function GET(req: Request, { params }: Params) {
  // Force dynamic execution
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  
  try {
    const { id } = await params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }
    
    const clientId = Number(id);
    
    // Check if id is a valid number
    if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    
    const prisma = await getPrisma();
    
    const client = await prisma.client.findUnique({ 
      where: { id: clientId },
      include: {
        ClientHistory: {
          orderBy: { createdat: 'desc' },
          take: 10
        },
        Payment: {
          orderBy: { paymentdate: 'desc' },
          take: 5
        },
        Presence: {
          orderBy: { time: 'desc' },
          take: 10
        }
      }
    });
    
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    
    if (!includeDeleted && client.isdeleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    
    return NextResponse.json(client);
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    
    // Handle database connection errors
    if (error && typeof error === 'object' && 'code' in error) {
      return NextResponse.json({ error: "Database connection error" }, { status: 503 });
    }
    
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Simplified PUT handler
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const clientId = Number(id);
    
    if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    
    const data = await req.json();
    
    const prisma = await getPrisma();
    
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        fullname: data.fullName ? String(data.fullName).trim().toUpperCase() : undefined,
        email: data.email ? String(data.email).trim() : undefined,
        phone: data.phone ? String(data.phone).trim() : undefined,
        notes: data.notes ? String(data.notes).trim() : undefined,
      },
      include: { ClientHistory: true },
    });
    
    await prisma.clientHistory.create({
      data: { clientid: clientId, action: "UPDATE", changes: JSON.stringify(updated) },
    });
    
      return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const clientId = Number(idStr);

    if (!clientId || isNaN(clientId)) {
      return NextResponse.json({ error: "ID client invalide" }, { status: 400 });
    }

    const prisma = await getPrisma();

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

    // Also soft delete related payments and presence records
    try {
      await prisma.payment.updateMany({
        where: { clientid: clientId, isdeleted: false },
        data: {
          isdeleted: true,
          deletedat: new Date(),
          updatedat: new Date(),
        },
      });

      await prisma.presence.updateMany({
        where: { clientid: clientId, isdeleted: false },
        data: {
          isdeleted: true,
          deletedat: new Date(),
        },
      });
    } catch (relatedErr) {
      console.warn("Failed to soft delete related records:", relatedErr);
    }

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
      console.warn("DELETE /api/clients/[id] history log failed:", histErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}