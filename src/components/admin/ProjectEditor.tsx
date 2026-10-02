/**
 * ProjectEditor — edit project details, sections, cover images, tags, etc.
 * Includes SectionsEditor for managing text/image/problem-solution blocks.
 */
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import { AdminSortableList } from "@/pages/admin-sortable";
import type { Project, Section, SectionType } from "./types";
import {
  TextInput,
  TextareaInput,
  CheckboxInput,
  TagsInput,
} from "./shared";
import {
  SectionImageUploader,
  UploadToLibraryDashed,
  PickFromLibraryButton,
} from "./AssetLibrary";
import { parseBriefToProject } from "@/lib/case-study-brief";

// ── Helpers ────────────────────────────────────────────────────────────

const SECTION_TYPES = new Set<SectionType>([
  "text",
  "image",
  "video",
  "problem-solution",
  "embed",
]);

/** Normalize a sections array from JSON upload (full project or bare array). */
function normalizeSections(raw: unknown): Section[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s, i) => {
      const type = SECTION_TYPES.has(s.type as SectionType)
        ? (s.type as SectionType)
        : "text";
      const visibility =
        s.visibility === "detail" || s.visibility === "always"
          ? s.visibility
          : undefined;
      return {
        ...s,
        id: typeof s.id === "string" && s.id ? s.id : `imported-${Date.now()}-${i}`,
        type,
        ...(visibility ? { visibility } : {}),
      } as Section;
    });
}

/**
 * Merge legacy detailSections into one list with visibility flags.
 * Prefer a single sections[] going forward — DB stays JSONB-safe either way.
 */
function mergeLegacyDetailSections(
  sections: Section[],
  detailSections?: Section[],
): Section[] {
  if (!detailSections?.length) return sections;
  const seen = new Set(sections.map((s) => s.id));
  const extras = detailSections
    .filter((s) => !seen.has(s.id))
    .map((s) => ({ ...s, visibility: s.visibility ?? ("detail" as const) }));
  const withAlways = sections.map((s) => ({
    ...s,
    visibility: s.visibility ?? ("always" as const),
  }));
  // Interleave: keep detail order when it contains skim ids; else append extras.
  const detailIds = new Set(detailSections.map((s) => s.id));
  const skimOnly = withAlways.filter((s) => !detailIds.has(s.id));
  if (skimOnly.length === withAlways.length) {
    return [...withAlways, ...extras];
  }
  const byId = new Map(withAlways.map((s) => [s.id, s]));
  return detailSections.map((d) => {
    const skim = byId.get(d.id);
    if (skim) return { ...d, ...skim, visibility: "always" as const };
    return { ...d, visibility: d.visibility ?? ("detail" as const) };
  });
}

type ParseResult =
  | { ok: true; patch: Partial<Project> }
  | { ok: false; error: string };

/** Detect export scripts / READMEs mistakenly uploaded instead of case-study JSON. */
function isNotCaseStudyContent(raw: string, filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mjs") || lower.endsWith(".js") || lower.endsWith(".ts")) {
    return `“${filename}” is a script, not case-study data. Upload habiganize-case-study-upload.json from the exports folder.`;
  }
  if (
    /\bimport\s+fs\b/.test(raw) ||
    /\bfrom\s+["']node:/.test(raw) ||
    /\bfs\.writeFileSync\b/.test(raw) ||
    /\bfileURLToPath\b/.test(raw) ||
    /export-habiganize-upload/.test(raw)
  ) {
    return `This file looks like the export script / generator, not the upload JSON. Use exports/habiganize-case-study-upload.json.`;
  }
  if (
    /^#\s*Habiganize\s*[—\-]\s*Admin upload package/m.test(raw) ||
    (/Admin upload package/.test(raw) && /Upload JSON \/ TXT/.test(raw) && !raw.trimStart().startsWith("{"))
  ) {
    return `That file is the README instructions. Upload the .json next to it: habiganize-case-study-upload.json.`;
  }
  return null;
}

