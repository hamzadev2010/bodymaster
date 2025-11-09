import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { username, password } = data;

    // Only allow specific credentials
    if (username && password) {
      // Check for valid credentials:
      // 1. username "user" with password "user1999"
      // 2. username "user1999" with password "user1999"
      if ((username === "user" && password === "user1999") || 
          (username === "user1999" && password === "user1999")) {
        return NextResponse.json({ success: true, user: username });
      }
      
      // Reject all other credentials
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

