/**
 * Shared UI primitives used across admin panel editor components.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  RemoveFormatting,
  Type,
} from "lucide-react";
import { hasRichTextFormatting, renderRichText, stripRichText } from "@/lib/rich-text";

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

// ── Rich Text Formatting Helpers & Toolbar ─────────────────────────────

function shouldEnableToolbarForInput(label: string, placeholder?: string): boolean {
  const combined = `${label} ${placeholder ?? ""}`.toLowerCase();
  if (
    /\b(url|slug|password|height|speed|seconds|email|href|iframe|hex)\b/.test(combined) ||
    /^https?:\/\//.test(placeholder ?? "")
  ) {
    return false;
  }
  return true;
}

function toggleWrapSelection(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
  openTag: string,
  closeTag: string,
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const hasSelection = end > start;
  const selected = hasSelection ? value.slice(start, end) : value;

  if (!hasSelection && !value) {
    const next = `${openTag}text${closeTag}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(openTag.length, openTag.length + 4);
    });
    return;
  }

  if (!hasSelection) {
    // Wrap or unwrap the entire field when nothing is highlighted
    if (value.startsWith(openTag) && value.endsWith(closeTag)) {
      const unwrapped = value.slice(openTag.length, value.length - closeTag.length);
      onChange(unwrapped);
      requestAnimationFrame(() => el.focus());
    } else {
      const wrapped = `${openTag}${value}${closeTag}`;
      onChange(wrapped);
      requestAnimationFrame(() => el.focus());
    }
    return;
  }

  // Check if already wrapped inside or around selection
  if (selected.startsWith(openTag) && selected.endsWith(closeTag)) {
    const inner = selected.slice(openTag.length, selected.length - closeTag.length);
    const next = value.slice(0, start) + inner + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + inner.length);
    });
    return;
  }

  const before = value.slice(Math.max(0, start - openTag.length), start);
  const after = value.slice(end, end + closeTag.length);
  if (before === openTag && after === closeTag) {
    const next =
      value.slice(0, start - openTag.length) +
      selected +
      value.slice(end + closeTag.length);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start - openTag.length, end - openTag.length);
    });
    return;
  }

  // If applying a size or color tag, strip existing outer size/color tag on selection first
  const cleanedSelected = /^<(sm|lg|xl)>/.test(openTag)
    ? selected.replace(/^<(sm|lg|xl)>([\s\S]*?)<\/\1>$/, "$2")
    : /^<color=#[0-9a-fA-F]{3,8}>$/.test(openTag)
      ? selected.replace(/^<color=#[0-9a-fA-F]{3,8}>([\s\S]*?)<\/color>$/, "$1")
      : selected;

  const replacement = `${openTag}${cleanedSelected}${closeTag}`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + openTag.length, start + openTag.length + cleanedSelected.length);
  });
}

function insertLinkFormatting(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
) {
  if (!el) return;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = end > start ? value.slice(start, end) : "link text";
  const url = window.prompt("Enter link URL (https://... or /path):", "https://");
  if (!url || !url.trim()) return;
  const snippet = `[${selected}](${url.trim()})`;
  const next = value.slice(0, start) + snippet + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + 1, start + 1 + selected.length);
  });
}

function toggleListFormatting(
  el: HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
  kind: "bullet" | "number",
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? value.length;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextNewline = value.indexOf("\n", end);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allMatch =
    kind === "bullet"
      ? lines.every((l) => /^\s*•\s+/.test(l))
      : lines.every((l) => /^\s*\d+\.\s+/.test(l));

  const transformed = lines.map((line, idx) => {
    const stripped = line.replace(/^\s*(?:•|\d+\.)\s+/, "");
    if (allMatch) return stripped;
    return kind === "bullet" ? `• ${stripped}` : `${idx + 1}. ${stripped}`;
  });

  const replacement = transformed.join("\n");
  const next = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(lineStart, lineStart + replacement.length);
  });
}

function clearFormattingSelection(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const cleanChunk = (s: string) =>
    stripRichText(s)
      .split("\n")
      .map((line) => line.replace(/^\s*(?:•|\d+\.)\s+/, ""))
      .join("\n");

  if (end > start) {
    const cleaned = cleanChunk(value.slice(start, end));
    onChange(value.slice(0, start) + cleaned + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + cleaned.length);
    });
  } else {
    onChange(cleanChunk(value));
    requestAnimationFrame(() => el.focus());
  }
}

const fmtBtnClass =
  "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded text-[11px] font-medium text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)] transition-colors cursor-pointer select-none";

function TextFormattingBar({
  inputRef,
  value,
  onChange,
  multiline = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      onMouseDown={preventFocusLoss}
      className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border border-t-0 border-[color:var(--adm-line-strong)] bg-[color:var(--adm-surface)] rounded-b-md"
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "**", "**")}
        className={fmtBtnClass}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <Bold className="h-3.5 w-3.5 stroke-[2.2]" />
      </button>
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "*", "*")}
        className={fmtBtnClass}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <Italic className="h-3.5 w-3.5 stroke-[2]" />
      </button>
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "<u>", "</u>")}
        className={fmtBtnClass}
        title="Underline (Ctrl+U)"
        aria-label="Underline"
      >
        <Underline className="h-3.5 w-3.5 stroke-[2]" />
      </button>

      <span className="mx-1 h-3.5 w-px bg-[color:var(--adm-line)]" aria-hidden />

      <span
        className="inline-flex items-center gap-0.5 text-[10px] text-[color:var(--adm-faint)] px-1"
        title="Text size adjustment"
      >
        <Type className="h-3 w-3" aria-hidden />
      </span>
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "<sm>", "</sm>")}
        className={fmtBtnClass}
        title="Small text (<sm>)"
        aria-label="Small text"
      >
        S
      </button>
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "<lg>", "</lg>")}
        className={fmtBtnClass}
        title="Large text (<lg>)"
        aria-label="Large text"
      >
        L
      </button>
      <button
        type="button"
        onClick={() => toggleWrapSelection(inputRef.current, value, onChange, "<xl>", "</xl>")}
        className={fmtBtnClass}
        title="Extra large text (<xl>)"
        aria-label="Extra large text"
      >
        XL
      </button>

      <span className="mx-1 h-3.5 w-px bg-[color:var(--adm-line)]" aria-hidden />

      <label
        className={`${fmtBtnClass} gap-1 relative`}
        title="Adjust text color"
        aria-label="Adjust text color"
      >
        <span className="font-serif font-bold text-[11px] leading-none border-b-2 border-[#E85D4A]">
          A
        </span>
        <input
          type="color"
          defaultValue="#E85D4A"
          onChange={(e) =>
            toggleWrapSelection(
              inputRef.current,
              value,
              onChange,
              `<color=${e.target.value}>`,
              "</color>",
            )
          }
          className="sr-only"
        />
      </label>
      {[
        { hex: "#E85D4A", label: "Coral" },
        { hex: "#5E9BFF", label: "Blue" },
      ].map((sw) => (
        <button
          key={sw.hex}
          type="button"
          onClick={() =>
            toggleWrapSelection(inputRef.current, value, onChange, `<color=${sw.hex}>`, "</color>")
          }
          title={`Text color: ${sw.label} (${sw.hex})`}
          aria-label={`Set text color ${sw.label}`}
          className="inline-flex items-center justify-center h-4 w-4 rounded-sm border border-black/20 hover:scale-110 transition-transform mx-0.5 cursor-pointer"
          style={{ backgroundColor: sw.hex }}
        />
      ))}

      <span className="mx-1 h-3.5 w-px bg-[color:var(--adm-line)]" aria-hidden />

      <button
        type="button"
        onClick={() => insertLinkFormatting(inputRef.current, value, onChange)}
        className={fmtBtnClass}
        title="Insert link"
        aria-label="Insert link"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>

      {multiline && (
        <>
          <button
            type="button"
            onClick={() =>
              toggleListFormatting(inputRef.current as HTMLTextAreaElement | null, value, onChange, "number")
            }
            className={fmtBtnClass}
            title="Numbered list"
            aria-label="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              toggleListFormatting(inputRef.current as HTMLTextAreaElement | null, value, onChange, "bullet")
            }
            className={fmtBtnClass}
            title="Bulleted list"
            aria-label="Bulleted list"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => clearFormattingSelection(inputRef.current, value, onChange)}
        className={`${fmtBtnClass} ml-auto`}
        title="Clear formatting"
        aria-label="Clear formatting"
      >
        <RemoveFormatting className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function handleRichTextKeyDown(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  onChange: (v: string) => void,
) {
  if (!(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === "b") {
    e.preventDefault();
    toggleWrapSelection(el, value, onChange, "**", "**");
  } else if (key === "i") {
    e.preventDefault();
    toggleWrapSelection(el, value, onChange, "*", "*");
  } else if (key === "u") {
    e.preventDefault();
    toggleWrapSelection(el, value, onChange, "<u>", "</u>");
  }
}

// ── Input components ───────────────────────────────────────────────────

export function TextInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
  toolbar,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Small helper under the label showing where this field appears on the site. */
  hint?: string;
  placeholder?: string;
  /** Show rich-text formatting toolbar (auto-detected if omitted). */
  toolbar?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const showToolbar =
    (toolbar ?? shouldEnableToolbarForInput(label, placeholder)) &&
    (focused || hasRichTextFormatting(value));

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
      {hint && (
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">{hint}</p>
      )}
      <div className="flex flex-col">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => handleRichTextKeyDown(e, inputRef.current, value, onChange)}
          placeholder={placeholder}
          className={`bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] ${
            showToolbar ? "rounded-t-md" : "rounded-md"
          } text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] focus:ring-2 focus:ring-[color:var(--adm-accent)]/15 transition-colors placeholder:text-[color:var(--adm-placeholder)]`}
        />
        {showToolbar && (
          <TextFormattingBar
            inputRef={inputRef}
            value={value}
            onChange={onChange}
            multiline={false}
          />
        )}
      </div>
      {hasRichTextFormatting(value) && (
        <div className="text-xs text-[color:var(--adm-text)] bg-[color:var(--adm-subtle)] border border-[color:var(--adm-line)] rounded px-2.5 py-1.5 leading-relaxed">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--adm-faint)] mr-2">
            Preview:
          </span>
          {renderRichText(value)}
        </div>
      )}
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
  toolbar = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
  toolbar?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
      {hint && (
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">{hint}</p>
      )}
      <div className="flex flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => handleRichTextKeyDown(e, textareaRef.current, value, onChange)}
          rows={rows}
          placeholder={placeholder}
          className={`bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] ${
            toolbar ? "rounded-t-md" : "rounded-md"
          } text-[color:var(--adm-text)] py-2 px-3 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] focus:ring-2 focus:ring-[color:var(--adm-accent)]/15 transition-colors resize-y placeholder:text-[color:var(--adm-placeholder)]`}
        />
        {toolbar && (
          <TextFormattingBar
            inputRef={textareaRef}
            value={value}
            onChange={onChange}
            multiline={true}
          />
        )}
      </div>
      {hasRichTextFormatting(value) && (
        <div className="text-xs text-[color:var(--adm-text)] bg-[color:var(--adm-subtle)] border border-[color:var(--adm-line)] rounded px-2.5 py-1.5 leading-relaxed whitespace-pre-line">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--adm-faint)] block mb-0.5">
            Formatted Preview
          </span>
          {renderRichText(value)}
        </div>
      )}
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
