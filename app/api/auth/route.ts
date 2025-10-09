import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { username, password } = data;

    // Simple authentication - you can customize this
    // For now, accept any non-empty username and password
    if (username && password) {
      // You can add your own authentication logic here
      // For example, check against hardcoded credentials or call your PHP API
      
      // Simple check (customize this):
      if (username === "admin" && password === "admin123") {
        return NextResponse.json({ success: true, user: username });
      }
      
      // Or allow any login for development:
      return NextResponse.json({ success: true, user: username });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

