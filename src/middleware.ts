import { NextRequest, NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/dashboard/login") {
    return NextResponse.next();
  }

  const secret = process.env.DASHBOARD_PASSWORD;

  if (!secret) {
    return NextResponse.redirect(new URL("/dashboard/login", req.url));
  }

  const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const valid = await verifySession(secret, token);

  if (!valid) {
    return NextResponse.redirect(new URL("/dashboard/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
