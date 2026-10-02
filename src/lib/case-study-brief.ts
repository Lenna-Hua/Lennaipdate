/**
 * Local brief → case-study patch (no API / no LLM).
 * Parses labeled lines, markdown headings, and bullet lists from pasted text.
 */

export type BriefSection = {
  id: string;
  type: "text" | "problem-solution";
  visibility: "always" | "detail";
  title: string;
  summary?: string;
  body?: string;
  bullets?: string[];
  problem?: string;
  solution?: string;
};

export type BriefProjectPatch = {
  title?: string;
  slug?: string;
  subtitle?: string;
  cardDescription?: string;
  type?: string;
  users?: string;
  methods?: string;
  year?: string;
  tags?: string[];
  description?: string;
  bullets?: string[];
  challenge?: string;
  solution?: string;
  impact?: string;
  sections?: BriefSection[];
};

export type ParseBriefResult =
  | { ok: true; patch: BriefProjectPatch }
  | { ok: false; error: string };

const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "project", "project name", "name", "product"],
  subtitle: ["subtitle", "tagline", "pitch", "one liner", "one-liner"],
  cardDescription: ["card description", "card", "hover", "short description"],
  type: ["role", "type", "my role"],
  users: ["users", "audience", "user", "who for", "target users"],
  methods: ["methods", "process", "approach", "what i did", "tools"],
  year: ["year", "date", "timeline", "period"],
  tags: ["tags", "skills", "keywords"],
  description: ["description", "overview", "about", "summary", "context"],
  challenge: ["challenge", "problem", "the problem", "pain point"],
  solution: ["solution", "the solution", "outcome approach"],
  impact: ["impact", "outcome", "outcomes", "results", "result"],
};

/** Section headings that become narrative blocks when includeSections is on. */
const SECTION_ALIASES: { id: string; titles: string[]; visibility: "always" | "detail" }[] = [
  { id: "problem", titles: ["problem", "the problem", "challenge"], visibility: "always" },
  { id: "research", titles: ["research", "insights", "discovery", "user research"], visibility: "always" },
  { id: "approach", titles: ["approach", "process", "methods", "what i did"], visibility: "always" },
  { id: "design", titles: ["design", "solution", "the solution", "ui", "ux"], visibility: "always" },
  { id: "outcome", titles: ["outcome", "outcomes", "impact", "results", "next steps"], visibility: "always" },
  { id: "detail", titles: ["detail", "deep dive", "notes", "appendix"], visibility: "detail" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[#*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/:$/, "");
}

function resolveField(label: string): string | null {
  const key = normalizeKey(label);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

function resolveSectionMeta(label: string): (typeof SECTION_ALIASES)[number] | null {
  const key = normalizeKey(label);
  return SECTION_ALIASES.find((s) => s.titles.includes(key)) ?? null;
}

function firstSentence(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const m = clean.match(/^(.+?[.!?])(\s|$)/);
  const sentence = (m?.[1] ?? clean).trim();
  return sentence.length > max ? `${sentence.slice(0, max - 1).trim()}…` : sentence;
}

function splitBullets(block: string): { body: string; bullets: string[] } {
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets: string[] = [];
  const prose: string[] = [];
  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet?.[1]) bullets.push(bullet[1].trim());
    else prose.push(line);
  }
  return { body: prose.join("\n\n").trim(), bullets };
}

function parseLabeledBlocks(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  // Split on lines that look like "Label:" or "## Label" or "**Label**"
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let currentLabel: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (!currentLabel) return;
    const value = buf.join("\n").trim();
    if (value) map.set(currentLabel, value);
    buf = [];
  };

  for (const line of lines) {
    const md = line.match(/^#{1,3}\s+(.+?)\s*$/);
    const bold = line.match(/^\*\*(.+?)\*\*\s*:?\s*(.*)$/);
    const plain = line.match(/^([A-Za-z][A-Za-z0-9 /&-]{0,40})\s*:\s*(.*)$/);

    let label: string | null = null;
    let rest = "";

    if (md) {
      label = md[1]!;
      rest = "";
    } else if (bold && (resolveField(bold[1]!) || resolveSectionMeta(bold[1]!))) {
      label = bold[1]!;
      rest = bold[2] ?? "";
    } else if (plain && (resolveField(plain[1]!) || resolveSectionMeta(plain[1]!))) {
      label = plain[1]!;
      rest = plain[2] ?? "";
    }

    if (label) {
      flush();
      currentLabel = normalizeKey(label);
      buf = rest.trim() ? [rest.trim()] : [];
      continue;
    }
    if (currentLabel) buf.push(line);
  }
  flush();
  return map;
}

function inferTags(methods: string, role: string): string[] {
  const pool = `${methods}, ${role}`
    .split(/[,|/]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length < 40);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of pool) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}

