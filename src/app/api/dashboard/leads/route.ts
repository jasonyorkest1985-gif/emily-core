export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const petOrder = { orderBy: { createdAt: "asc" as const } };

export async function GET() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  try {
    const [todayAppointments, recentCalls, allCustomers] = await Promise.all([
      prisma.lead.findMany({
        where: { appointmentStart: { gte: todayStart, lt: todayEnd } },
        include: { pets: petOrder },
        orderBy: { appointmentStart: "asc" },
      }),
      prisma.lead.findMany({
        take: 20,
        orderBy: { updatedAt: "desc" },
        include: { pets: petOrder },
      }),
      prisma.lead.findMany({
        include: { pets: petOrder },
        orderBy: [{ lastName: "asc" }, { fullName: "asc" }],
      }),
    ]);

    return NextResponse.json({ todayAppointments, recentCalls, allCustomers });
  } catch (err) {
    console.error("[dashboard/leads GET]", err);
    return NextResponse.json(
      { todayAppointments: [], recentCalls: [], allCustomers: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : null;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : null;
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || null;

  try {
    const lead = await prisma.lead.create({
      data: {
        phone,
        firstName,
        lastName,
        fullName,
        secondaryPhone: typeof body.secondaryPhone === "string" ? body.secondaryPhone.trim() || null : null,
        email: typeof body.email === "string" ? body.email.trim() || null : null,
        address: typeof body.address === "string" ? body.address.trim() || null : null,
      },
      include: { pets: petOrder },
    });
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    console.error("[dashboard/leads POST]", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
