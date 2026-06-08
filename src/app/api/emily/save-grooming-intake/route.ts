import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const str = (k: string) => typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string).trim() : null;

  const phone = str("phone");
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const firstName = str("firstName");
  const lastName = str("lastName");
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  try {
    const lead = await prisma.lead.upsert({
      where: { phone },
      create: {
        phone,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(fullName && { fullName }),
        ...(str("summary") && { summary: str("summary") }),
        ...(str("temperature") && { leadTemperature: str("temperature") }),
      },
      update: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(fullName && { fullName }),
        ...(str("summary") && { summary: str("summary") }),
        ...(str("temperature") && { leadTemperature: str("temperature") }),
      },
    });

    const petName = str("petName");
    if (petName || str("breed") || str("serviceRequested") || str("groomingRequest")) {
      const existingPet = await prisma.pet.findFirst({
        where: { leadId: lead.id, petName: petName ?? undefined },
      });

      if (existingPet) {
        await prisma.pet.update({
          where: { id: existingPet.id },
          data: {
            ...(petName && { petName }),
            ...(str("breed") && { breed: str("breed") }),
            ...(str("serviceRequested") && { groomingNotes: str("serviceRequested") }),
            ...(str("groomingRequest") && { groomingNotes: str("groomingRequest") }),
          },
        });
      } else {
        await prisma.pet.create({
          data: {
            leadId: lead.id,
            petName,
            breed: str("breed"),
            groomingNotes: str("groomingRequest") ?? str("serviceRequested"),
          },
        });
      }
    }

    if (str("appointmentStart")) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          appointmentBooked: true,
          appointmentStart: new Date(str("appointmentStart")!),
          ...(str("serviceRequested") && { projectType: str("serviceRequested") }),
        },
      });
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (err) {
    console.error("[save-grooming-intake]", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
