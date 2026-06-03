import { NextRequest, NextResponse } from "next/server";

// TODO: Wire Google Calendar OAuth. Exchange refresh token for access token,
// then POST to the Calendar Events API with the attendees list to create the event
// and send invites.

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

  const { start, end, title } = body;
  if (typeof start !== "string" || !start.trim()) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }
  if (typeof end !== "string" || !end.trim()) {
    return NextResponse.json({ error: "end is required" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  return NextResponse.json({ created: false, message: "Google Calendar not yet configured" });
}
