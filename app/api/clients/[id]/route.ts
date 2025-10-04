import { NextResponse } from "next/server";

// Vercel-compatible configuration
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

// Dynamic route handler that prevents build-time analysis
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    
    // Lazy import Prisma only at runtime
    const { default: prisma } = await import("@/app/lib/prisma");
    
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
    
    if (!includeDeleted && client.deletedat) {
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
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clientId = Number(id);
    
    if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    
    const data = await req.json();
    
    // Lazy import Prisma only at runtime
    const { default: prisma } = await import("@/app/lib/prisma");
    
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
export async function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}