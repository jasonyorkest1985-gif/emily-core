import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/googleAuth";

interface FreeBusyResponse {
  calendars: Record<string, { busy: { start: string; end: string }[] }>;
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

  const { durationMinutes } = body;
  if (typeof durationMinutes !== "number") {
    return NextResponse.json({ error: "durationMinutes is required" }, { status: 400 });
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

  const now = new Date();
  const rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const freeBusyRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: rangeEnd.toISOString(),
      items: [{ id: "primary" }],
    }),
  });

  if (!freeBusyRes.ok) {
    const text = await freeBusyRes.text();
    return NextResponse.json({ error: `Google API error: ${text}` }, { status: 502 });
  }

  const freeBusy = (await freeBusyRes.json()) as FreeBusyResponse;
  const busySlots = freeBusy.calendars["primary"]?.busy ?? [];

  // Build available 30-min slots across business hours (8am-6pm) for next 7 days
  const slotMs = durationMinutes * 60 * 1000;
  const availableSlots: { start: string; end: string }[] = [];

  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    // Business hours: 8am-6pm local (using UTC for simplicity — adjust TZ as needed)
    const dayStart = new Date(day);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(18, 0, 0, 0);

    let cursor = Math.max(dayStart.getTime(), now.getTime());

    while (cursor + slotMs <= dayEnd.getTime()) {
      const slotStart = cursor;
      const slotEnd = cursor + slotMs;

      const overlaps = busySlots.some(
        (b) => new Date(b.start).getTime() < slotEnd && new Date(b.end).getTime() > slotStart
      );

      if (!overlaps) {
        availableSlots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }

      cursor += slotMs;
    }
  }

  return NextResponse.json({ availableSlots });
}
