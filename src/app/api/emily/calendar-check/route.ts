import { NextRequest, NextResponse } from "next/server";

// TODO: Wire Google Calendar OAuth. Store refresh token per user, exchange for access token,
// call the freebusy API, then compute available slots from the response.

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

  const { start, end, durationMinutes } = body;
  if (typeof start !== "string" || !start.trim()) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }
  if (typeof end !== "string" || !end.trim()) {
    return NextResponse.json({ error: "end is required" }, { status: 400 });
  }
  if (typeof durationMinutes !== "number") {
    return NextResponse.json({ error: "durationMinutes is required" }, { status: 400 });
  }

  return NextResponse.json({ availableSlots: [] });
}
