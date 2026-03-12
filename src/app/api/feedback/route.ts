import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const RECIPIENT = process.env.FEEDBACK_RECIPIENT_EMAIL;
const FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || "Test Case Converter <onboarding@resend.dev>";

export async function POST(request: Request) {
  if (!RECIPIENT) {
    return NextResponse.json(
      { message: "Feedback is not configured." },
      { status: 503 }
    );
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Feedback is temporarily unavailable." },
      { status: 503 }
    );
  }
  const resend = new Resend(apiKey);

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ message: "Message is required." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const replyTo = typeof body.email === "string" ? body.email.trim() : undefined;

  const subject = name ? `Feedback from ${name}` : "Feedback (Test Case Converter)";
  const text = [
    name && `From: ${name}`,
    replyTo && `Reply-to: ${replyTo}`,
    "",
    message,
  ]
    .filter(Boolean)
    .join("\n");
  const html = [
    name && `<p><strong>From:</strong> ${escapeHtml(name)}</p>`,
    replyTo && `<p><strong>Reply-to:</strong> ${escapeHtml(replyTo)}</p>`,
    "<p>" + escapeHtml(message).replace(/\n/g, "<br>") + "</p>",
  ]
    .filter(Boolean)
    .join("");

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: RECIPIENT,
      replyTo: replyTo || undefined,
      subject,
      text,
      html: html || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback send error:", err);
    return NextResponse.json(
      { message: "Failed to send. Please try again later." },
      { status: 500 }
    );
  }
}
