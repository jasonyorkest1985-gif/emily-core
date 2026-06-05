import { NextRequest, NextResponse } from "next/server";
import { signSession, COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const secret = process.env.DASHBOARD_PASSWORD;

    if (!secret) {
      return NextResponse.json(
        { error: "Dashboard login is not configured." },
        { status: 500 }
      );
    }

    if (password !== secret) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }

    const sessionValue = await signSession(secret);

    const res = NextResponse.json({ success: true });

    res.cookies.set(COOKIE_NAME, sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
