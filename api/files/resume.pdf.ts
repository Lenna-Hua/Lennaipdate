import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readResumeBlob } from "../../lib/resume-storage.js";
import { handleCors } from "../../lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  try {
    const blob = await readResumeBlob();
    if (!blob) {
      res.status(404).json({ error: "No uploaded resume found." });
      return;
    }
    res.setHeader("Content-Type", blob.contentType);
    const safeFilename = blob.filename.replace(/[^\w.\- ]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeFilename}"`,
    );
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(blob.buffer);
  } catch (err) {
    console.error("[files] resume read failed", err);
    res.status(500).json({ error: "Failed to load resume." });
  }
}
