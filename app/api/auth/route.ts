import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Simple credential check using environment variables
// Set AUTH_USER and AUTH_PASS in your environment. Example in .env:
// AUTH_USER=admin
// AUTH_PASS=strong_password
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json().catch(() => ({ username: "", password: "" }));
    if (!username || !password) {
      return NextResponse.json({ error: "Identifiants manquants" }, { status: 400 });
    }
    const expectedUser = process.env.AUTH_USER || "admin";
    const expectedPass = process.env.AUTH_PASS || "admin123";

    // Constant-time-ish comparison (basic)
    const ok = username === expectedUser && password === expectedPass;
    if (!ok) {
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // Optionally, we could set an httpOnly cookie here; for now client uses localStorage for gating.
    return NextResponse.json({ ok: true, user: { username } }, { status: 200 });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
