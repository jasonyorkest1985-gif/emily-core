import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";

// Twilio fetches this URL when the outbound call to Emily (VAPI) connects.
// Emily joins with startConferenceOnEnter: true, which starts the conference
// and releases the lead from hold silence.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conferenceName = searchParams.get("conf") ?? "";
  const leadPhone = searchParams.get("leadPhone") ?? "";

  console.log("[emily-join]", { conferenceName, leadPhone });

  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference(
    {
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
    },
    conferenceName
  );

  return new NextResponse(response.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
