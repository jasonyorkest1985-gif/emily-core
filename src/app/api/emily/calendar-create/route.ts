import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/googleAuth";

interface CalendarEvent {
  id: string;
  htmlLink: string;
}

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

  const { start, end, title, description, attendeeEmail } = body;
  if (typeof start !== "string" || !start.trim()) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }
  if (typeof end !== "string" || !end.trim()) {
    return NextResponse.json({ error: "end is required" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google auth error" },
      { status: 503 }
    );
  }

  const attendees =
    typeof attendeeEmail === "string" && attendeeEmail.trim()
      ? [{ email: attendeeEmail.trim() }]
      : [];

  const eventRes = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        description: typeof description === "string" ? description : undefined,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees,
      }),
    }
  );

  if (!eventRes.ok) {
    const text = await eventRes.text();
    return NextResponse.json({ error: `Google API error: ${text}` }, { status: 502 });
  }

  const event = (await eventRes.json()) as CalendarEvent;
  return NextResponse.json({ created: true, eventId: event.id, link: event.htmlLink });
}
