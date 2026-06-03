import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phoneNumber =
    body !== null && typeof body === "object" && "phoneNumber" in body
      ? (body as { phoneNumber: unknown }).phoneNumber
      : undefined;

  if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({ where: { phone: phoneNumber.trim() } });
    if (!lead) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, lead });
  } catch (err) {
    console.error("[lookup-caller]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
