export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  try {
    const [todayAppointments, recentCalls, allPets] = await Promise.all([
      prisma.lead.findMany({
        where: { appointmentStart: { gte: todayStart, lt: todayEnd } },
        include: { pets: true },
        orderBy: { appointmentStart: "asc" },
      }),
      prisma.lead.findMany({
        take: 20,
        orderBy: { updatedAt: "desc" },
        include: { pets: true },
      }),
      prisma.lead.findMany({
        where: { pets: { some: {} } },
        include: { pets: { orderBy: { createdAt: "asc" } } },
        orderBy: { fullName: "asc" },
      }),
    ]);

    return NextResponse.json({ todayAppointments, recentCalls, allPets });
  } catch (err) {
    console.error("[dashboard/leads]", err);
    return NextResponse.json(
      { todayAppointments: [], recentCalls: [], allPets: [] },
      { status: 500 }
    );
  }
}
