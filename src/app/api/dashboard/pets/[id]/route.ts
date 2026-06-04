import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id } = params;
  const data: Record<string, unknown> = {};

  const str = (k: string) => {
    if (k in body) data[k] = typeof body[k] === "string" ? (body[k] as string).trim() || null : null;
  };
  const bool = (k: string) => {
    if (k in body) data[k] = Boolean(body[k]);
  };

  ["petName", "breed", "color", "weight", "dateOfBirth", "sex",
    "medicalIssues", "allergies", "vetName", "vetPhone",
    "rabiesExpiration", "temperament", "groomingNotes"].forEach(str);

  ["spayedNeutered", "rabiesCurrent", "vaccinationsCurrent"].forEach(bool);

  if ("lastGroomed" in body) {
    data.lastGroomed =
      typeof body.lastGroomed === "string" && body.lastGroomed
        ? new Date(body.lastGroomed)
        : null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const pet = await prisma.pet.update({ where: { id }, data });
    return NextResponse.json({ pet });
  } catch (err) {
    console.error("[dashboard/pets PATCH]", err);
    return NextResponse.json({ error: "Failed to update pet" }, { status: 500 });
  }
}
