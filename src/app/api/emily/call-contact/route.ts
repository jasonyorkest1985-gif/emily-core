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

  const { number, reason, context, callerId } = body;
  if (typeof number !== "string" || !number.trim()) {
    return NextResponse.json({ error: "number is required" }, { status: 400 });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    console.error("[call-contact] Missing VAPI env vars");
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
        customer: {
          number: number.trim(),
          ...(typeof callerId === "string" && callerId.trim() && { callerId: callerId.trim() }),
        },
        assistantOverrides: {
          variableValues: {
            reason: reason.trim(),
            ...(typeof context === "string" && context.trim() && { context: context.trim() }),
          },
        },
      }),
    });

    if (!res.ok) {
      console.error("[call-contact] VAPI error", res.status, await res.text());
      return NextResponse.json({ error: "Failed to initiate call" }, { status: 502 });
    }

    const data = (await res.json()) as VapiCallResponse;
    return NextResponse.json({ callId: data.id });
  } catch (err) {
    console.error("[call-contact]", err);
    return NextResponse.json({ error: "Call initiation failed" }, { status: 500 });
  }
}
