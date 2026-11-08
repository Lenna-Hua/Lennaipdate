/**
 * ProjectEditor — edit project details, sections, cover images, tags, etc.
 * Includes SectionsEditor for managing text/image/problem-solution blocks.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { SafeImage } from "@/components/SafeImage";
import { CoverMedia, isVideo } from "@/components/CoverMedia";
import { embedProviderLabel, parseVideoEmbed } from "@/lib/video-embed";
import { AdminSortableList } from "@/pages/admin-sortable";
import type { ProcessStep, Project, Section, SectionType } from "./types";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Code2,
  Columns2,
  Copy,
  ExternalLink,
  Film,
  GitCommitHorizontal,
  Image as ImageIcon,
  Layers,
  Lock,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
import { stripRichText } from "@/lib/rich-text";
import {
  TextInput,
  TextareaInput,
  CheckboxInput,
  TagsInput,
  EditorBox,
  BoxCode,
} from "./shared";
import {
  SectionImageUploader,
  UploadToLibraryDashed,
  PickFromLibraryButton,
} from "./AssetLibrary";
import { parseBriefToProject } from "@/lib/case-study-brief";
import { MockupSectionEditor } from "./MockupSectionEditor";
import { ProcessStepsEditor } from "./ProcessStepsEditor";

// ── Helpers ────────────────────────────────────────────────────────────

const SECTION_TYPES = new Set<SectionType>([
  "text",
  "image",
  "video",
  "problem-solution",
  "embed",
  "mockup",
  "cta",
  "process",
]);

/** Saved passwords come back from the server as hashes, never plain text. */
function isSavedPasswordHash(v: string | undefined): v is string {
  return typeof v === "string" && v.startsWith("scrypt$");
}

