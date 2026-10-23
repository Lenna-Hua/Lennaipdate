import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminRequest } from "../../lib/admin-auth.js";
import { saveResume, readResumeBlob, RESUME_MAX_BYTES } from "../../lib/resume-storage.js";

function readToken(req: VercelRequest): string | undefined {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return undefined;
}

function requireAdmin(req: VercelRequest): boolean {
  return isAdminRequest({ token: readToken(req) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.method === "POST") {
    const raw: Record<string, unknown> =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    const dataUrl = raw.dataUrl;
    const filenameRaw = raw.filename;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:application/pdf")) {
      res.status(400).json({ error: "Expected a PDF file (data URL)." });
      return;
    }
    const commaIdx = dataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : "";
    const buf = Buffer.from(base64, "base64");
    if (buf.length === 0) {
      res.status(400).json({ error: "Uploaded file is empty." });
      return;
    }
    if (buf.length > RESUME_MAX_BYTES) {
      res.status(413).json({ error: "Resume PDF must be 3 MB or smaller." });
      return;
    }
    if (buf.slice(0, 5).toString("ascii") !== "%PDF-") {
      res.status(400).json({ error: "File does not look like a valid PDF." });
      return;
    }
    const userFilename =
      typeof filenameRaw === "string" && filenameRaw.trim().toLowerCase().endsWith(".pdf")
        ? filenameRaw.trim().slice(-120)
        : "Lenna_Hua_Resume.pdf";
    try {
      const stored = await saveResume(buf, userFilename);
      res.json({ ok: true, ...stored });
    } catch (err) {
      console.error("[admin] resume upload failed", err);
      res.status(500).json({ error: "Failed to store the resume." });
    }
    return;
  }

  if (req.method === "GET") {
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
      console.error("[admin] resume read failed", err);
      res.status(500).json({ error: "Failed to load resume." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