function looksLikeCodeSnippet(value: string): boolean {
  if (!value || value.length < 40) return false;
  return /(?:\bh\.\w+\b|\.map\s*\(|detailOnlyTitles|writeFileSync|cardDescription\s*\?|fs\.mkdirSync)/.test(
    value,
  );
}

function parseJsonProject(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "Invalid JSON. Upload habiganize-case-study-upload.json (not the .mjs script or README).",
    };
  }

  // Bare sections array → fill Sections tab only
  if (Array.isArray(parsed)) {
    const sections = normalizeSections(parsed);
    return sections ? { ok: true, patch: { sections } } : { ok: false, error: "JSON array had no valid sections." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "JSON must be a project object or a sections array." };
  }
  const obj = parsed as Partial<Project> & { detailSections?: Section[] };

  const importedSections = normalizeSections(obj.sections);
  const legacyDetail = normalizeSections(obj.detailSections);
  const sections =
    importedSections != null
      ? mergeLegacyDetailSections(importedSections, legacyDetail)
      : legacyDetail
        ? mergeLegacyDetailSections([], legacyDetail)
        : undefined;

  const patch: Partial<Project> = {};
  if (typeof obj.title === "string") patch.title = obj.title;
  if (typeof obj.slug === "string") patch.slug = obj.slug;
  else if (typeof obj.title === "string") {
    patch.slug = obj.title.toLowerCase().replace(/\s+/g, "-");
  }
  if (typeof obj.subtitle === "string") patch.subtitle = obj.subtitle;
  if (typeof obj.cardDescription === "string") patch.cardDescription = obj.cardDescription;
  if (typeof obj.type === "string") patch.type = obj.type;
  if (typeof obj.users === "string") patch.users = obj.users;
  if (typeof obj.methods === "string") patch.methods = obj.methods;
  if (Array.isArray(obj.tags)) patch.tags = obj.tags;
  if (typeof obj.description === "string") patch.description = obj.description;
  if (Array.isArray(obj.bullets)) patch.bullets = obj.bullets;
  if (typeof obj.challenge === "string") patch.challenge = obj.challenge;
  if (typeof obj.solution === "string") patch.solution = obj.solution;
  if (typeof obj.impact === "string") patch.impact = obj.impact;
  if (typeof obj.coverImage === "string") patch.coverImage = obj.coverImage;
  if (typeof obj.logo === "string") patch.logo = obj.logo;
  if (obj.cardLayout === "vertical" || obj.cardLayout === "horizontal") {
    patch.cardLayout = obj.cardLayout;
  }
  if (typeof obj.year === "string") patch.year = obj.year;
  if (typeof obj.period === "string") patch.period = obj.period;
  if (typeof obj.featured === "boolean") patch.featured = obj.featured;
  if (typeof obj.archived === "boolean") patch.archived = obj.archived;
  if (sections) {
    patch.sections = sections;
    // Drop deprecated field on import so Save writes one list only
    patch.detailSections = undefined;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "JSON parsed but had no recognizable project fields." };
  }
  return { ok: true, patch };
}

function parseFileToProject(raw: string, filename: string): ParseResult {
  const blocked = isNotCaseStudyContent(raw, filename);
  if (blocked) return { ok: false, error: blocked };

  const trimmed = raw.trimStart();
  const lower = filename.toLowerCase();

  // Prefer JSON whenever content or extension says so (avoids TXT scraping scripts/READMEs)
  if (lower.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonProject(raw);
  }

  const get = (label: string): string => {
    const re = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+(?:\\n(?![A-Z][a-z]+\\s*:)[^\\n]+)*)`,
      "i",
    );
    const m = raw.match(re);
    return m ? m[1].trim() : "";
  };

  const patch: Partial<Project> = {
    title: get("title") || get("project name") || get("name"),
    subtitle: get("subtitle") || get("tagline"),
    description: get("description") || get("overview") || get("about"),
    challenge: get("challenge") || get("problem"),
    solution: get("solution") || get("approach"),
    impact: get("impact") || get("outcome") || get("results"),
    type: get("type") || get("role") || "Product Design",
    users: get("users") || get("audience"),
    methods: get("methods") || get("process"),
    year: get("year") || String(new Date().getFullYear()),
  };

  const suspect = [patch.title, patch.subtitle, patch.type, patch.year, patch.description].find(
    (v) => typeof v === "string" && looksLikeCodeSnippet(v),
  );
  if (suspect) {
    return {
      ok: false,
      error:
        "TXT import looked like source code (e.g. h.subtitle / detail.map). Upload exports/habiganize-case-study-upload.json instead.",
    };
  }

  if (!patch.title) {
    return {
      ok: false,
      error: "Could not read project fields from that file. Use a .json case-study upload.",
    };
  }

  return { ok: true, patch };
}

// ── SectionsEditor ─────────────────────────────────────────────────────

function VisibilityToggle({
  value,
  onChange,
}: {
  value: "always" | "detail";
  onChange: (v: "always" | "detail") => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[#8A8278] text-xs uppercase tracking-widest">Show in</span>
      {(["always", "detail"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
            value === opt
              ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
              : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
          }`}
        >
          {opt === "always" ? "Skim (default)" : "See more only"}
        </button>
      ))}
    </div>
  );
}

