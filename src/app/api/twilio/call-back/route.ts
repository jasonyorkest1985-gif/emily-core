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

  const { to, reason, context } = body;

  if (typeof to !== "string" || !to.trim()) {
    return NextResponse.json({ error: "to is required" }, { status: 400 });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const baseUrl = process.env.CONFERENCE_BASE_URL;

  if (!accountSid || !authToken || !from || !baseUrl) {
    console.error("[call-back] Missing Twilio env vars");
    return NextResponse.json({ error: "Call service not configured" }, { status: 500 });
  }

  // Build the TwiML callback URL — Twilio fetches this when the callee answers,
  // and it returns instructions to connect them to Emily via VAPI SIP.
  const vapiConnectUrl = new URL(`${baseUrl}/api/twilio/vapi-connect`);
  vapiConnectUrl.searchParams.set("reason", reason.trim());
  if (typeof context === "string" && context.trim()) {
    vapiConnectUrl.searchParams.set("context", context.trim());
  }

  try {
    const client = twilio(accountSid, authToken);
    const call = await client.calls.create({
      to: to.trim(),
      from,
      url: vapiConnectUrl.toString(),
      method: "POST",
    });
    console.log("[call-back] initiated", { to: to.trim(), callSid: call.sid, reason: reason.trim() });
    return NextResponse.json({ callSid: call.sid });
  } catch (err) {
    console.error("[call-back]", err);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
