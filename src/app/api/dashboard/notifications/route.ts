import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("[notifications GET]", err);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ids } = await req.json();
    if (Array.isArray(ids) && ids.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({ data: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications PATCH]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
