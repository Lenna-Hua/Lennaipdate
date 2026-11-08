import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { AdminConfigError, getAdminPassword, issueAdminToken } from "../../lib/admin-auth.js";
import { handleCors } from "../../lib/cors.js";

// Simple in-memory rate limiter: max 5 failed attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

function getLoginAttempt(ip: string): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    const fresh = { count: 0, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS };
    loginAttempts.set(ip, fresh);
    return fresh;
  }
  return entry;
}

function isLoginRateLimited(ip: string): boolean {
  return getLoginAttempt(ip).count >= LOGIN_RATE_LIMIT_MAX;
}

function recordFailedLogin(ip: string): void {
  const entry = getLoginAttempt(ip);
  entry.count += 1;
}

function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still run a compare to avoid leaking length via timing on the happy path size.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientIp =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? "unknown";
  if (isLoginRateLimited(clientIp)) {
    res.status(429).json({ error: "Too many login attempts. Please try again later." });
    return;
  }

  const raw: Record<string, unknown> =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const password = raw.password;
  try {
    const expected = getAdminPassword();
    if (typeof password !== "string" || !passwordsMatch(password, expected)) {
      recordFailedLogin(clientIp);
      res.status(401).json({ error: "Incorrect password" });
      return;
    }
    // Return a signed session token only — never echo the password back.
    res.json({ token: issueAdminToken() });
  } catch (err) {
    if (err instanceof AdminConfigError) {
      console.error("[admin] login blocked — missing config:", err.message);
      res.status(503).json({ error: "Admin authentication is not configured." });
      return;
    }
    throw err;
  }
}
