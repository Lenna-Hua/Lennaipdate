import { query } from "./db.js";
import { hashProjectPasswords } from "./case-study-access.js";
import { isIncompleteProject } from "./project-redaction.js";

import projectsSeed from "./data/projects.json" with { type: "json" };
import aboutSeed from "./data/about.json" with { type: "json" };
import experienceSeed from "./data/experience.json" with { type: "json" };
import educationSeed from "./data/education.json" with { type: "json" };
import gallerySeed from "./data/gallery.json" with { type: "json" };
import identitySeed from "./data/identity.json" with { type: "json" };
import contactSeed from "./data/contact.json" with { type: "json" };
import filesSeed from "./data/files.json" with { type: "json" };
import homepageSeed from "./data/homepage.json" with { type: "json" };
import studioSeed from "./data/studio.json" with { type: "json" };
import appearanceSeed from "./data/appearance.json" with { type: "json" };

export const ALLOWED_SECTIONS = [
  "projects",
  "about",
  "experience",
  "education",
  "gallery",
  "identity",
  "contact",
  "files",
  "homepage",
  "studio",
  "appearance",
] as const;

export type SectionName = (typeof ALLOWED_SECTIONS)[number];

export function isAllowedSection(s: string): s is SectionName {
  return (ALLOWED_SECTIONS as readonly string[]).includes(s);
}

const SEEDS: Record<SectionName, unknown> = {
  projects: projectsSeed,
  about: aboutSeed,
  experience: experienceSeed,
  education: educationSeed,
  gallery: gallerySeed,
  identity: identitySeed,
  contact: contactSeed,
  files: filesSeed,
  homepage: homepageSeed,
  studio: studioSeed,
  appearance: appearanceSeed,
};

/**
 * New admin sections: return bundled seed for API/client but do not INSERT into
 * Postgres on first read — avoids changing live content until you Save in admin.
 */
const SEED_ONLY_SECTIONS = new Set<SectionName>(["studio", "appearance"]);

export async function getSection(name: SectionName): Promise<unknown> {
  const seed = SEEDS[name];
  try {
    const rows = await query<{ data: unknown }>(
      "SELECT data FROM content_sections WHERE name = $1",
      [name],
    );
    if (rows.length > 0) return rows[0]!.data;
    if (SEED_ONLY_SECTIONS.has(name)) return seed;
    await query(
      `INSERT INTO content_sections (name, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (name) DO NOTHING`,
      [name, JSON.stringify(seed)],
    );
    return seed;
  } catch {
    return seed;
  }
}

export async function getAllSections(): Promise<Record<SectionName, unknown>> {
  const out = {} as Record<SectionName, unknown>;
  for (const name of ALLOWED_SECTIONS) {
    out[name] = await getSection(name);
  }
  return out;
}

export async function getContentSectionMeta(): Promise<
  Record<SectionName, { updatedAt: string | null }>
> {
  const rows = await query<{ name: string; updated_at: string | Date }>(
    `SELECT name, updated_at
     FROM content_sections
     WHERE name = ANY($1::text[])`,
    [ALLOWED_SECTIONS as unknown as string[]],
  );
  const out = {} as Record<SectionName, { updatedAt: string | null }>;
  for (const name of ALLOWED_SECTIONS) {
    out[name] = { updatedAt: null };
  }
  for (const row of rows) {
    if (!isAllowedSection(row.name)) continue;
    out[row.name] = {
      updatedAt:
        typeof row.updated_at === "string"
          ? row.updated_at
          : row.updated_at.toISOString(),
    };
  }
  return out;
}

export async function setSection(name: SectionName, data: unknown): Promise<void> {
  const stored = name === "projects" ? hashProjectPasswords(data) : data;
  await query(
    `INSERT INTO content_sections (name, data, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [name, JSON.stringify(stored)],
  );
}

function isSafeHref(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s === "") return true;
  if (s.startsWith("/") || s.startsWith("#")) return true;
  return /^(https?:|mailto:|tel:)/i.test(s);
}

export function validateSection(name: SectionName, data: unknown): string | null {
  if (typeof data !== "object" || data === null) return `Invalid ${name} payload`;

  if (name === "projects" && Array.isArray(data)) {
    const incomplete = data.find(isIncompleteProject) as { title?: unknown } | undefined;
    if (incomplete) {
      return `"${String(incomplete.title ?? "A case study")}" hasn't finished loading from the server. Reload Admin and save again.`;
    }
  }

  if (name === "homepage") {
    const home = (data as { home?: unknown }).home;
    if (typeof home !== "object" || home === null) return null;
    const h = home as Record<string, unknown>;
    if ("primaryCtaHref" in h && !isSafeHref(h["primaryCtaHref"])) {
      return "Primary CTA link must be a relative path, http(s), mailto, or tel URL";
    }
    if ("secondaryCtaHref" in h && !isSafeHref(h["secondaryCtaHref"])) {
      return "Secondary CTA link must be a relative path, http(s), mailto, or tel URL";
    }
  }

  if (name === "contact") {
    const contact = data as Record<string, unknown>;
    const socials = contact.socials;
    if (Array.isArray(socials)) {
      for (const s of socials) {
        if (s && typeof s === "object" && "href" in s && !isSafeHref((s as Record<string, unknown>).href)) {
          return "Social link must use http(s), mailto, tel, or a relative path";
        }
      }
    }
  }

  // Validate all href fields across any section
  const checkHrefs = (obj: unknown): string | null => {
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const err = checkHrefs(item);
        if (err) return err;
      }
      return null;
    }
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "href" && !isSafeHref(val)) {
        return `Link "${val}" must use http(s), mailto, tel, or a relative path`;
      }
      if (val && typeof val === "object") {
        const err = checkHrefs(val);
        if (err) return err;
      }
    }
    return null;
  };
  const hrefErr = checkHrefs(data);
  if (hrefErr) return hrefErr;

  return null;
}
