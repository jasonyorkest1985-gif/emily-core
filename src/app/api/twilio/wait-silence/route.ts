import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("<Response><Pause length=\"60\"/></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
