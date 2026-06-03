import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

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

  const { to, subject, text, html } = body;
  if (typeof to !== "string" || !to.trim()) {
    return NextResponse.json({ error: "to is required" }, { status: 400 });
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error("[send-email] Missing SendGrid env vars");
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to: to.trim(),
      from,
      subject: subject.trim(),
      text: text.trim(),
      ...(typeof html === "string" && html.trim() && { html: html.trim() }),
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[send-email]", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
