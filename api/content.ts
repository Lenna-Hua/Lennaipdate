import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAllSections,
  getContentSectionMeta,
  getSection,
  isAllowedSection,
} from "../lib/content-store.js";
import { verifyAdminToken } from "../lib/admin-auth.js";
import {
  checkCaseStudyPassword,
  hasUnlockToken,
  issueUnlockToken,
} from "../lib/case-study-access.js";
import {
  isProtectedProject,
  redactProjectsForPublic,
  stripProjectSecrets,
} from "../lib/project-redaction.js";
import { handleCors } from "../lib/cors.js";

export const config = { maxDuration: 15 };

type ProjectRecord = Record<string, unknown>;

// Best-effort per-instance limit on password guesses: 10 failures per IP per 15 minutes.
const unlockAttempts = new Map<string, { count: number; resetAt: number }>();
const UNLOCK_RATE_LIMIT_MAX = 10;
const UNLOCK_RATE_LIMIT_WINDOW_MS = 15 * 60_000;

function unlockAttempt(ip: string): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = unlockAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    const fresh = { count: 0, resetAt: now + UNLOCK_RATE_LIMIT_WINDOW_MS };
    unlockAttempts.set(ip, fresh);
    return fresh;
  }
  return entry;
}

function clientIp(req: VercelRequest): string {
  return (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? "unknown";
}

function readBody(req: VercelRequest): Record<string, unknown> {
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function readUnlockTokens(req: VercelRequest): string[] {
  const raw = req.headers["x-case-unlock"];
  const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return joined
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function readAdminToken(req: VercelRequest): string | undefined {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return undefined;
}

async function findPublishedProject(slug: string): Promise<ProjectRecord | null> {
  const projects = await getSection("projects");
  if (!Array.isArray(projects)) return null;
  const match = projects.find(
    (p): p is ProjectRecord =>
      typeof p === "object" && p !== null && (p as ProjectRecord).slug === slug,
  );
  return match && match.archived !== true ? match : null;
}

/** GET /api/content?case=<slug> — full case study when it's public or the caller holds an unlock. */
async function handleCaseRead(req: VercelRequest, res: VercelResponse, slug: string) {
  const project = await findPublishedProject(slug);
  if (!project) {
    res.status(404).json({ error: "Case study not found" });
    return;
  }
  const access = !isProtectedProject(project)
    ? "public"
    : verifyAdminToken(readAdminToken(req))
      ? "admin"
      : hasUnlockToken(project, readUnlockTokens(req))
        ? "unlock"
        : null;
  if (!access) {
    res.status(401).json({ error: "Password required", locked: true });
    return;
  }
  res.json({ project: stripProjectSecrets(project), access });
}

/** POST /api/content { slug, password } — trade the password for an unlock token. */
async function handleCaseUnlock(req: VercelRequest, res: VercelResponse) {
  const attempt = unlockAttempt(clientIp(req));
  if (attempt.count >= UNLOCK_RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many attempts. Please try again in a few minutes." });
    return;
  }
  const body = readBody(req);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const password = typeof body.password === "string" ? body.password : "";
  const project = slug ? await findPublishedProject(slug) : null;
  if (!project) {
    res.status(404).json({ error: "Case study not found" });
    return;
  }
  if (!isProtectedProject(project)) {
    res.json({ project: stripProjectSecrets(project), access: "public" });
    return;
  }
  const result = checkCaseStudyPassword(project, password);
  if (result === "unconfigured") {
    console.error(`[content] case study "${slug}" is protected but has no password configured`);
    res.status(503).json({ error: "This case study isn't accepting passwords yet." });
    return;
  }
  if (result === "wrong") {
    attempt.count += 1;
    res.status(401).json({ error: "Incorrect password" });
    return;
  }
  res.json({
    project: stripProjectSecrets(project),
    token: issueUnlockToken(project),
    access: "unlock",
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  const caseSlug = req.query["case"];
  if (req.method === "POST" || typeof caseSlug === "string") {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      if (req.method === "POST") await handleCaseUnlock(req, res);
      else await handleCaseRead(req, res, caseSlug as string);
    } catch (err) {
      console.error("[content] case study access failed", err);
      res.status(500).json({ error: "Failed to load case study" });
    }
    return;
  }

  const section = req.query["section"];
  if (typeof section === "string") {
    if (!isAllowedSection(section)) {
      res.status(400).json({ error: "Unknown section" });
      return;
    }
    try {
      const data = await getSection(section);
      res.json(section === "projects" ? redactProjectsForPublic(data) : data);
    } catch (err) {
      console.error("[content] read failed", err);
      res.status(500).json({ error: "Failed to load section" });
    }
    return;
  }
  try {
    const all = await getAllSections();
    const publicContent = { ...all, projects: redactProjectsForPublic(all.projects) };
    const includeMeta = req.query["meta"] === "1";
    if (!includeMeta) {
      res.json(publicContent);
      return;
    }
    const meta = await getContentSectionMeta();
    res.json({ data: publicContent, meta });
  } catch (err) {
    console.error("[content] read-all failed", err);
    res.status(500).json({ error: "Failed to load content" });
  }
}
