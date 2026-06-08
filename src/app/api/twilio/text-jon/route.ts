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

  const { message } = body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  // If `to` is provided use it (outbound to lead/caller), otherwise default to Jon
  const to =
    typeof body.to === "string" && body.to.trim()
      ? body.to.trim()
      : process.env.ANGELA_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !to) {
    console.error("[text-jon] Missing Twilio env vars");
    return NextResponse.json({ error: "SMS service not configured" }, { status: 500 });
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ to, from, body: message.trim() });
    console.log("[text-jon]", { to, snippet: message.trim().slice(0, 80) });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[text-jon]", err);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
