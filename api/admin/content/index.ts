import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ALLOWED_SECTIONS, getSection, isAllowedSection, setSection, validateSection } from "../../../lib/content-store.js";
import { isAdminRequest } from "../../../lib/admin-auth.js";
import { handleCors } from "../../../lib/cors.js";

export const config = { maxDuration: 30 };

function readToken(req: VercelRequest): string | undefined {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return undefined;
}

function readBodyObject(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const raw = readBodyObject(req);
  if (!isAdminRequest({ token: readToken(req) })) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const section = typeof req.query["section"] === "string" ? req.query["section"] : "";
  if (section) {
    if (!isAllowedSection(section)) {
      res.status(400).json({ error: "Unknown section" });
      return;
    }
    const hasReadOnlyFlag = req.method === "GET" || raw.read === true;
    if (hasReadOnlyFlag) {
      try {
        const data = await getSection(section);
        res.json(data);
      } catch (err) {
        console.error("[admin] read failed", err);
        res.status(500).json({ error: "Failed to load section" });
      }
      return;
    }
    const data = raw.data;
    if (data === undefined) {
      res.status(400).json({ error: "Missing data field" });
      return;
    }
    const validationError = validateSection(section, data);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    try {
      await setSection(section, data);
      res.json({ ok: true, section });
    } catch (err) {
      console.error("[admin] write failed", err);
      res.status(500).json({ error: "Failed to save section" });
    }
    return;
  }

  const data = raw.data;
  if (typeof data !== "object" || data === null) {
    res.status(400).json({ error: "Missing or invalid data field" });
    return;
  }
  const saved: string[] = [];
  try {
    for (const section of ALLOWED_SECTIONS) {
      if (section in data) {
        const sectionData = (data as Record<string, unknown>)[section];
        const validationError = validateSection(section, sectionData);
        if (validationError) {
          res.status(400).json({ error: validationError, section, saved });
          return;
        }
        await setSection(section, sectionData);
        saved.push(section);
      }
    }
    res.json({ ok: true, saved });
  } catch (err) {
    console.error("[admin] bulk write failed", err);
    res.status(500).json({ error: "Failed to save content", saved });
  }
}
