import { NextRequest, NextResponse } from "next/server";

interface VapiCallResponse {
  id: string;
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

  const { to, reason, context } = body;

  if (typeof to !== "string" || !to.trim()) {
    return NextResponse.json({ error: "to is required" }, { status: 400 });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER;

  if (!apiKey || !assistantId || !phoneNumberId) {
    console.error("[call-back] Missing VAPI env vars");
    return NextResponse.json({ error: "Call service not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: to.trim() },
        assistantOverrides: {
          variableValues: {
            reason: reason.trim(),
            ...(typeof context === "string" && context.trim() && { context: context.trim() }),
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[call-back] VAPI error", res.status, text);
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 502 });
    }

    const data = (await res.json()) as VapiCallResponse;
    console.log("[call-back] initiated", { to: to.trim(), callId: data.id, reason: reason.trim() });
    return NextResponse.json({ callId: data.id });
  } catch (err) {
    console.error("[call-back]", err);
    return NextResponse.json({ error: "Failed to initiate call" }, { status: 500 });
  }
}
