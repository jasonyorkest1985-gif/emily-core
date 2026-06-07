import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/googleAuth";

interface FreeBusyResponse {
  calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseDate(value: string, fieldName: string): Date | NextResponse {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: `${fieldName} must be a valid date/time` }, { status: 400 });
  }
  return date;
}

function overlapsBusySlot(
  slotStartMs: number,
  slotEndMs: number,
  busySlots: { start: string; end: string }[]
): boolean {
  return busySlots.some((busy) => {
    const busyStartMs = new Date(busy.start).getTime();
    const busyEndMs = new Date(busy.end).getTime();

    if (Number.isNaN(busyStartMs) || Number.isNaN(busyEndMs)) {
      return false;
    }

    return busyStartMs < slotEndMs && busyEndMs > slotStartMs;
  });
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
  const durationMinutes = getNumber(body, "durationMinutes");
  const calendarEmail = getString(body, "calendarEmail");
  const timeZone = getString(body, "timeZone") ?? "America/Chicago";

  if (!startRaw) {
    return NextResponse.json({ error: "start is required" }, { status: 400 });
  }

  if (!endRaw) {
    return NextResponse.json({ error: "end is required" }, { status: 400 });
  }

  if (!durationMinutes || durationMinutes <= 0 || durationMinutes > 480) {
    return NextResponse.json(
      { error: "durationMinutes must be a positive number no greater than 480" },
      { status: 400 }
    );
  }

  const startDate = parseDate(startRaw, "start");
  if (startDate instanceof NextResponse) return startDate;

  const endDate = parseDate(endRaw, "end");
  if (endDate instanceof NextResponse) return endDate;

  if (endDate.getTime() <= startDate.getTime()) {
    return NextResponse.json({ error: "end must be after start" }, { status: 400 });
  }

  const calendarId = calendarEmail ?? "primary";

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google auth error" },
      { status: 503 }
    );
  }

  const freeBusyRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      timeZone,
      items: [{ id: calendarId }],
    }),
  });

  if (!freeBusyRes.ok) {
    const text = await freeBusyRes.text();
    return NextResponse.json({ error: `Google API error: ${text}` }, { status: 502 });
  }

  const freeBusy = (await freeBusyRes.json()) as FreeBusyResponse;
  const busySlots = freeBusy.calendars?.[calendarId]?.busy ?? [];

  const slotMs = durationMinutes * 60 * 1000;
  const availableSlots: { start: string; end: string }[] = [];

  for (
    let cursorMs = startDate.getTime();
    cursorMs + slotMs <= endDate.getTime();
    cursorMs += slotMs
  ) {
    const slotStartMs = cursorMs;
    const slotEndMs = cursorMs + slotMs;

    if (!overlapsBusySlot(slotStartMs, slotEndMs, busySlots)) {
      availableSlots.push({
        start: new Date(slotStartMs).toISOString(),
        end: new Date(slotEndMs).toISOString(),
      });
    }
  }

  return NextResponse.json({
    availableSlots,
    calendarId,
    timeZone,
  });
}
