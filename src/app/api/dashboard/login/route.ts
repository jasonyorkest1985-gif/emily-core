import { NextRequest, NextResponse } from "next/server";

async function signSession(secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("heads-and-tails-dashboard")
  );

  return Buffer.from(signature).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const realPassword = process.env.DASHBOARD_PASSWORD;
    const secret = process.env.DASHBOARD_SECRET;

    if (!realPassword || !secret) {
      return NextResponse.json(
        { error: "Dashboard login is not configured." },
        { status: 500 }
      );
    }

    if (password !== realPassword) {
      return NextResponse.json(
        { error: "Wrong password." },
        { status: 401 }
      );
    }

    const sessionValue = await signSession(secret);

    const res = NextResponse.json({ success: true });

    res.cookies.set("dashboard_session", sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