function MediaLinkFields({
  href,
  linkLabel,
  onChange,
}: {
  href?: string;
  linkLabel?: string;
  onChange: (patch: { href?: string; linkLabel?: string }) => void;
}) {
  return (
    <>
      <TextInput
        label="Product / CTA link (optional)"
        value={href ?? ""}
        onChange={(v) => onChange({ href: v })}
      />
      <TextInput
        label="Link label (optional)"
        value={linkLabel ?? ""}
        onChange={(v) => onChange({ linkLabel: v })}
      />
      <p className="text-[#4A4540] text-xs leading-relaxed -mt-1">
        Shows a “Click here to try the product →” style link under the media. Use https://… — no iframe.
      </p>
    </>
  );
}

function SectionsEditor({
  sections,
  onChange,
}: {
  sections: Section[];
  onChange: (s: Section[]) => void;
}) {
  const addSection = (type: SectionType) => {
    const id = String(Date.now());
    let newSec: Section;
    if (type === "text") newSec = { id, type, visibility: "always", title: "", summary: "", body: "" };
    else if (type === "image") newSec = { id, type, visibility: "always", src: "", caption: "", href: "", linkLabel: "" };
    else if (type === "video") newSec = { id, type, visibility: "always", src: "", caption: "", title: "", href: "", linkLabel: "" };
    else if (type === "embed") newSec = { id, type, visibility: "always", src: "", title: "", caption: "", height: 500 };
    else newSec = { id, type, visibility: "always", problem: "", solution: "" };
    onChange([newSec, ...sections]);
  };

  const update = (idx: number, patch: Partial<Section>) => {
    onChange(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const remove = (idx: number) => onChange(sections.filter((_, i) => i !== idx));

  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...sections];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    onChange(arr);
  };

  const detailCount = sections.filter((s) => s.visibility === "detail").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 flex-wrap">
        {(["text", "image", "video", "problem-solution", "embed"] as SectionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => addSection(t)}
            className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-1.5 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
          >
            + {t}
          </button>
        ))}
      </div>
      <p className="text-[#4A4540] text-xs leading-relaxed -mt-2">
        New blocks land at the top — reorder with ↑ ↓. Mark blocks “See more only” for the expand button.
        Upload JSON (full project or a bare sections array) to fill these fields automatically.
        {detailCount > 0 ? ` ${detailCount} block(s) hidden until See more.` : ""}
      </p>

      {sections.length === 0 && (
        <p className="text-[#4A4540] text-sm italic">
          No sections yet. Add text, image, video, problem-solution, or embed — or Upload JSON / TXT.
        </p>
      )}

      {sections.map((sec, idx) => (
        <div key={sec.id} className="border border-[#272421] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[#C8A96E] text-sm uppercase tracking-widest">
              {sec.type}
              {sec.visibility === "detail" ? (
                <span className="ml-2 text-[10px] text-[#8A8278] normal-case tracking-normal">· see more</span>
              ) : null}
            </span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => move(idx, -1)} className="text-[#4A4540] hover:text-[#F2EDE5] text-sm">↑</button>
              <button type="button" onClick={() => move(idx, 1)} className="text-[#4A4540] hover:text-[#F2EDE5] text-sm">↓</button>
              <button type="button" onClick={() => remove(idx)} className="text-[#4A4540] hover:text-red-400 text-sm">Remove</button>
            </div>
          </div>

          <VisibilityToggle
            value={sec.visibility === "detail" ? "detail" : "always"}
            onChange={(v) => update(idx, { visibility: v })}
          />

          {sec.type === "text" && (
            <>
              <TextInput label="Section Title (left)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput label="Summary line (right)" value={sec.summary ?? ""} onChange={(v) => update(idx, { summary: v })} />
              <TextareaInput label="Body text (below)" value={sec.body ?? ""} onChange={(v) => update(idx, { body: v })} rows={4} />
              <TextareaInput
                label="Bullets (one per line, optional)"
                value={(sec.bullets ?? []).join("\n")}
                onChange={(v) =>
                  update(idx, {
                    bullets: v.split("\n").map((b) => b.trim()).filter(Boolean),
                  })
                }
                rows={3}
              />
              <div className="border-t border-[#272421] pt-3 flex flex-col gap-3">
                <p className="text-[#8A8278] text-[10px] uppercase tracking-widest">
                  Expanded copy (optional — swaps in when See more is on)
                </p>
                <TextInput label="Title when expanded" value={sec.titleDetail ?? ""} onChange={(v) => update(idx, { titleDetail: v })} />
                <TextInput label="Summary when expanded" value={sec.summaryDetail ?? ""} onChange={(v) => update(idx, { summaryDetail: v })} />
                <TextareaInput label="Body when expanded" value={sec.bodyDetail ?? ""} onChange={(v) => update(idx, { bodyDetail: v })} rows={4} />
                <TextareaInput
                  label="Bullets when expanded (one per line)"
                  value={(sec.bulletsDetail ?? []).join("\n")}
                  onChange={(v) =>
                    update(idx, {
                      bulletsDetail: v.split("\n").map((b) => b.trim()).filter(Boolean),
                    })
                  }
                  rows={3}
                />
              </div>
            </>
          )}

          {sec.type === "image" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput label="Image URL" value={sec.src ?? ""} onChange={(v) => update(idx, { src: v })} />
              <div className="flex items-center gap-2 flex-wrap">
                <SectionImageUploader
                  accept="image/*,.gif,.png,.jpg,.jpeg,.webp"
                  label="↑ Upload image"
                  onPicked={(url) => update(idx, { src: url })}
                />
                <PickFromLibraryButton
                  type="image"
                  onPick={(url) => update(idx, { src: url })}
                />
              </div>
              <TextInput label="Caption (optional)" value={sec.caption ?? ""} onChange={(v) => update(idx, { caption: v })} />
              <MediaLinkFields
                href={sec.href}
                linkLabel={sec.linkLabel}
                onChange={(patch) => update(idx, patch)}
              />
              {sec.src && (
                <SafeImage src={sec.src} alt="" className="h-24 object-cover opacity-60 mt-1" />
              )}
            </>
          )}

          {sec.type === "video" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput label="Video URL (.mp4 / .webm)" value={sec.src ?? ""} onChange={(v) => update(idx, { src: v })} />
              <div className="flex items-center gap-2 flex-wrap">
                <SectionImageUploader
                  accept="video/mp4,video/webm,.mp4,.webm"
                  label="↑ Upload video"
                  onPicked={(url) => update(idx, { src: url })}
                />
                <PickFromLibraryButton
                  type="video"
                  onPick={(url) => update(idx, { src: url })}
                />
              </div>
              <TextInput label="Caption (optional)" value={sec.caption ?? ""} onChange={(v) => update(idx, { caption: v })} />
              <MediaLinkFields
                href={sec.href}
                linkLabel={sec.linkLabel}
                onChange={(patch) => update(idx, patch)}
              />
              {sec.src && (
                <video src={sec.src} muted playsInline className="h-24 object-cover opacity-60 mt-1 w-full bg-[#0A0908]" />
              )}
              <p className="text-[#4A4540] text-xs">Plays with controls on the case study (no autoplay) so the page stays stable.</p>
            </>
          )}

          {sec.type === "problem-solution" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextareaInput label="Problem" value={sec.problem ?? ""} onChange={(v) => update(idx, { problem: v })} rows={3} />
              <TextareaInput label="Solution" value={sec.solution ?? ""} onChange={(v) => update(idx, { solution: v })} rows={3} />
              <div className="border-t border-[#272421] pt-3 flex flex-col gap-3">
                <p className="text-[#8A8278] text-[10px] uppercase tracking-widest">
                  Expanded copy (optional — swaps in when See more is on)
                </p>
                <TextareaInput label="Problem when expanded" value={sec.problemDetail ?? ""} onChange={(v) => update(idx, { problemDetail: v })} rows={3} />
                <TextareaInput label="Solution when expanded" value={sec.solutionDetail ?? ""} onChange={(v) => update(idx, { solutionDetail: v })} rows={3} />
              </div>
            </>
          )}

          {sec.type === "embed" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput
                label="Embed URL (online.pubhtml5.com only)"
                value={sec.src ?? ""}
                onChange={(v) => update(idx, { src: v })}
              />
              <TextInput
                label="Height (px)"
                value={String(sec.height ?? 500)}
                onChange={(v) => {
                  const n = parseInt(v, 10);
                  update(idx, { height: Number.isFinite(n) && n > 0 ? n : 500 });
                }}
              />
              <TextInput label="Caption (optional)" value={sec.caption ?? ""} onChange={(v) => update(idx, { caption: v })} />
              <p className="text-[#4A4540] text-xs leading-relaxed">
                PubHTML5 viewer URLs only. For live products, use Image/Video + Product CTA link instead of an iframe.
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}


