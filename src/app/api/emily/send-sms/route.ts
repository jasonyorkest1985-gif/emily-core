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

  const { to, message } = body;
  if (typeof to !== "string" || !to.trim()) {
    return NextResponse.json({ error: "to is required" }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.error("[send-sms] Missing Twilio env vars");
    return NextResponse.json({ error: "SMS service not configured" }, { status: 500 });
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({ to: to.trim(), from, body: message.trim() });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[send-sms]", err);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
