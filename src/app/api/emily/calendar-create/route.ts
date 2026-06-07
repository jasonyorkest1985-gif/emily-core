import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/googleAuth";

interface CalendarEvent {
  id: string;
  htmlLink?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseDate(value: string, fieldName: string): Date | NextResponse {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: `${fieldName} must be a valid date/time` }, { status: 400 });
  }
  return date;
}

function normalizeAttendees(body: Record<string, unknown>): { email: string }[] {
  const attendees = body.attendees;

  if (Array.isArray(attendees)) {
    return attendees
      .map((attendee) => {
        if (typeof attendee === "string" && attendee.trim()) {
          return { email: attendee.trim() };
        }

        if (
          isRecord(attendee) &&
          typeof attendee.email === "string" &&
          attendee.email.trim()
        ) {
          return { email: attendee.email.trim() };
        }

        return null;
      })
      .filter((attendee): attendee is { email: string } => attendee !== null);
  }

  const attendeeEmail = getString(body, "attendeeEmail");
  return attendeeEmail ? [{ email: attendeeEmail }] : [];
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const startRaw = getString(body, "start");
  const endRaw = getString(body, "end");
  const title = getString(body, "title");
  const description = getString(body, "description");
  const location = getString(body, "location");
  const calendarEmail = getString(body, "calendarEmail");
  const timeZone = getString(body, "timeZone") ?? "America/Chicago";

  if (!startRaw) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }

  if (!endRaw) {
    return NextResponse.json({ error: "end is required" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const startDate = parseDate(startRaw, "start");
  if (startDate instanceof NextResponse) return startDate;

  const endDate = parseDate(endRaw, "end");
  if (endDate instanceof NextResponse) return endDate;

  if (endDate.getTime() <= startDate.getTime()) {
    return NextResponse.json({ error: "end must be after start" }, { status: 400 });
  }

  const calendarId = calendarEmail ?? "primary";
  const attendees = normalizeAttendees(body);

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google auth error" },
      { status: 503 }
    );
  }

  const eventRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        description,
        location,
        start: {
          dateTime: startDate.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone,
        },
        attendees,
      }),
    }
  );

  if (!eventRes.ok) {
    const text = await eventRes.text();
    return NextResponse.json({ error: `Google API error: ${text}` }, { status: 502 });
  }

  const event = (await eventRes.json()) as CalendarEvent;

  return NextResponse.json({
    created: true,
    eventId: event.id,
    htmlLink: event.htmlLink,
    link: event.htmlLink,
    calendarId,
  });
}