// ── ProjectsEditor ─────────────────────────────────────────────────────

function projectHasWritableCopy(p: Project): boolean {
  return Boolean(
    p.subtitle?.trim() ||
      p.description?.trim() ||
      p.challenge?.trim() ||
      p.solution?.trim() ||
      p.impact?.trim() ||
      (p.sections?.length ?? 0) > 0,
  );
}

function BriefAutofillPanel({
  onApply,
  hasExistingCopy,
}: {
  onApply: (patch: Partial<Project>) => void;
  hasExistingCopy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [includeSections, setIncludeSections] = useState(true);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const fillFromBrief = () => {
    setError("");
    setHint("");
    if (
      hasExistingCopy &&
      !window.confirm(
        "This will overwrite title, subtitle, overview, problem/solution/impact, and (if enabled) sections. Cover image and logo stay. Continue?",
      )
    ) {
      return;
    }

    const result = parseBriefToProject(brief, { includeSections });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onApply(result.patch as Partial<Project>);
    setHint(
      includeSections
        ? `Filled from brief (local) — ${result.patch.sections?.length ?? 0} sections. Review, add images, then Save.`
        : "Filled hero and Overview / Problem / Solution / Impact from brief. Review, then Save.",
    );
  };

  return (
    <div className="border border-[#272421] p-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between text-left"
      >
        <span className="text-[#C8A96E] text-xs uppercase tracking-widest">
          Fill from brief
        </span>
        <span className="text-[#4A4540] text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <>
          <p className="text-[#4A4540] text-xs leading-relaxed">
            Paste a labeled brief. Runs in your browser only — no API key, no network call.
            Use lines like <span className="text-[#8A8278]">Title:</span>,{" "}
            <span className="text-[#8A8278]">Role:</span>,{" "}
            <span className="text-[#8A8278]">Problem:</span>,{" "}
            <span className="text-[#8A8278]">Solution:</span>,{" "}
            <span className="text-[#8A8278]">Impact:</span>.
          </p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            placeholder={`Title: Habiganize\nRole: Product Designer\nUsers: People who quit habit apps in a week\nMethods: Retention research, Figma system, IA\nProblem: Habit apps lose users because quitting costs nothing.\nSolution: Pair check-ins with a pet-care economy.\nImpact: Live multi-platform product; store release next.\nTags: Product Design, UX, Gamification`}
            className="bg-transparent border border-[#3A3530] text-[#F2EDE5] p-3 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors placeholder:text-[#3A3530] resize-y min-h-[140px]"
          />
          <label className="flex items-center gap-2 text-sm text-[#8A8278] cursor-pointer">
            <input
              type="checkbox"
              checked={includeSections}
              onChange={(e) => setIncludeSections(e.target.checked)}
              className="accent-[#C8A96E]"
            />
            Also build narrative sections from the brief
          </label>
          <button
            type="button"
            onClick={fillFromBrief}
            className="self-start text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
          >
            Fill case study
          </button>
          {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
          {hint && <p className="text-[#8A8278] text-xs leading-relaxed">{hint}</p>}
        </>
      )}
    </div>
  );
}

