import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Allowed origin for CORS. In production this is always the canonical domain;
 * in dev it is localhost:5173 so the Vite dev server can call the API.
 */
function allowedOrigin(req: VercelRequest): string {
  const origin = req.headers["origin"] as string | undefined;
  const allowed = [
    "https://www.lennahua.ca",
    "https://lennahua.ca",
    "https://lennaipdate.vercel.app",
  ];
  // Allow any Vercel preview URL for this project
  const isPreview = origin?.match(/^https:\/\/lennaipdate-[a-z0-9]+-huabichnhu03-oss-projects\.vercel\.app$/);
  if (origin && (allowed.includes(origin) || isPreview)) return origin;
  // Allow localhost in development / preview
  if (
    process.env.VERCEL_ENV !== "production" &&
    (origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:"))
  ) {
    return origin;
  }
  return "https://www.lennahua.ca";
}

/**
 * Set standard CORS headers on every API response.
 * Call this at the top of every handler, before any other logic.
 * Returns `true` if the request was a preflight OPTIONS — caller should return immediately.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = allowedOrigin(req);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Case-Unlock",
  );
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
