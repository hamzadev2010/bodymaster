import { NextResponse } from "next/server";

// Vercel-compatible configuration
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    // Lazy import Prisma only at runtime to prevent build-time issues
    const { default: prisma } = await import("@/app/lib/prisma");
    
    // Simple health check query
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json({ 
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      error: "Database connection failed"
    }, { status: 503 });
  }
}