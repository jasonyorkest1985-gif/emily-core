import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

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

  const { conferenceName, leadName, projectSummary } = body;
  if (typeof conferenceName !== "string" || !conferenceName.trim()) {
    return NextResponse.json({ error: "conferenceName is required" }, { status: 400 });
  }
  if (typeof leadName !== "string" || !leadName.trim()) {
    return NextResponse.json({ error: "leadName is required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const jonPhone = process.env.ANGELA_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !jonPhone) {
    console.error("[bridge-jon] Missing Twilio env vars");
    return NextResponse.json({ error: "Service not configured" }, { status: 500 });
  }

  const client = twilio(accountSid, authToken);
  const summary = typeof projectSummary === "string" && projectSummary.trim()
    ? projectSummary.trim()
    : "";
  const smsBody = `🔥 Hot lead on the line: ${leadName.trim()}${summary ? ` — ${summary}` : ""}. Joining you now.`;

  // Step 1: Text Jon before dialing
  try {
    await client.messages.create({ to: jonPhone, from, body: smsBody });
    console.log("[bridge-jon] texted Jon", { jonPhone });
  } catch (err) {
    // Log but continue — don't block the dial if SMS fails
    console.error("[bridge-jon] SMS to Jon failed", err);
  }

  // Step 2: Find the active conference by friendly name
  let conferenceSid: string;
  try {
    const conferences = await client.conferences.list({
      friendlyName: conferenceName.trim(),
      status: "in-progress",
      limit: 1,
    });
    if (!conferences.length) {
      console.error("[bridge-jon] conference not found", { conferenceName });
      return NextResponse.json(
        { error: "Conference not found or not in progress" },
        { status: 404 }
      );
    }
    conferenceSid = conferences[0].sid;
  } catch (err) {
    console.error("[bridge-jon] failed to look up conference", err);
    return NextResponse.json({ error: "Failed to look up conference" }, { status: 500 });
  }

  // Step 3: Dial Jon into the conference
  try {
    const participant = await client
      .conferences(conferenceSid)
      .participants.create({
        to: jonPhone,
        from,
        label: "jon",
        endConferenceOnExit: false,
        startConferenceOnEnter: false,
      });
    console.log("[bridge-jon] dialed Jon into conference", {
      conferenceName,
      conferenceSid,
      participantCallSid: participant.callSid,
    });
    return NextResponse.json({ bridged: true, conferenceName });
  } catch (err) {
    console.error("[bridge-jon] failed to dial Jon", err);
    return NextResponse.json({ error: "Failed to dial Jon into conference" }, { status: 500 });
  }
}
