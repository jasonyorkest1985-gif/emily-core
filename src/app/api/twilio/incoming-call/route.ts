import { NextRequest, NextResponse } from "next/server";
import twilio, { twiml } from "twilio";

function xmlResponse(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  // Twilio sends webhooks as application/x-www-form-urlencoded
  const text = await req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get("CallSid") ?? "";
  const leadPhone = params.get("From") ?? "";

  if (!callSid) {
    console.error("[incoming-call] missing CallSid");
    return xmlResponse("<Response><Hangup/></Response>");
  }

  const conferenceName = `heads-and-tails-${callSid}`;
  const baseUrl = process.env.CONFERENCE_BASE_URL ?? "";
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;
  const vapiPhone = process.env.VAPI_PHONE_NUMBER!;

  console.log("[incoming-call]", { callSid, leadPhone, conferenceName });

  // Dial Emily into the conference — she has startConferenceOnEnter: true so the
  // lead's hold music plays until Emily joins and starts the conference.
  const client = twilio(accountSid, authToken);
  try {
    await client.calls.create({
      to: vapiPhone,
      from: fromNumber,
      url: `${baseUrl}/api/twilio/emily-join?conf=${encodeURIComponent(conferenceName)}&leadPhone=${encodeURIComponent(leadPhone)}`,
      method: "POST",
    });
    console.log("[incoming-call] dialed Emily", { vapiPhone, conferenceName });
  } catch (err) {
    console.error("[incoming-call] failed to dial Emily", err);
    // Continue — return TwiML so the lead isn't dropped
  }

  // Lead waits in the conference with hold silence until Emily joins
  const response = new twiml.VoiceResponse();
  const dial = response.dial();
  dial.conference(
    {
      startConferenceOnEnter: false,
      endConferenceOnExit: true,
      waitUrl: `${baseUrl}/api/twilio/wait-silence`,
      waitMethod: "GET",
    },
    conferenceName
  );

  return xmlResponse(response.toString());
}
