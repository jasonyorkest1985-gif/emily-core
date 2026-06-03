import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DB_TIMEOUT_MS = 5000;

function notFound() {
  return NextResponse.json({ found: false });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[lookup-caller] failed to parse request body:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phoneNumber =
    body !== null && typeof body === "object" && "phoneNumber" in body
      ? (body as { phoneNumber: unknown }).phoneNumber
      : undefined;

  if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
  }

  const phone = phoneNumber.trim();

  let lead;
  try {
    lead = await Promise.race([
      prisma.lead.findUnique({ where: { phone } }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`DB timeout after ${DB_TIMEOUT_MS}ms`)),
          DB_TIMEOUT_MS
        )
      ),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[lookup-caller] DB error for phone=${phone}:`, message, err);
    // Return { found: false } so Emily can continue the call rather than hang up
    return notFound();
  }

  if (!lead) {
    console.log(`[lookup-caller] no lead found for phone=${phone}`);
    return notFound();
  }

  console.log(`[lookup-caller] found lead id=${lead.id} for phone=${phone}`);
  return NextResponse.json({ found: true, lead });
}
