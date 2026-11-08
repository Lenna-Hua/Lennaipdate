import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { insertMessage } from "../lib/messages-store.js";
import { handleCors } from "../lib/cors.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiter: max 5 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientIp =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(clientIp)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  const raw: Record<string, unknown> =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!name || !email || !message) {
    res.status(400).json({ error: "Name, email, and message are all required." });
    return;
  }
  if (name.length > 200) {
    res.status(400).json({ error: "Name is too long (max 200 characters)." });
    return;
  }
  if (!EMAIL_RE.test(email) || email.length > 320) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  if (message.length > 5000) {
    res.status(400).json({ error: "Message is too long (max 5000 characters)." });
    return;
  }

  const ipRaw =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? null;
  const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;

  try {
    await insertMessage({ name, email, message, ip: ipRaw, userAgent });
  } catch (err) {
    console.error("[contact] failed to persist message", err);
    res.status(500).json({ error: "Could not save your message. Please try again." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY missing — saved to inbox, email skipped");
    res.json({ ok: true });
    return;
  }

  const resend = new Resend(apiKey);
  const to = process.env.CONTACT_TO_EMAIL || "lenna.huawork@gmail.com";

  const { error } = await resend.emails.send({
    from: "Lenna Portfolio <onboarding@resend.dev>",
    to: [to],
    replyTo: email,
    subject: `Portfolio contact from ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1F67F1;margin-bottom:4px">New message from your portfolio</h2>
        <hr style="border:1px solid #eee"/>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>Message:</strong></p>
        <blockquote style="border-left:3px solid #1F67F1;padding-left:12px;color:#444;white-space:pre-wrap">${escapeHtml(message)}</blockquote>
      </div>
    `,
    text: `New message from your portfolio\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`,
  });

  if (error) {
    console.error("[contact] Resend failed (message saved to inbox)", error);
  }

  res.json({ ok: true });
}
