import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Token exchange failed: ${text}` }, { status: 502 });
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  if (!data.refresh_token) {
    return NextResponse.json(
      { error: "No refresh_token returned — revoke app access and re-authorize." },
      { status: 502 }
    );
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  // Replace any existing token (singleton pattern — one Google account)
  await prisma.googleToken.deleteMany();
  await prisma.googleToken.create({
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true, message: "Google Calendar connected successfully." });
}