export function ProjectsEditor({
  data,
  onChange,
  tagSuggestions,
}: {
  data: Project[];
  onChange: (d: Project[]) => void;
  tagSuggestions: string[];
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [subTab, setSubTab] = useState<"details" | "sections">("details");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "active" | "archived"
  >("all");

  const selectedProjectId = data[selectedIdx]?.id;
  const projectCounts = {
    all: data.length,
    active: data.filter((p) => !p.archived).length,
    archived: data.filter((p) => Boolean(p.archived)).length,
  };
  const visibleProjects = data.filter((p) => {
    if (visibilityFilter === "active") return !p.archived;
    if (visibilityFilter === "archived") return Boolean(p.archived);
    return true;
  });

  useEffect(() => {
    if (data.length === 0) return;
    if (!selectedProjectId) {
      setSelectedIdx(0);
      return;
    }
    const selectedStillVisible = visibleProjects.some((p) => p.id === selectedProjectId);
    if (selectedStillVisible) return;
    const fallback = visibleProjects[0];
    if (!fallback) return;
    const fallbackIdx = data.findIndex((p) => p.id === fallback.id);
    if (fallbackIdx !== -1) setSelectedIdx(fallbackIdx);
  }, [data, visibleProjects, selectedProjectId]);

  const updateProject = (idx: number, patch: Partial<Project>) => {
    onChange(data.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addProject = () => {
    const newProject: Project = {
      id: String(Date.now()),
      slug: "new-project",
      title: "New Project",
      subtitle: "",
      cardDescription: "",
      type: "Product Design",
      users: "",
      methods: "",
      tags: [],
      description: "",
      challenge: "",
      solution: "",
      impact: "",
      coverImage: "",
      year: String(new Date().getFullYear()),
      featured: false,
      archived: false,
      sections: [],
    };
    const updated = [...data, newProject];
    onChange(updated);
    setSelectedIdx(updated.length - 1);
  };

  const removeProject = (idx: number) => {
    onChange(data.filter((_, i) => i !== idx));
    setSelectedIdx(Math.max(0, idx - 1));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target?.result as string;
      const result = parseFileToProject(raw, file.name);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      const { patch } = result;
      if (Object.keys(patch).length === 0) return;
      const current = data[selectedIdx];
      if (!current) return;
      const next: Project = { ...current, ...patch };
      // Explicitly drop deprecated dual-list field after a sections import
      if ("sections" in patch) {
        delete next.detailSections;
      }
      onChange(data.map((p, i) => (i === selectedIdx ? next : p)));
      if (patch.sections?.length) setSubTab("sections");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const project = data[selectedIdx];

  return (
    <div className="flex gap-6 h-full">
      <div className="w-44 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={addProject}
          className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest mb-2"
        >
          + Add Project
        </button>
        <div className="mb-2 flex flex-col gap-1">
          {(
            [
              { id: "all" as const, label: "All", count: projectCounts.all },
              { id: "active" as const, label: "Active", count: projectCounts.active },
              { id: "archived" as const, label: "Archived", count: projectCounts.archived },
            ]
          ).map((opt) => {
            const active = visibilityFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVisibilityFilter(opt.id)}
                className={`flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest px-2 py-1.5 border transition-colors ${
                  active
                    ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                    : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`tabular-nums text-[9px] px-1.5 py-0.5 rounded ${
                    active ? "bg-[#0A0908]/20" : "bg-[#1B1815] text-[#4A4540]"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
        <AdminSortableList
          items={visibleProjects}
          onReorder={(newArr) => {
            const selectedId = data[selectedIdx]?.id;
            let reorderedFull = newArr;
            if (visibilityFilter === "all") {
              onChange(newArr);
            } else {
              const next = [...data];
              const positions = data.reduce<number[]>((acc, item, i) => {
                const matches =
                  visibilityFilter === "active"
                    ? !item.archived
                    : Boolean(item.archived);
                if (matches) acc.push(i);
                return acc;
              }, []);
              positions.forEach((pos, i) => {
                next[pos] = newArr[i]!;
              });
              reorderedFull = next;
              onChange(next);
            }
            if (selectedId) {
              const newIdx = reorderedFull.findIndex((p) => p.id === selectedId);
              if (newIdx !== -1) setSelectedIdx(newIdx);
            }
          }}
          renderItem={(p, i, dragHandle) => (
            <div className="flex items-center gap-1">
              {dragHandle}
              <button
                onClick={() => {
                  const realIdx = data.findIndex((x) => x.id === p.id);
                  if (realIdx !== -1) setSelectedIdx(realIdx);
                  setSubTab("details");
                }}
                className={`flex-1 text-left text-sm px-2 py-2 truncate transition-colors ${
                  p.id === selectedProjectId
                    ? "bg-[#C8A96E] text-[#0A0908]"
                    : "text-[#8A8278] hover:text-[#F2EDE5] border border-[#272421] hover:border-[#3A3530]"
                }`}
              >
                {p.title}
                {p.featured ? " ★" : ""}
                {p.archived && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest opacity-70">
                    (archived)
                  </span>
                )}
              </button>
            </div>
          )}
        />
      </div>

      {project && (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-3">
              {(["details", "sections"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSubTab(t)}
                  className={`text-sm uppercase tracking-widest transition-colors pb-1 ${
                    subTab === t
                      ? "text-[#C8A96E] border-b border-[#C8A96E]"
                      : "text-[#4A4540] hover:text-[#8A8278]"
                  }`}
                >
                  {t} {t === "sections" && `(${project.sections?.length ?? 0})`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-[#C8A96E] border border-[#C8A96E] px-2 py-1 cursor-pointer hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest">
                Upload JSON / TXT
                <input
                  type="file"
                  accept=".json,application/json,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={() => removeProject(selectedIdx)}
                className="text-sm text-[#4A4540] hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {subTab === "details" && (
            <div className="flex flex-col gap-5">
              <BriefAutofillPanel
                hasExistingCopy={projectHasWritableCopy(project)}
                onApply={(patch) => {
                  const current = data[selectedIdx];
                  if (!current) return;
                  const next: Project = { ...current, ...patch };
                  if ("sections" in patch) {
                    delete next.detailSections;
                    setSubTab("sections");
                  }
                  onChange(data.map((p, i) => (i === selectedIdx ? next : p)));
                }}
              />
              <TextInput label="Title" value={project.title} onChange={(v) => updateProject(selectedIdx, { title: v })} />
              <TextInput
                label="Slug (URL path)"
                value={project.slug}
                onChange={(v) => updateProject(selectedIdx, { slug: v })}
                hint="Used in the URL: /work/your-slug"
              />

              <div className="border border-[#272421] p-4 flex flex-col gap-4">
                <p className="text-[#C8A96E] text-xs uppercase tracking-widest">Case study hero</p>
                <TextInput
                  label="Subtitle"
                  value={project.subtitle}
                  onChange={(v) => updateProject(selectedIdx, { subtitle: v })}
                  hint="One-line pitch under the title on the case study page."
                  placeholder="e.g. Restructured IA to help riders find trip info faster"
                />
                <TextInput
                  label="Card description"
                  value={project.cardDescription || ""}
                  onChange={(v) => updateProject(selectedIdx, { cardDescription: v })}
                  hint="Short text on Work page cards on hover. Leave blank to reuse the subtitle."
                  placeholder="Optional — shown on Work cards only"
                />
              </div>

              <div className="border border-[#272421] p-4 flex flex-col gap-4">
                <p className="text-[#C8A96E] text-xs uppercase tracking-widest">Metadata strip (Role · Users · Methods)</p>
                <p className="text-[#4A4540] text-xs leading-relaxed -mt-2">
                  These three fields appear under the title on the case study page.
                </p>
                <TextInput
                  label="Role"
                  value={project.type}
                  onChange={(v) => updateProject(selectedIdx, { type: v })}
                  hint="Your role on this project (also the badge on Work cards)."
                  placeholder="e.g. UX Designer"
                />
                <TextInput
                  label="Users"
                  value={project.users || ""}
                  onChange={(v) => updateProject(selectedIdx, { users: v })}
                  hint="Who you designed for."
                  placeholder="e.g. TTC riders (task-based usability testing)"
                />
                <TextInput
                  label="Methods"
                  value={project.methods || ""}
                  onChange={(v) => updateProject(selectedIdx, { methods: v })}
                  hint="Research and design methods used."
                  placeholder="e.g. IA audit, usability testing, wireframes"
                />
                <TextInput label="Year" value={project.year} onChange={(v) => updateProject(selectedIdx, { year: v })} />
              </div>

              {/* Cover image / video upload */}
              <div className="flex flex-col gap-2">
                <label className="text-[#8A8278] text-xs uppercase tracking-widest">Cover Image / Video</label>
                <p className="text-[#4A4540] text-xs leading-relaxed">Hero media at the top of the case study and on Work cards.</p>
                <input
                  type="text"
                  value={project.coverImage}
                  onChange={(e) => updateProject(selectedIdx, { coverImage: e.target.value })}
                  placeholder="Paste URL (jpg, png, gif, mp4…)"
                  className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors placeholder:text-[#3A3530]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload file — image / gif / mp4"
                    accept="image/*,video/mp4,video/webm,.gif,.mp4,.webm"
                    onUploaded={(url) =>
                      updateProject(selectedIdx, { coverImage: url })
                    }
                  />
                  <PickFromLibraryButton
                    onPick={(url) => updateProject(selectedIdx, { coverImage: url })}
                  />
                </div>
                {project.coverImage && (
                  <div className="rounded overflow-hidden border border-[#3A3530]" style={{ maxHeight: "130px" }}>
                    {/\.(mp4|webm|ogg|mov)(\?|$)/i.test(project.coverImage) || project.coverImage.startsWith("data:video") ? (
                      <video src={project.coverImage} autoPlay loop muted playsInline className="w-full object-cover" style={{ maxHeight: "130px" }} />
                    ) : (
                      <SafeImage src={project.coverImage} alt="cover preview" className="w-full object-cover" style={{ maxHeight: "130px" }} />
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[#8A8278] text-xs uppercase tracking-widest">Card layout (Work / Home grid)</label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      { value: "vertical" as const, label: "Vertical" },
                      { value: "horizontal" as const, label: "Horizontal" },
                    ] as const
                  ).map(({ value, label }) => {
                    const active = (project.cardLayout ?? "vertical") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          updateProject(selectedIdx, {
                            cardLayout: value === "vertical" ? undefined : value,
                          })
                        }
                        className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                          active
                            ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                            : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[#4A4540] text-xs leading-relaxed">
                  Vertical = one 4:5 card. Horizontal = the width of two cards plus the gap between them, same height.
                </p>
              </div>

              {/* Hover preview video + live URL */}
              <div className="flex flex-col gap-2">
                <label className="text-[#8A8278] text-xs uppercase tracking-widest">Hover Preview Video</label>
                <p className="text-[#4A4540] text-xs leading-relaxed">
                  Short muted loop that plays after a long hover on Work/Home cards. Leave empty to keep the static cover.
                </p>
                <input
                  type="text"
                  value={project.hoverVideo ?? ""}
                  onChange={(e) => updateProject(selectedIdx, { hoverVideo: e.target.value })}
                  placeholder="Paste mp4/webm URL"
                  className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors placeholder:text-[#3A3530]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload hover video"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    onUploaded={(url) => updateProject(selectedIdx, { hoverVideo: url })}
                  />
                  <PickFromLibraryButton
                    type="video"
                    onPick={(url) => updateProject(selectedIdx, { hoverVideo: url })}
                  />
                </div>
              </div>
              <TextInput
                label="Live product URL"
                value={project.liveUrl ?? ""}
                onChange={(v) => updateProject(selectedIdx, { liveUrl: v })}
                hint="Powers the floating VIEW LIVE badge on the case study page."
                placeholder="https://…"
              />

              <div className="flex flex-col gap-2">
                <label className="text-[#8A8278] text-xs uppercase tracking-widest">Logo (Studio marquee)</label>
                <p className="text-[#4A4540] text-xs leading-relaxed">
                  Square mark for the looping logo strip at the bottom of the Work page. Leave blank to skip this project.
                </p>
                <input
                  type="text"
                  value={project.logo ?? ""}
                  onChange={(e) => updateProject(selectedIdx, { logo: e.target.value })}
                  placeholder="Paste logo URL"
                  className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors placeholder:text-[#3A3530]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload logo"
                    accept="image/*"
                    onUploaded={(url) => updateProject(selectedIdx, { logo: url })}
                  />
                  <PickFromLibraryButton
                    type="image"
                    onPick={(url) => updateProject(selectedIdx, { logo: url })}
                  />
                </div>
                {project.logo && (
                  <SafeImage src={project.logo} alt="logo preview" className="h-12 w-auto object-contain" fallbackAspect="1 / 1" />
                )}
              </div>
              <TagsInput
                label="Tags"
                tags={project.tags ?? []}
                suggestions={tagSuggestions}
                onChange={(tags) => updateProject(selectedIdx, { tags })}
              />

              <div className="border border-[#272421] p-4 flex flex-col gap-4">
                <p className="text-[#C8A96E] text-xs uppercase tracking-widest">Case study body (Overview · Problem · Solution · Impact)</p>
                <p className="text-[#4A4540] text-xs leading-relaxed -mt-2">
                  These blocks render above your custom sections on the case study page. Scroll past the cover image to see them. Empty fields are hidden.
                </p>
                <TextareaInput
                  label="Overview"
                  value={project.description}
                  onChange={(v) => updateProject(selectedIdx, { description: v })}
                  hint="Main project summary — the Overview section under the cover."
                  rows={4}
                />
                <TextareaInput
                  label="Problem"
                  value={project.challenge}
                  onChange={(v) => updateProject(selectedIdx, { challenge: v })}
                  hint="Left card under Overview — the challenge you tackled."
                  rows={3}
                />
                <TextareaInput
                  label="Solution"
                  value={project.solution}
                  onChange={(v) => updateProject(selectedIdx, { solution: v })}
                  hint="Right card under Overview — your approach."
                  rows={3}
                />
                <TextareaInput
                  label="Impact"
                  value={project.impact}
                  onChange={(v) => updateProject(selectedIdx, { impact: v })}
                  hint="Results / outcomes block below Problem & Solution."
                  rows={3}
                />
              </div>

              <CheckboxInput label="★ Show on homepage Selected Work" checked={project.featured} onChange={(v) => updateProject(selectedIdx, { featured: v })} />
              <CheckboxInput
                label="Archive (hide from public site)"
                checked={Boolean(project.archived)}
                onChange={(v) => updateProject(selectedIdx, { archived: v })}
              />
            </div>
          )}

          {subTab === "sections" && (
            <SectionsEditor
              sections={project.sections ?? []}
              onChange={(s) => updateProject(selectedIdx, { sections: s })}
            />
          )}
        </div>
      )}
    </div>
  );
}
