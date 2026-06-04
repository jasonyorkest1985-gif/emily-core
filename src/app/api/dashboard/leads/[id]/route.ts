import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id } = params;

  // Build update object — only include fields that are explicitly provided
  const data: Record<string, unknown> = {};
  const str = (k: string) => {
    if (k in body) data[k] = typeof body[k] === "string" ? (body[k] as string).trim() || null : null;
  };

  str("firstName");
  str("lastName");
  str("phone");
  str("secondaryPhone");
  str("email");
  str("address");

  // Keep fullName in sync when name fields change
  if ("firstName" in body || "lastName" in body) {
    try {
      const current = await prisma.lead.findUnique({
        where: { id },
        select: { firstName: true, lastName: true },
      });
      const first = (data.firstName as string | null) ?? current?.firstName ?? "";
      const last = (data.lastName as string | null) ?? current?.lastName ?? "";
      data.fullName = [first, last].filter(Boolean).join(" ") || null;
    } catch {
      // non-fatal — fullName will just stay stale
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: { pets: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("[dashboard/leads PATCH]", err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
