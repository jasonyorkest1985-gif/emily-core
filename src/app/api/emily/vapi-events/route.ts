import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Always return 200 — VAPI retries on non-2xx responses
const ok = () => NextResponse.json({ ok: true });

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

interface VapiCall {
  id?: string;
  customer?: { number?: string };
  startedAt?: string;
  endedAt?: string;
}

interface VapiMessage {
  type?: string;
  call?: VapiCall;
  // transcript event
  transcript?: string;
  transcriptType?: string;
  role?: string;
  // tool-calls event
  toolCallList?: unknown[];
  // status-update event
  status?: string;
  // end-of-call-report event
  endedReason?: string;
  recordingUrl?: string;
  summary?: string;
  messages?: unknown[];
  analysis?: { summary?: string; [key: string]: unknown };
}

async function handleCallStarted(msg: VapiMessage) {
  const callId = msg.call?.id;
  const phone = msg.call?.customer?.number;
  console.log("[vapi] call-started", { callId, phone });

  if (phone) {
    const lead = await prisma.lead.findUnique({ where: { phone } });
    if (lead) {
      console.log("[vapi] call-started: matched lead", { leadId: lead.id, phone });
    } else {
      console.log("[vapi] call-started: no existing lead for", phone);
    }
  }
}

function handleTranscript(msg: VapiMessage) {
  console.log("[vapi] transcript", {
    callId: msg.call?.id,
    role: msg.role,
    type: msg.transcriptType,
    text: typeof msg.transcript === "string" ? msg.transcript.slice(0, 120) : undefined,
  });
}

function handleToolCalls(msg: VapiMessage) {
  const tools = Array.isArray(msg.toolCallList)
    ? msg.toolCallList.map((t) =>
        t !== null && typeof t === "object" && "function" in t
          ? (t as { function?: { name?: string } }).function?.name
          : undefined
      )
    : [];
  console.log("[vapi] tool-calls", { callId: msg.call?.id, tools });
}

function handleStatusUpdate(msg: VapiMessage) {
  console.log("[vapi] status-update", { callId: msg.call?.id, status: msg.status });
}

async function handleEndOfCallReport(msg: VapiMessage) {
  const callId = msg.call?.id;
  const phone = msg.call?.customer?.number;
  const transcript = msg.transcript ?? null;
  const recordingUrl = msg.recordingUrl ?? null;
  const summary = msg.analysis?.summary ?? msg.summary ?? null;

  // Compute duration from call timestamps if available
  let duration: number | undefined;
  if (msg.call?.startedAt && msg.call?.endedAt) {
    const ms = new Date(msg.call.endedAt).getTime() - new Date(msg.call.startedAt).getTime();
    if (!isNaN(ms)) duration = Math.round(ms / 1000);
  }

  console.log("[vapi] end-of-call-report", {
    callId,
    phone,
    duration,
    endedReason: msg.endedReason,
    summarySnippet: typeof summary === "string" ? summary.slice(0, 120) : null,
  });

  if (!phone) {
    console.warn("[vapi] end-of-call-report: no phone number in payload, skipping DB write");
    return;
  }

  const lead = await prisma.lead.upsert({
    where: { phone },
    create: {
      phone,
      ...(summary && { summary }),
    },
    update: {
      ...(summary && { summary }),
    },
  });

  await prisma.call.create({
    data: {
      leadId: lead.id,
      ...(callId && { callId }),
      ...(typeof transcript === "string" && { transcript }),
      ...(duration !== undefined && { duration }),
      ...(recordingUrl && { outcome: recordingUrl }),
      ...(toJson(msg.messages) !== undefined && { tasksCompleted: toJson(msg.messages) }),
    },
  });

  console.log("[vapi] end-of-call-report: saved call for lead", { leadId: lead.id, callId });
}

export async function POST(req: NextRequest) {
  let body: { message?: VapiMessage };
  try {
    const parsed = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return ok();
    }
    body = parsed as { message?: VapiMessage };
  } catch {
    return ok();
  }

  const msg = body.message;
  if (!msg || typeof msg.type !== "string") {
    console.warn("[vapi] received payload with no message.type");
    return ok();
  }

  try {
    switch (msg.type) {
      case "call-started":
        await handleCallStarted(msg);
        break;
      case "transcript":
        handleTranscript(msg);
        break;
      case "tool-calls":
        handleToolCalls(msg);
        break;
      case "status-update":
        handleStatusUpdate(msg);
        break;
      case "end-of-call-report":
        await handleEndOfCallReport(msg);
        break;
      default:
        console.log("[vapi] unhandled event type:", msg.type);
    }
  } catch (err) {
    // Log but never let an error propagate — VAPI must always get 200
    console.error("[vapi] error handling event", msg.type, err);
  }

  return ok();
}
