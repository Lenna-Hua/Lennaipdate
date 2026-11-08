import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query } from "../lib/db.js";
import { handleCors } from "../lib/cors.js";

export const config = { maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  try {
    await query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "error" });
  }
}

