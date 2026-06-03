import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
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

  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : undefined;
  if (!phoneNumber) {
    return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
  }

  // Lead fields
  const leadData = {
    ...(typeof body.fullName === "string" && { fullName: body.fullName }),
    ...(typeof body.email === "string" && { email: body.email }),
    ...(typeof body.address === "string" && { address: body.address }),
    ...(typeof body.projectType === "string" && { projectType: body.projectType }),
    ...(typeof body.projectDetails === "string" && { projectDetails: body.projectDetails }),
    ...(typeof body.timeline === "string" && { timeline: body.timeline }),
    ...(typeof body.budgetRange === "string" && { budgetRange: body.budgetRange }),
    ...(typeof body.leadTemperature === "string" && { leadTemperature: body.leadTemperature }),
    ...(typeof body.appointmentBooked === "boolean" && { appointmentBooked: body.appointmentBooked }),
    ...(typeof body.appointmentStart === "string" && { appointmentStart: new Date(body.appointmentStart) }),
    ...(typeof body.appointmentEnd === "string" && { appointmentEnd: new Date(body.appointmentEnd) }),
    ...(typeof body.nextStep === "string" && { nextStep: body.nextStep }),
    ...(typeof body.summary === "string" && { summary: body.summary }),
    ...(typeof body.shoppingSignal === "boolean" && { shoppingSignal: body.shoppingSignal }),
    ...(typeof body.hotSignal === "boolean" && { hotSignal: body.hotSignal }),
    ...(typeof body.hoaDelay === "boolean" && { hoaDelay: body.hoaDelay }),
    ...(typeof body.insuranceClaim === "boolean" && { insuranceClaim: body.insuranceClaim }),
    ...(typeof body.competitorMentioned === "boolean" && { competitorMentioned: body.competitorMentioned }),
    ...(typeof body.referralAdjacent === "boolean" && { referralAdjacent: body.referralAdjacent }),
    ...(typeof body.escalated === "boolean" && { escalated: body.escalated }),
    ...(typeof body.dnc === "boolean" && { dnc: body.dnc }),
    ...(Array.isArray(body.objections) && { objections: body.objections.filter((o) => typeof o === "string") }),
    ...(body.callHistory !== undefined && { callHistory: toJson(body.callHistory) }),
    ...(body.commandsIssued !== undefined && { commandsIssued: toJson(body.commandsIssued) }),
  };

  // Call fields — create a Call record if any call-specific fields are present
  const hasCallData =
    body.callId !== undefined ||
    body.transcript !== undefined ||
    body.duration !== undefined ||
    body.tasksCompleted !== undefined ||
    body.outcome !== undefined;

  try {
    const lead = await prisma.lead.upsert({
      where: { phone: phoneNumber },
      create: { phone: phoneNumber, ...leadData },
      update: leadData,
    });

    if (hasCallData) {
      await prisma.call.create({
        data: {
          leadId: lead.id,
          ...(typeof body.callId === "string" && { callId: body.callId }),
          ...(typeof body.transcript === "string" && { transcript: body.transcript }),
          ...(typeof body.duration === "number" && { duration: body.duration }),
          ...(body.tasksCompleted !== undefined && { tasksCompleted: toJson(body.tasksCompleted) }),
          ...(typeof body.outcome === "string" && { outcome: body.outcome }),
          ...(body.commandsIssued !== undefined && { commandsIssued: toJson(body.commandsIssued) }),
        },
      });
    }

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("[upsert-lead]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
