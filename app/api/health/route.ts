import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "API routes disabled - using PHP backend",
    backend: process.env.NEXT_PUBLIC_API_URL || "Not configured"
  });
}

