import { NextRequest, NextResponse } from "next/server";
import { twiml } from "twilio";

// Twilio fetches this URL when the outbound call (initiated by call-back) is answered.
// Returns TwiML that connects the callee to Emily's VAPI assistant via SIP,
// passing reason and context as SIP headers so Emily knows why she is calling.
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reason = searchParams.get("reason") ?? "";
  const context = searchParams.get("context") ?? "";

  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const vapiApiKey = process.env.VAPI_API_KEY;

  if (!assistantId) {
    console.error("[vapi-connect] VAPI_ASSISTANT_ID not set");
    const response = new twiml.VoiceResponse();
    response.say("We're sorry, this service is temporarily unavailable.");
    return new NextResponse(response.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Build the SIP URI with reason and context as SIP headers.
  // VAPI reads X-Reason and X-Context from the SIP INVITE so Emily knows
  // the purpose of the call before she speaks.
  const headers: string[] = [];
  if (reason) headers.push(`X-Reason=${encodeURIComponent(reason)}`);
  if (context) headers.push(`X-Context=${encodeURIComponent(context)}`);

  const sipUri =
    `sip:${assistantId}@sip.vapi.ai` +
    (headers.length ? `?${headers.join("&")}` : "");

  console.log("[vapi-connect]", { assistantId, reason, context: context.slice(0, 80) });

  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.sip(
    // Use VAPI API key as SIP username for authentication
    { username: vapiApiKey ?? "" },
    sipUri
  );

  return new NextResponse(response.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
