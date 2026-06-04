import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
  if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

  const str = (k: string): string | null =>
    typeof body[k] === "string" ? (body[k] as string).trim() || null : null;
  const bool = (k: string, def = false): boolean =>
    typeof body[k] === "boolean" ? (body[k] as boolean) : def;

  try {
    const pet = await prisma.pet.create({
      data: {
        leadId,
        petName: str("petName"),
        breed: str("breed"),
        color: str("color"),
        weight: str("weight"),
        dateOfBirth: str("dateOfBirth"),
        sex: str("sex"),
        spayedNeutered: bool("spayedNeutered"),
        medicalIssues: str("medicalIssues"),
        allergies: str("allergies"),
        vetName: str("vetName"),
        vetPhone: str("vetPhone"),
        rabiesCurrent: bool("rabiesCurrent"),
        rabiesExpiration: str("rabiesExpiration"),
        vaccinationsCurrent: bool("vaccinationsCurrent"),
        temperament: str("temperament"),
        groomingNotes: str("groomingNotes"),
        lastGroomed:
          typeof body.lastGroomed === "string" && body.lastGroomed
            ? new Date(body.lastGroomed)
            : null,
      },
    });
    return NextResponse.json({ pet }, { status: 201 });
  } catch (err) {
    console.error("[dashboard/pets POST]", err);
    return NextResponse.json({ error: "Failed to create pet" }, { status: 500 });
  }
}