function CaseStudyPasswordFields({
  password,
  onChange,
}: {
  password: string | undefined;
  onChange: (password: string | undefined) => void;
}) {
  const [savedHash, setSavedHash] = useState(() =>
    isSavedPasswordHash(password) ? password : undefined,
  );
  useEffect(() => {
    if (isSavedPasswordHash(password)) setSavedHash(password);
  }, [password]);
  const typed = password && !isSavedPasswordHash(password) ? password : "";
  const status = typed
    ? "New custom password: goes live when you Save to Site."
    : savedHash
      ? "Custom password saved."
      : "Using the shared portfolio password (CASE_STUDY_PASSWORD in Vercel).";

  return (
    <div className="flex flex-col gap-3 pl-7">
      <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
        Visitors see the title, subtitle, and blurred cover, then a password screen. The case
        study body never leaves the server until the password is correct.
      </p>
      <TextInput
        label="Custom password (optional)"
        value={typed}
        onChange={(v) => onChange(v || savedHash)}
        placeholder={savedHash ? "Saved: type to replace" : "Leave blank to use the shared password"}
        hint={status}
      />
      {(savedHash || typed) && (
        <button
          type="button"
          onClick={() => {
            setSavedHash(undefined);
            onChange(undefined);
          }}
          className="text-xs text-[color:var(--adm-accent)] hover:underline w-max"
        >
          Use the shared password instead
        </button>
      )}
    </div>
  );
}

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
      <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">Show in</span>
      {(["always", "detail"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
            value === opt
              ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
              : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
          }`}
        >
          {opt === "always" ? "Skim (default)" : "See more only"}
        </button>
      ))}
    </div>
  );
}

const MEDIA_WIDTHS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Full" },
  { value: 2, label: "Half" },
  { value: 3, label: "Third" },
];

function MediaWidthPicker({
  value,
  onChange,
}: {
  value?: 1 | 2 | 3;
  onChange: (v: 1 | 2 | 3 | undefined) => void;
}) {
  const current = value ?? 1;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">Width</span>
        {MEDIA_WIDTHS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value === 1 ? undefined : opt.value)}
            className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
              current === opt.value
                ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
                : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[color:var(--adm-faint)] text-xs">
        Half and Third sit side by side with the next Half / Third image or video on desktop.
      </p>
    </div>
  );
}

const CHECKERBOARD: CSSProperties = {
  backgroundColor: "#FFFFFF",
  backgroundImage: "conic-gradient(#E4E2DC 25%, transparent 0 50%, #E4E2DC 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
};

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
      <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-1">
        Shows a “Click here to try the product →” style link under the media. Use https://…: no iframe.
      </p>
    </>
  );
}

const SECTION_TYPE_LABEL: Record<SectionType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  mockup: "Mockup",
  "problem-solution": "Problem / Solution",
  embed: "Embed",
  cta: "CTA Button (only)",
  process: "Process (step cards)",
};

function SectionTypeIcon({
  type,
  processLayout,
  className = "h-3.5 w-3.5 stroke-[1.75]",
}: {
  type: SectionType;
  processLayout?: "stack" | "flow";
  className?: string;
}) {
  if (type === "text") return <AlignLeft className={className} aria-hidden />;
  if (type === "image") return <ImageIcon className={className} aria-hidden />;
  if (type === "video") return <Film className={className} aria-hidden />;
  if (type === "mockup") return <Smartphone className={className} aria-hidden />;
  if (type === "problem-solution") return <Columns2 className={className} aria-hidden />;
  if (type === "process") {
    return processLayout === "flow" ? (
      <GitCommitHorizontal className={className} aria-hidden />
    ) : (
      <Layers className={className} aria-hidden />
    );
  }
  if (type === "embed") return <Code2 className={className} aria-hidden />;
  if (type === "cta") return <ExternalLink className={className} aria-hidden />;
  return <AlignLeft className={className} aria-hidden />;
}

const ADDABLE_SECTION_TYPES: SectionType[] = ["text", "image", "video", "mockup", "problem-solution", "process", "embed", "cta"];

function newSectionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createSection(type: SectionType): Section {
  const id = newSectionId();
  if (type === "text") return { id, type, visibility: "always", title: "", summary: "", body: "" };
  if (type === "image") return { id, type, visibility: "always", src: "", caption: "", href: "", linkLabel: "" };
  if (type === "video") return { id, type, visibility: "always", src: "", caption: "", title: "", href: "", linkLabel: "" };
  if (type === "embed") return { id, type, visibility: "always", src: "", title: "", caption: "", height: 500 };
  if (type === "cta") return { id, type, visibility: "always", title: "", href: "", linkLabel: "Click here to try the product →" };
  if (type === "process")
    return {
      id,
      type,
      visibility: "always",
      title: "Process",
      summary: "",
      steps: [
        { title: "Discover", body: "" },
        { title: "Define", body: "" },
        { title: "Develop", body: "" },
        { title: "Deliver", body: "" },
      ],
    };
  if (type === "mockup") return { id, type, visibility: "always", title: "", caption: "", screens: [], device: "phone", layout: "single", background: "" };
  return { id, type, visibility: "always", problem: "", solution: "" };
}

function sectionDisplayName(sec: Section): string {
  const raw = sec.title || (sec.type === "problem-solution" ? sec.problem : "") || (sec.type === "cta" ? (sec.linkLabel || sec.href) : "") || sec.caption || "";
  const s = stripRichText(raw).trim().replace(/\s+/g, " ");
  return s.length > 48 ? `${s.slice(0, 47)}…` : s;
}

function AddSectionChips({
  onPick,
  onPickFlow,
  onCancel,
}: {
  onPick: (t: SectionType) => void;
  onPickFlow?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ADDABLE_SECTION_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-none border border-[color:var(--adm-line-strong)] text-[13px] text-[color:var(--adm-text)] hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors"
        >
          <Plus className="h-3 w-3 opacity-60" aria-hidden />
          <SectionTypeIcon type={t} className="h-3.5 w-3.5 stroke-[1.75] text-[color:var(--adm-muted)]" />
          {SECTION_TYPE_LABEL[t]}
        </button>
      ))}
      {onPickFlow && (
        <button
          type="button"
          onClick={onPickFlow}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-none border border-[color:var(--adm-line-strong)] text-[13px] text-[color:var(--adm-text)] hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors"
        >
          <Plus className="h-3 w-3 opacity-60" aria-hidden />
          <SectionTypeIcon type="process" processLayout="flow" className="h-3.5 w-3.5 stroke-[1.75] text-[color:var(--adm-muted)]" />
          User Flow (box → arrow)
        </button>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="h-8 px-2 text-[13px] text-[color:var(--adm-faint)] hover:text-[color:var(--adm-text)]">
          Cancel
        </button>
      )}
    </div>
  );
}

function SectionInsertRow({
  onPick,
  onPickFlow,
}: {
  onPick: (t: SectionType) => void;
  onPickFlow?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="rounded-lg border border-dashed border-[color:var(--adm-accent)]/40 bg-[color:var(--adm-accent)]/5 p-3">
        <AddSectionChips
          onPick={(t) => {
            setOpen(false);
            onPick(t);
          }}
          onPickFlow={
            onPickFlow
              ? () => {
                  setOpen(false);
                  onPickFlow();
                }
              : undefined
          }
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group w-full flex items-center gap-2 py-1 text-xs text-[color:var(--adm-faint)] hover:text-[color:var(--adm-accent)] transition-colors"
    >
      <span className="flex-1 h-px bg-[color:var(--adm-line)] group-hover:bg-[color:var(--adm-accent)]/40" />
      <Plus className="h-3.5 w-3.5" aria-hidden />
      Add section here
      <span className="flex-1 h-px bg-[color:var(--adm-line)] group-hover:bg-[color:var(--adm-accent)]/40" />
    </button>
  );
}

const iconBtn =
  "inline-flex items-center justify-center h-7 w-7 rounded-md text-[color:var(--adm-faint)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)] transition-colors disabled:opacity-30 disabled:pointer-events-none";

/** Converts "01 · Title — body" style bullets into process steps. */
function bulletsToSteps(bullets: string[]): ProcessStep[] {
  return bullets.map((b) => {
    const clean = b.replace(/^\s*\d+\s*[·.)\-:]\s*/, "");
    const m = clean.match(/^(.+?)\s+[—–-]\s+(.+)$/s);
    return m ? { title: m[1].trim(), body: m[2].trim() } : { title: clean.trim(), body: "" };
  });
}

function SectionsEditor({
  sections,
  onChange,
}: {
  sections: Section[];
  onChange: (s: Section[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const insertSection = (type: SectionType, at: number) => {
    const next = [...sections];
    next.splice(at, 0, createSection(type));
    onChange(next);
  };

  const insertFlowSection = (at: number) => {
    const next = [...sections];
    next.splice(at, 0, {
      ...createSection("process"),
      title: "User Flow",
      processLayout: "flow",
    });
    onChange(next);
  };

  const update = (idx: number, patch: Partial<Section>) => {
    onChange(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const remove = (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    const name = sectionDisplayName(sec);
    if (!window.confirm(`Delete S${idx + 1} · ${SECTION_TYPE_LABEL[sec.type]}${name ? `: ${name}` : ""}?`)) return;
    onChange(sections.filter((_, i) => i !== idx));
  };

  const duplicate = (idx: number) => {
    const sec = sections[idx];
    if (!sec) return;
    const copy: Section = JSON.parse(JSON.stringify(sec));
    copy.id = newSectionId();
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const arr = [...sections];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    onChange(arr);
  };

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = sections.length > 0 && sections.every((s) => collapsed.has(s.id));
  const detailCount = sections.filter((s) => s.visibility === "detail").length;

  return (
    <div className="flex flex-col gap-4">
      <EditorBox
        code="S+"
        title="Add a section"
        hint={`New sections go to the top. Drag the ⋮⋮ handle to reorder, or use “Add section here” between cards.${
          detailCount > 0 ? ` ${detailCount} section(s) only show after See more.` : ""
        }`}
        actions={
          sections.length > 0 ? (
            <button
              type="button"
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(sections.map((s) => s.id)))}
              className="h-7 px-2 rounded-md text-xs text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)]"
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          ) : undefined
        }
      >
        <AddSectionChips onPick={(t) => insertSection(t, 0)} onPickFlow={() => insertFlowSection(0)} />
      </EditorBox>

      {sections.length === 0 && (
        <p className="text-[color:var(--adm-faint)] text-sm italic">
          No sections yet. Add one above, or use Upload JSON / TXT.
        </p>
      )}

      <AdminSortableList
        items={sections}
        onReorder={onChange}
        renderItem={(sec, idx, dragHandle) => {
          const name = sectionDisplayName(sec);
          const isCollapsed = collapsed.has(sec.id);
          return (
            <div className="pb-1">
              {idx > 0 && <SectionInsertRow onPick={(t) => insertSection(t, idx)} onPickFlow={() => insertFlowSection(idx)} />}
              <EditorBox
                code={`S${idx + 1}`}
                leading={dragHandle}
                title={
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="inline-flex items-center justify-center h-5 w-5 rounded border border-[color:var(--adm-line-strong)] bg-[color:var(--adm-subtle)] text-[color:var(--adm-muted)] shrink-0"
                      title={SECTION_TYPE_LABEL[sec.type]}
                    >
                      <SectionTypeIcon type={sec.type} processLayout={sec.processLayout} />
                    </span>
                    <span className="shrink-0">
                      {sec.type === "process" && sec.processLayout === "flow"
                        ? "User Flow"
                        : SECTION_TYPE_LABEL[sec.type]}
                    </span>
                    {name && (
                      <span className="font-normal text-[color:var(--adm-muted)] truncate">
                        · {name}
                      </span>
                    )}
                    {sec.visibility === "detail" && (
                      <span className="ml-1 shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[color:var(--adm-subtle)] text-[color:var(--adm-muted)]">
                        See more
                      </span>
                    )}
                  </span>
                }
                actions={
                  <>
                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className={iconBtn} title="Move up" aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className={iconBtn} title="Move down" aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => duplicate(idx)} className={iconBtn} title="Duplicate" aria-label="Duplicate section">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(idx)} className={`${iconBtn} hover:!text-red-600`} title="Delete" aria-label="Delete section">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(sec.id)}
                      className={iconBtn}
                      title={isCollapsed ? "Expand" : "Collapse"}
                      aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </>
                }
              >
              {!isCollapsed && (
              <>
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
              <div className="border-t border-[color:var(--adm-line)] pt-3 flex flex-col gap-3">
                <p className="text-[color:var(--adm-muted)] text-[10px] uppercase tracking-widest">
                  Expanded copy (optional: swaps in when See more is on)
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
                  usage="section-image"
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
              <MediaWidthPicker value={sec.columns} onChange={(v) => update(idx, { columns: v })} />
              <CheckboxInput
                label="Transparent background"
                checked={!!sec.transparent}
                onChange={(v) => update(idx, { transparent: v })}
              />
              <p className="text-[color:var(--adm-faint)] text-xs -mt-1">
                For PNG, WebP or GIF files with see-through areas: removes the card behind the image.
              </p>
              {sec.src && (
                <div className="mt-1 self-start" style={sec.transparent ? CHECKERBOARD : undefined}>
                  <SafeImage
                    src={sec.src}
                    alt=""
                    className={`h-24 ${sec.transparent ? "object-contain" : "object-cover opacity-60"}`}
                  />
                </div>
              )}
            </>
          )}

          {sec.type === "video" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput label="Video URL (.mp4 / .webm, or YouTube / Vimeo link)" value={sec.src ?? ""} onChange={(v) => update(idx, { src: v })} />
              <div className="flex items-center gap-2 flex-wrap">
                <SectionImageUploader
                  accept="video/mp4,video/webm,.mp4,.webm"
                  label="↑ Upload video"
                  usage="section-video"
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
              <MediaWidthPicker value={sec.columns} onChange={(v) => update(idx, { columns: v })} />
              <CheckboxInput
                label="Loop (autoplay muted, like a GIF)"
                checked={!!sec.loop}
                onChange={(v) => update(idx, { loop: v })}
              />
              <CheckboxInput
                label="Transparent background"
                checked={!!sec.transparent}
                onChange={(v) => update(idx, { transparent: v })}
              />
              <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-1">
                MP4 can’t store transparency: export a <span className="text-[color:var(--adm-muted)]">WebM (VP9 with alpha)</span> for
                see-through video. Safari may show WebM transparency as a solid background.
              </p>
              {sec.src && (
                parseVideoEmbed(sec.src) ? (
                  <div className="mt-1 p-3 bg-[color:var(--adm-subtle)] border border-[color:var(--adm-line-strong)] text-xs text-[color:var(--adm-text)] flex items-center gap-2">
                    <span className="font-medium text-[color:var(--adm-accent)]">▶ {embedProviderLabel(parseVideoEmbed(sec.src)!)} Video</span>
                    <span className="text-[color:var(--adm-muted)]">:  plays via responsive player on the case study</span>
                  </div>
                ) : (
                  <video
                    src={sec.src}
                    muted
                    playsInline
                    loop={!!sec.loop}
                    autoPlay={!!sec.loop}
                    className={`h-24 mt-1 w-full ${sec.transparent ? "object-contain" : "object-cover opacity-60 bg-[color:var(--adm-input)]"}`}
                    style={sec.transparent ? CHECKERBOARD : undefined}
                  />
                )
              )}
              <p className="text-[color:var(--adm-faint)] text-xs">
                {sec.loop
                  ? "Loops silently on the case study; visitors can click to pause."
                  : "Plays with controls on the case study (no autoplay) so the page stays stable."}
              </p>
            </>
          )}

          {sec.type === "problem-solution" && (
            <>
              <TextInput label="Title (optional)" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextareaInput label="Problem" value={sec.problem ?? ""} onChange={(v) => update(idx, { problem: v })} rows={3} />
              <TextareaInput label="Solution" value={sec.solution ?? ""} onChange={(v) => update(idx, { solution: v })} rows={3} />
              <div className="border-t border-[color:var(--adm-line)] pt-3 flex flex-col gap-3">
                <p className="text-[color:var(--adm-muted)] text-[10px] uppercase tracking-widest">
                  Expanded copy (optional: swaps in when See more is on)
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
                label="Embed URL or iframe code (Vimeo, YouTube, PubHTML5)"
                value={sec.src ?? ""}
                placeholder="e.g. https://player.vimeo.com/video/875454327 or <iframe...>"
                onChange={(v) => update(idx, { src: v })}
              />
              <TextInput
                label="Height (px, optional for video)"
                value={String(sec.height ?? 500)}
                onChange={(v) => {
                  const n = parseInt(v, 10);
                  update(idx, { height: Number.isFinite(n) && n > 0 ? n : 500 });
                }}
              />
              <TextInput label="Caption (optional)" value={sec.caption ?? ""} onChange={(v) => update(idx, { caption: v })} />
              <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
                Vimeo (URL or embed code), YouTube, or PubHTML5 viewer embeds.
              </p>
            </>
          )}

          {sec.type === "process" && (
            <>
              <TextInput label="Section Title" value={sec.title ?? ""} onChange={(v) => update(idx, { title: v })} />
              <TextInput label="Summary line (optional)" value={sec.summary ?? ""} onChange={(v) => update(idx, { summary: v })} />
              <TextareaInput label="Intro text (optional)" value={sec.body ?? ""} onChange={(v) => update(idx, { body: v })} rows={3} />
              <ProcessStepsEditor
                steps={sec.steps ?? []}
                layout={sec.processLayout ?? "stack"}
                onLayoutChange={(processLayout) => update(idx, { processLayout })}
                onChange={(steps) => update(idx, { steps })}
              />
            </>
          )}

          {sec.type === "text" && (sec.bullets?.length ?? 0) > 1 && (
            <button
              type="button"
              onClick={() =>
                update(idx, { type: "process", steps: bulletsToSteps(sec.bullets ?? []), bullets: undefined })
              }
              className="w-max text-xs text-[color:var(--adm-accent)] hover:underline"
              title="Turns each bullet into a step card. Use “01 · Title: description” bullets for best results."
            >
              Convert bullets to Process step cards →
            </button>
          )}

          {sec.type === "mockup" && (
            <>
              <MockupSectionEditor section={sec} onChange={(patch) => update(idx, patch)} />
              <MediaLinkFields
                href={sec.href}
                linkLabel={sec.linkLabel}
                onChange={(patch) => update(idx, patch)}
              />
            </>
          )}

          {sec.type === "cta" && (
            <>
              <TextInput
                label="Section Title (optional)"
                value={sec.title ?? ""}
                onChange={(v) => update(idx, { title: v })}
              />
              <TextInput
                label="Button Link URL"
                value={sec.href ?? ""}
                placeholder="https://..."
                onChange={(v) => update(idx, { href: v })}
              />
              <TextInput
                label="Button Text / Label"
                value={sec.linkLabel ?? ""}
                placeholder="Click here to try the product →"
                onChange={(v) => update(idx, { linkLabel: v })}
              />
              <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-1">
                Renders a standalone square call-to-action button placed on the right.
              </p>
              {sec.href && (
                <div className="flex justify-end pt-2">
                  <a
                    href={sec.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[color:var(--adm-line-strong)] bg-[color:var(--adm-subtle)] text-[color:var(--adm-text)] px-5 py-2.5 text-xs uppercase tracking-widest font-medium rounded-none hover:border-[color:var(--adm-accent)]"
                  >
                    {(sec.linkLabel?.trim() || "Click here to try the product").replace(/\s*[→↗›»]+\s*$/, "")} ↗
                  </a>
                </div>
              )}
            </>
          )}

              </>
              )}
              </EditorBox>
            </div>
          );
        }}
      />

      {sections.length > 0 && <SectionInsertRow onPick={(t) => insertSection(t, sections.length)} onPickFlow={() => insertFlowSection(sections.length)} />}
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
        ? `Filled from brief (local): ${result.patch.sections?.length ?? 0} sections. Review, add images, then Save.`
        : "Filled hero and Overview / Problem / Solution / Impact from brief. Review, then Save.",
    );
  };

  return (
    <EditorBox
      code="D1"
      title="Fill from brief"
      actions={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="h-7 px-2 rounded-md text-xs text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)]"
        >
          {open ? "Hide" : "Show"}
        </button>
      }
    >
      {open && (
        <>
          <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
            Paste a labeled brief. Runs in your browser only: no API key, no network call.
            Use lines like <span className="text-[color:var(--adm-muted)]">Title:</span>,{" "}
            <span className="text-[color:var(--adm-muted)]">Role:</span>,{" "}
            <span className="text-[color:var(--adm-muted)]">Problem:</span>,{" "}
            <span className="text-[color:var(--adm-muted)]">Solution:</span>,{" "}
            <span className="text-[color:var(--adm-muted)]">Impact:</span>.
          </p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            placeholder={`Title: Habiganize\nRole: Product Designer\nUsers: People who quit habit apps in a week\nMethods: Retention research, Figma system, IA\nProblem: Habit apps lose users because quitting costs nothing.\nSolution: Pair check-ins with a pet-care economy.\nImpact: Live multi-platform product; store release next.\nTags: Product Design, UX, Gamification`}
            className="bg-transparent border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] p-3 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors placeholder:text-[color:var(--adm-placeholder)] resize-y min-h-[140px]"
          />
          <label className="flex items-center gap-2 text-sm text-[color:var(--adm-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={includeSections}
              onChange={(e) => setIncludeSections(e.target.checked)}
              className="accent-[color:var(--adm-accent)]"
            />
            Also build narrative sections from the brief
          </label>
          <button
            type="button"
            onClick={fillFromBrief}
            className="self-start text-sm border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-2 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors uppercase tracking-widest"
          >
            Fill case study
          </button>
          {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
          {hint && <p className="text-[color:var(--adm-muted)] text-xs leading-relaxed">{hint}</p>}
        </>
      )}
    </EditorBox>
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
  const coverEmbed = parseVideoEmbed(project?.coverImage);

  return (
    <div className="flex gap-5 h-full">
      <div className="w-52 flex-shrink-0 flex flex-col gap-2 self-start sticky top-[80px]">
        <div className="flex items-center gap-2 mb-1">
          <BoxCode code="P" />
          <span className="text-sm font-semibold text-[color:var(--adm-text)]">Projects</span>
        </div>
        <button
          onClick={addProject}
          className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-medium bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] hover:bg-[color:var(--adm-accent-hover)] transition-colors mb-1"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add project
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
                    ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
                    : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`tabular-nums text-[9px] px-1.5 py-0.5 rounded ${
                    active ? "bg-[color:var(--adm-input)]/20" : "bg-[color:var(--adm-subtle)] text-[color:var(--adm-faint)]"
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
                className={`flex-1 min-w-0 text-left text-sm px-2.5 py-2 rounded-md truncate transition-colors ${
                  p.id === selectedProjectId
                    ? "bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-accent)] font-medium"
                    : "text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)]"
                }`}
              >
                {p.title}
                {p.featured ? " ★" : ""}
                {p.protected && (
                  <Lock className="inline w-3 h-3 ml-1.5 -mt-0.5" aria-label="Password protected" />
                )}
                {p.archived && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest opacity-70">
                    (archived)
                  </span>
                )}
                {(p.locked || p.deferred) && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest opacity-70">
                    (loading…)
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
            <div className="inline-flex p-0.5 rounded-lg bg-[color:var(--adm-subtle)] border border-[color:var(--adm-line)]">
              {(["details", "sections"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSubTab(t)}
                  className={`h-8 px-3 rounded-md text-sm transition-colors ${
                    subTab === t
                      ? "bg-[color:var(--adm-surface)] text-[color:var(--adm-text)] font-medium shadow-sm"
                      : "text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]"
                  }`}
                >
                  {t === "details" ? "Details · D1–D11" : `Sections · ${project.sections?.length ?? 0}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center h-8 px-3 rounded-md text-sm text-[color:var(--adm-text)] border border-[color:var(--adm-line-strong)] cursor-pointer hover:bg-[color:var(--adm-subtle)] transition-colors">
                Upload JSON / TXT
                <input
                  type="file"
                  accept=".json,application/json,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={() => {
                  if (window.confirm(`Delete project “${project.title}”? This only takes effect after Save to site.`)) {
                    removeProject(selectedIdx);
                  }
                }}
                className="inline-flex items-center gap-1.5 h-8 px-2 rounded-md text-sm text-[color:var(--adm-faint)] hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete project
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
              <EditorBox code="D2" title="Title & URL">
                <TextInput label="Title" value={project.title} onChange={(v) => updateProject(selectedIdx, { title: v })} />
                <TextInput
                  label="Short title (card display)"
                  value={project.shortTitle ?? ""}
                  onChange={(v) => updateProject(selectedIdx, { shortTitle: v })}
                  placeholder={project.title.split(/[:-]/)[0].trim()}
                  hint="Displayed on homepage & project cards (e.g. Habiganize). Defaults to first word of Title if empty."
                />
                <TextInput
                  label="Slug (URL path)"
                  value={project.slug}
                  onChange={(v) => updateProject(selectedIdx, { slug: v })}
                  hint="Used in the URL: /work/your-slug"
                />
              </EditorBox>

              <EditorBox code="D3" title="Case study hero">
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
                  placeholder="Optional: shown on Work cards only"
                />
              </EditorBox>

              <EditorBox
                code="D4"
                title="Metadata strip (Role · Users · Methods)"
                hint="These fields appear under the title on the case study page."
              >
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
              </EditorBox>

              <EditorBox
                code="D5"
                title="Cover image / video"
                hint="Hero media at the top of the case study and on Work cards. Upload an image or video, or paste a YouTube / Vimeo / Instagram link. Videos play muted on cards; the case study adds play/pause, sound, and a full-screen player."
              >
                <input
                  type="text"
                  value={project.coverImage}
                  onChange={(e) =>
                    updateProject(selectedIdx, { coverImage: e.target.value, coverMime: undefined })
                  }
                  placeholder="Paste URL (jpg, png, mp4, webm) or a YouTube / Vimeo / Instagram link"
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors placeholder:text-[color:var(--adm-placeholder)]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload file: image / gif / mp4 / webm"
                    usage="project-cover"
                    accept="image/*,video/mp4,video/webm,.gif,.mp4,.webm"
                    onUploaded={(url, meta) =>
                      updateProject(selectedIdx, { coverImage: url, coverMime: meta?.mime || undefined })
                    }
                  />
                  <PickFromLibraryButton
                    onPick={(url, meta) =>
                      updateProject(selectedIdx, { coverImage: url, coverMime: meta?.mime || undefined })
                    }
                  />
                </div>
                {project.coverImage && (
                  <div className="rounded overflow-hidden border border-[color:var(--adm-line-strong)]" style={{ maxHeight: "130px" }}>
                    <CoverMedia
                      src={project.coverImage}
                      alt="cover preview"
                      mimeHint={project.coverMime}
                      poster={project.coverPoster}
                      className="w-full object-cover"
                      style={coverEmbed ? { height: "130px" } : { maxHeight: "130px" }}
                    />
                  </div>
                )}
                {coverEmbed && (
                  <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
                    {coverEmbed.provider === "instagram"
                      ? "Instagram link: Instagram can't autoplay inside a cover, so cards and the case study show the poster below with a play button that opens the Instagram player. Add a poster image."
                      : coverEmbed.provider === "youtube"
                        ? "YouTube link: plays muted and looping as the cover. The YouTube thumbnail is used as the poster unless you set one."
                        : "Vimeo link: plays muted and looping as the cover. Add a poster so the card isn't blank while Vimeo loads. Vimeo may still show its player controls unless the video's account is on a paid Vimeo plan."}
                  </p>
                )}
                {(isVideo(project.coverImage, project.coverMime) || coverEmbed) && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[color:var(--adm-line)]">
                    <div className={`flex flex-col gap-2 ${coverEmbed?.provider === "instagram" ? "hidden" : ""}`}>
                      <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">
                        Video on Work / Home cards
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {(
                          [
                            { value: "loop" as const, label: "Always loop" },
                            { value: "hover" as const, label: "Play on hover" },
                          ] as const
                        ).map(({ value, label }) => {
                          const active = (project.coverPlayback ?? "loop") === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updateProject(selectedIdx, {
                                  coverPlayback: value === "loop" ? undefined : value,
                                })
                              }
                              className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                                active
                                  ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
                                  : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
                        Play on hover shows the poster (or first frame) until a visitor hovers the card. On phones it plays when the card scrolls into view. Ignored when a separate hover video is set in D7.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">
                        Poster image (optional)
                      </span>
                      <input
                        type="text"
                        value={project.coverPoster ?? ""}
                        onChange={(e) => updateProject(selectedIdx, { coverPoster: e.target.value || undefined })}
                        placeholder="Still frame shown before the video loads and on the password screen"
                        className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors placeholder:text-[color:var(--adm-placeholder)]"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <UploadToLibraryDashed
                          label="↑ Upload poster"
                          usage="project-cover"
                          accept="image/*"
                          onUploaded={(url) => updateProject(selectedIdx, { coverPoster: url })}
                        />
                        <PickFromLibraryButton
                          type="image"
                          onPick={(url) => updateProject(selectedIdx, { coverPoster: url })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </EditorBox>

              <EditorBox code="D6" title="Card layout (Work / Home grid)">
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
                            ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
                            : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed">
                  Vertical = one 4:5 card. Horizontal = the width of two cards plus the gap between them, same height.
                </p>
              </EditorBox>

              <EditorBox
                code="D7"
                title="Hover video & live link"
                hint="Hover video: short muted loop that plays after a long hover on Work/Home cards. Leave empty to keep the static cover."
              >
                <input
                  type="text"
                  value={project.hoverVideo ?? ""}
                  onChange={(e) => updateProject(selectedIdx, { hoverVideo: e.target.value })}
                  placeholder="Paste mp4/webm URL"
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors placeholder:text-[color:var(--adm-placeholder)]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload hover video"
                    usage="hover-video"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    onUploaded={(url) => updateProject(selectedIdx, { hoverVideo: url })}
                  />
                  <PickFromLibraryButton
                    type="video"
                    onPick={(url) => updateProject(selectedIdx, { hoverVideo: url })}
                  />
                </div>
                <TextInput
                  label="Live product URL"
                  value={project.liveUrl ?? ""}
                  onChange={(v) => updateProject(selectedIdx, { liveUrl: v })}
                  hint="Powers the floating VIEW LIVE badge on the case study page."
                  placeholder="https://…"
                />
              </EditorBox>

              <EditorBox
                code="D8"
                title="Logo (Studio marquee)"
                hint="Square mark for the looping logo strip at the bottom of the Work page. Leave blank to skip this project."
              >
                <input
                  type="text"
                  value={project.logo ?? ""}
                  onChange={(e) => updateProject(selectedIdx, { logo: e.target.value })}
                  placeholder="Paste logo URL"
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors placeholder:text-[color:var(--adm-placeholder)]"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <UploadToLibraryDashed
                    label="↑ Upload logo"
                    usage="logo"
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
              </EditorBox>

              <EditorBox code="D9" title="Tags">
                <TagsInput
                  label="Tags"
                  tags={project.tags ?? []}
                  suggestions={tagSuggestions}
                  onChange={(tags) => updateProject(selectedIdx, { tags })}
                />
              </EditorBox>

              <EditorBox
                code="D10"
                title="Case study body (Overview · Problem · Solution · Impact)"
                hint="These blocks render above your custom sections on the case study page. Empty fields are hidden."
              >
                <TextareaInput
                  label="Overview"
                  value={project.description}
                  onChange={(v) => updateProject(selectedIdx, { description: v })}
                  hint="Main project summary: the Overview section under the cover."
                  rows={4}
                />
                <TextareaInput
                  label="Problem"
                  value={project.challenge}
                  onChange={(v) => updateProject(selectedIdx, { challenge: v })}
                  hint="Left card under Overview: the challenge you tackled."
                  rows={3}
                />
                <TextareaInput
                  label="Solution"
                  value={project.solution}
                  onChange={(v) => updateProject(selectedIdx, { solution: v })}
                  hint="Right card under Overview: your approach."
                  rows={3}
                />
                <TextareaInput
                  label="Impact"
                  value={project.impact}
                  onChange={(v) => updateProject(selectedIdx, { impact: v })}
                  hint="Results / outcomes block below Problem & Solution."
                  rows={3}
                />
              </EditorBox>

              <EditorBox code="D11" title="Visibility">
                <CheckboxInput label="★ Show on homepage Selected Work" checked={project.featured} onChange={(v) => updateProject(selectedIdx, { featured: v })} />
                <CheckboxInput
                  label="Archive (hide from public site)"
                  checked={Boolean(project.archived)}
                  onChange={(v) => updateProject(selectedIdx, { archived: v })}
                />
                <CheckboxInput
                  label="Password protect this case study"
                  checked={Boolean(project.protected)}
                  onChange={(v) => updateProject(selectedIdx, { protected: v })}
                />
                {project.protected && (
                  <CaseStudyPasswordFields
                    key={project.id}
                    password={project.password}
                    onChange={(password) => updateProject(selectedIdx, { password })}
                  />
                )}
              </EditorBox>
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
