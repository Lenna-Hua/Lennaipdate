/**
 * Shared UI primitives used across admin panel editor components.
 */
import { useState, type ReactNode } from "react";
import type { AssetType } from "./types";

// ── Utility helpers ────────────────────────────────────────────────────

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assetTypeOf(mime: string): "image" | "gif" | "video" | "other" {
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

export function resolveAssetUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:)/i.test(url)) return url;
  return import.meta.env.BASE_URL + url.replace(/^\/+/, "");
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export function extForMime(mime: string): string {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "video/mp4") return "mp4";
  if (normalized === "video/webm") return "webm";
  if (normalized === "video/ogg") return "ogv";
  if (normalized === "video/quicktime") return "mov";
  const slash = normalized.indexOf("/");
  if (slash > -1 && slash < normalized.length - 1) {
    return normalized.slice(slash + 1).replace(/[^a-z0-9]+/g, "");
  }
  return "bin";
}

// ── Layout components ──────────────────────────────────────────────────

export function BoxCode({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-accent)] text-[11px] font-bold tracking-wide">
      {code}
    </span>
  );
}

/** Named editing card: the code (e.g. "D2") lets you call a box out by name. */
export function EditorBox({
  code,
  title,
  hint,
  actions,
  leading,
  children,
  className = "",
}: {
  code: string;
  title: ReactNode;
  hint?: string;
  actions?: ReactNode;
  leading?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={`box-${code.toLowerCase()}`}
      data-box={code}
      className={`bg-[color:var(--adm-surface)] border border-[color:var(--adm-line)] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-[color:var(--adm-line)]">
        {leading}
        <BoxCode code={code} />
        <h3 className="flex-1 min-w-0 truncate text-sm font-semibold text-[color:var(--adm-text)]">{title}</h3>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </header>
      {(hint || children) && (
        <div className="p-4 flex flex-col gap-4">
          {hint && <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mb-1">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

// ── Input components ───────────────────────────────────────────────────

export function TextInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Small helper under the label — where this field appears on the site. */
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
      {hint && (
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">{hint}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] focus:ring-2 focus:ring-[color:var(--adm-accent)]/15 transition-colors placeholder:text-[color:var(--adm-placeholder)]"
      />
    </div>
  );
}

export function TextareaInput({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
      {hint && (
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">{hint}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-2 px-3 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] focus:ring-2 focus:ring-[color:var(--adm-accent)]/15 transition-colors resize-y placeholder:text-[color:var(--adm-placeholder)]"
      />
    </div>
  );
}

export function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[color:var(--adm-accent)]"
      />
      <span className="text-[color:var(--adm-text)] text-sm">{label}</span>
    </label>
  );
}

export function TagsInput({
  label,
  tags,
  suggestions,
  onChange,
}: {
  label: string;
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const commit = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (tags.includes(v)) {
      setInput("");
      return;
    }
    onChange([...tags, v]);
    setInput("");
  };
  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i));
  const trimmed = input.trim().toLowerCase();
  const matching = suggestions
    .filter((s) => !tags.includes(s))
    .filter((s) => (trimmed ? s.toLowerCase().includes(trimmed) : true))
    .slice(0, 8);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
      <div className="flex flex-wrap gap-2 border-b border-[color:var(--adm-line-strong)] py-2 focus-within:border-[color:var(--adm-accent)] transition-colors relative">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-1.5 bg-[color:var(--adm-subtle)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] text-xs px-2 py-1 rounded"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-[color:var(--adm-muted)] hover:text-red-400 leading-none text-base"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              remove(tags.length - 1);
            }
          }}
          placeholder={tags.length ? "" : "Type a tag and press Enter…"}
          className="flex-1 min-w-[140px] bg-transparent text-[color:var(--adm-text)] text-sm focus:outline-none"
        />
        {focused && matching.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded shadow-lg max-h-56 overflow-y-auto">
            {matching.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-[color:var(--adm-text)] hover:bg-[color:var(--adm-subtle)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