function buildSectionsFromMap(
  labeled: Map<string, string>,
  patch: BriefProjectPatch,
): BriefSection[] {
  const sections: BriefSection[] = [];
  const usedBodies = new Set<string>();

  for (const meta of SECTION_ALIASES) {
    let body = "";
    for (const title of meta.titles) {
      const hit = labeled.get(title);
      if (hit) {
        body = hit;
        break;
      }
    }
    // Fall back to hero fields for the core five
    if (!body) {
      if (meta.id === "problem" && patch.challenge) body = patch.challenge;
      if (meta.id === "design" && patch.solution) body = patch.solution;
      if (meta.id === "outcome" && patch.impact) body = patch.impact;
      if (meta.id === "approach" && patch.methods) body = patch.methods;
      if (meta.id === "research" && patch.users) {
        body = `Designed for: ${patch.users}.`;
      }
    }
    if (!body || usedBodies.has(body)) continue;
    usedBodies.add(body);
    const { body: prose, bullets } = splitBullets(body);
    sections.push({
      id: meta.id,
      type: "text",
      visibility: meta.visibility,
      title: meta.id === "problem" ? "The Problem" : meta.id === "outcome" ? "Outcomes" : meta.id[0]!.toUpperCase() + meta.id.slice(1),
      summary: firstSentence(prose || bullets[0] || ""),
      ...(prose ? { body: prose } : {}),
      ...(bullets.length ? { bullets } : {}),
    });
  }

  // If still thin, add overview as a section
  if (sections.length < 3 && patch.description) {
    sections.unshift({
      id: "overview",
      type: "text",
      visibility: "always",
      title: "Overview",
      summary: firstSentence(patch.description),
      body: patch.description,
      ...(patch.bullets?.length ? { bullets: patch.bullets } : {}),
    });
  }

  return sections.slice(0, 8);
}

/**
 * Parse a pasted project brief into case-study fields.
 * Runs entirely in the browser — no network.
 */
export function parseBriefToProject(
  brief: string,
  opts?: { includeSections?: boolean },
): ParseBriefResult {
  const text = brief.trim();
  if (!text) return { ok: false, error: "Paste a project brief first." };
  if (text.length < 20) {
    return { ok: false, error: "Brief is too short — add role, problem, and what you did." };
  }

  const labeled = parseLabeledBlocks(text);
  const get = (...fields: string[]) => {
    for (const f of fields) {
      for (const [label, value] of labeled) {
        if (resolveField(label) === f) return value;
      }
    }
    return "";
  };

  const title =
    get("title") ||
    text.split(/\n/).map((l) => l.trim()).find((l) => l && !l.includes(":")) ||
    "New Project";

  const challenge = get("challenge");
  const solution = get("solution");
  const impact = get("impact");
  const description = get("description") || [challenge, solution].filter(Boolean).join(" ") || firstSentence(text, 280);
  const type = get("type") || "Product Design";
  const users = get("users");
  const methods = get("methods");
  const yearMatch = get("year").match(/\b(20\d{2})\b/) || text.match(/\b(20\d{2})\b/);
  const year = yearMatch?.[1] || String(new Date().getFullYear());

  const tagsRaw = get("tags");
  const tags = tagsRaw
    ? tagsRaw.split(/[,|/]/).map((t) => t.trim()).filter(Boolean).slice(0, 6)
    : inferTags(methods, type);

  const { bullets: descBullets } = splitBullets(get("description"));
  const methodBullets = splitBullets(methods).bullets;
  const bullets = (descBullets.length ? descBullets : methodBullets).slice(0, 4);

  const subtitle =
    get("subtitle") ||
    firstSentence(description || challenge || solution || text, 120);

  const patch: BriefProjectPatch = {
    title: title.replace(/^#+\s*/, "").trim(),
    slug: slugify(title) || "new-project",
    subtitle,
    cardDescription: get("cardDescription") || firstSentence(subtitle, 100),
    type,
    users,
    methods: splitBullets(methods).body || methods,
    year,
    tags,
    description,
    ...(bullets.length ? { bullets } : {}),
    challenge,
    solution,
    impact,
  };

  // Require at least a title + one of the body fields
  if (!patch.challenge && !patch.solution && !patch.description) {
    // Unlabeled freeform: split paragraphs into overview / problem / solution
    const paras = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30);
    if (paras[0]) patch.description = paras[0];
    if (paras[1]) patch.challenge = paras[1];
    if (paras[2]) patch.solution = paras[2];
    if (paras[3]) patch.impact = paras[3];
  }

  if (!patch.title) {
    return { ok: false, error: "Could not find a title. Start with Title: … or a heading." };
  }

  if (opts?.includeSections !== false) {
    patch.sections = buildSectionsFromMap(labeled, patch);
  }

  return { ok: true, patch };
}
