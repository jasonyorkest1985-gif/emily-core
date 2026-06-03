import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query } = body;
  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const term = query.trim();

  try {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { fullName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("[find-contact]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
