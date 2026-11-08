/**
 * Site-wide typefaces. Changing these restyles every public page after Save to Site.
 */
import { useEffect } from "react";
import type { Appearance, AppearancePreset, DisplayTuning } from "./types";
import { CheckboxInput, TextInput } from "./shared";
import {
  DEFAULT_DISPLAY_TUNING,
  FONT_PRESETS,
  appearanceFromPreset,
  rebuildCustomFamilies,
  resolveDisplayTuning,
  syncGoogleFontLinks,
} from "@/lib/fonts";

const WEIGHTS = [
  { value: 300, label: "300 · Light" },
  { value: 400, label: "400 · Regular" },
  { value: 500, label: "500 · Medium" },
  { value: 600, label: "600 · Semibold" },
  { value: 700, label: "700 · Bold" },
  { value: 800, label: "800 · Extra bold" },
  { value: 900, label: "900 · Black" },
];

function RangeRow({
  label,
  hint,
  value,
  placeholder,
  min,
  max,
  step,
  format,
  onChange,
  onReset,
}: {
  label: string;
  hint?: string;
  /** `null` = Auto; the slider rests on `placeholder`. */
  value: number | null;
  placeholder?: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  onReset?: () => void;
}) {
  const shown = value ?? placeholder ?? min;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-[color:var(--adm-text)] text-[13px] font-medium">{label}</label>
        <span className="flex items-baseline gap-3 text-xs tabular-nums">
          <span className={value === null ? "text-[color:var(--adm-faint)]" : "text-[color:var(--adm-text)]"}>
            {value === null ? "Auto" : format(value)}
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-accent)] underline underline-offset-2"
            >
              Reset
            </button>
          )}
        </span>
      </div>
      {hint && (
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">{hint}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full accent-[color:var(--adm-accent)] ${value === null ? "opacity-50" : ""}`}
      />
    </div>
  );
}

export function AppearanceEditor({
  data,
  onChange,
}: {
  data: Appearance;
  onChange: (next: Appearance) => void;
}) {
  const familiesKey = (data.googleFamilies ?? []).join("|");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncGoogleFontLinks(data.googleFamilies, "admin-preview");
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familiesKey]);

  useEffect(() => () => syncGoogleFontLinks([], "admin-preview"), []);

  const previewFont = (name: string, fallback: string) =>
    name.trim() ? `'${name.trim()}', ${fallback}` : undefined;

  const tuning = resolveDisplayTuning(data);
  const setTuning = (next: DisplayTuning) => onChange({ ...data, display: next });

  const applyPreset = (id: AppearancePreset) => {
    if (id === "custom") {
      onChange({ ...data, preset: "custom" });
      return;
    }
    onChange({ ...data, ...appearanceFromPreset(id) });
  };

  const setCustomField = (
    key: "displayFont" | "sansFont" | "serifFont",
    value: string,
  ) => {
    const next = { ...data, preset: "custom" as const, [key]: value };
    onChange({
      ...next,
      googleFamilies: rebuildCustomFamilies(
        next.displayFont,
        next.sansFont,
        next.serifFont,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Fonts & look</h2>
        <p className="text-[color:var(--adm-muted)] text-sm mt-1">
          These three families drive the whole portfolio: headlines (`font-display`),
          body (`font-sans`), and serif accents (`font-serif`). Pick a preset, or
          type any Google Fonts family names and Save to Site.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <label className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">Presets</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONT_PRESETS.map((preset) => {
            const active = data.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`text-left border px-4 py-3 transition-colors ${
                  active
                    ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10"
                    : "border-[color:var(--adm-line)] hover:border-[color:var(--adm-accent)]"
                }`}
              >
                <span className="block text-[color:var(--adm-text)] text-sm">{preset.label}</span>
                <span className="block text-[color:var(--adm-muted)] text-xs mt-1 leading-relaxed">
                  {preset.note}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 border border-[color:var(--adm-line)] p-4">
        <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Typefaces</h3>
        <TextInput
          label="Display / headlines"
          value={data.displayFont}
          onChange={(v) => setCustomField("displayFont", v)}
          hint="Big titles: Studio, Work, case-study names. Use the exact Google Fonts name."
        />
        <TextInput
          label="Sans / body"
          value={data.sansFont}
          onChange={(v) => setCustomField("sansFont", v)}
          hint="Paragraphs, nav, buttons, captions."
        />
        <TextInput
          label="Serif / accents"
          value={data.serifFont}
          onChange={(v) => setCustomField("serifFont", v)}
          hint="Folder titles, quotes, admin headings."
        />
        <div className="border-t border-[color:var(--adm-line)] pt-3 flex items-center justify-between text-xs text-[color:var(--adm-muted)]">
          <span>Project Card Titles:</span>
          <span className="text-[color:var(--adm-accent)] font-mono text-[11px]">
            Styled under Pages → Home → Project Cards Styling & Sizing
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-5 border border-[color:var(--adm-line)] p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">
            Headline fit
          </h3>
          <button
            type="button"
            onClick={() => setTuning({ ...DEFAULT_DISPLAY_TUNING })}
            className="text-xs text-[color:var(--adm-muted)] hover:text-[color:var(--adm-accent)] underline underline-offset-2"
          >
            Reset all
          </button>
        </div>
        <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-3">
          Headlines were tuned for a tall, narrow font. Wider fonts can overflow or have lines
          crash into each other: loosen them here. Applies to every headline on the site.
        </p>
        <RangeRow
          label="Size"
          value={tuning.scale}
          min={0.6}
          max={1.4}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setTuning({ ...tuning, scale: v })}
          onReset={tuning.scale === 1 ? undefined : () => setTuning({ ...tuning, scale: 1 })}
        />
        <RangeRow
          label="Line height"
          hint="Raise this if stacked lines overlap."
          value={tuning.lineHeight}
          placeholder={0.9}
          min={0.75}
          max={1.6}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(v) => setTuning({ ...tuning, lineHeight: v })}
          onReset={
            tuning.lineHeight === null ? undefined : () => setTuning({ ...tuning, lineHeight: null })
          }
        />
        <RangeRow
          label="Letter spacing"
          hint="Raise this if letters touch or overlap."
          value={tuning.letterSpacing}
          placeholder={-0.025}
          min={-0.08}
          max={0.2}
          step={0.005}
          format={(v) => `${v.toFixed(3)}em`}
          onChange={(v) => setTuning({ ...tuning, letterSpacing: v })}
          onReset={
            tuning.letterSpacing === null
              ? undefined
              : () => setTuning({ ...tuning, letterSpacing: null })
          }
        />
        <div className="flex flex-col gap-1">
          <label className="text-[color:var(--adm-text)] text-[13px] font-medium">Weight</label>
          <p className="text-[color:var(--adm-faint)] text-xs leading-relaxed -mt-0.5 mb-0.5">
            Fonts that only ship one weight look smeared at Black: pick 400 for those.
          </p>
          <select
            value={tuning.weight ?? ""}
            onChange={(e) =>
              setTuning({ ...tuning, weight: e.target.value ? Number(e.target.value) : null })
            }
            className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] w-60"
          >
            <option value="">Auto (as designed)</option>
            {WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <CheckboxInput
          label="ALL CAPS headlines"
          checked={tuning.uppercase}
          onChange={(v) => setTuning({ ...tuning, uppercase: v })}
        />
      </section>

      <section className="flex flex-col gap-4 border-t border-[color:var(--adm-line)] pt-6">
        <div>
          <h3 className="text-[color:var(--adm-text)] text-sm font-semibold uppercase tracking-wider">
            Left Sidebar Background
          </h3>
          <p className="text-[color:var(--adm-faint)] text-xs mt-1">
            Customize the sidebar background color for light and dark modes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[color:var(--adm-text)] text-xs font-medium">Light mode background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.sidebarBg || "#f3f0e2"}
                onChange={(e) => onChange({ ...data, sidebarBg: e.target.value })}
                className="w-9 h-9 p-0.5 rounded border border-[color:var(--adm-line-strong)] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={data.sidebarBg || "#f3f0e2"}
                onChange={(e) => onChange({ ...data, sidebarBg: e.target.value })}
                className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded px-3 py-1.5 text-xs text-[color:var(--adm-text)] font-mono w-28"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[color:var(--adm-text)] text-xs font-medium">Dark mode background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.sidebarBgDark || "#151513"}
                onChange={(e) => onChange({ ...data, sidebarBgDark: e.target.value })}
                className="w-9 h-9 p-0.5 rounded border border-[color:var(--adm-line-strong)] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={data.sidebarBgDark || "#151513"}
                onChange={(e) => onChange({ ...data, sidebarBgDark: e.target.value })}
                className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded px-3 py-1.5 text-xs text-[color:var(--adm-text)] font-mono w-28"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[11px] text-[color:var(--adm-faint)]">Presets:</span>
          {[
            { name: "Warm Linen (Figma)", light: "#f3f0e2", dark: "#151513" },
            { name: "Crisp Chalk", light: "#ffffff", dark: "#18181b" },
            { name: "Pale Sand", light: "#efebe4", dark: "#1c1b18" },
            { name: "Soft Taupe", light: "#e8e3d8", dark: "#141414" },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({ ...data, sidebarBg: preset.light, sidebarBgDark: preset.dark })}
              className="px-2.5 py-1 text-xs border border-[color:var(--adm-line-strong)] rounded text-[color:var(--adm-text)] hover:border-[color:var(--adm-accent)] transition-colors flex items-center gap-1.5"
            >
              <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: preset.light }} />
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-[color:var(--adm-line)] pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="text-[color:var(--adm-text)] text-sm font-semibold uppercase tracking-wider">
              Work Page Title Colors (“Selected Works”)
            </h3>
            <p className="text-[color:var(--adm-faint)] text-xs mt-1">
              Adjust the two-line hero heading colors on the /work page.
            </p>
          </div>
          {(data.workTitleLine1Color || data.workTitleLine2Color) && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...data,
                  workTitleLine1Color: undefined,
                  workTitleLine2Color: undefined,
                })
              }
              className="text-xs text-[color:var(--adm-muted)] hover:text-[color:var(--adm-accent)] underline underline-offset-2"
            >
              Reset colors
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[color:var(--adm-text)] text-xs font-medium">
              Line 1 (“Selected”) color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.workTitleLine1Color || "#E85D4A"}
                onChange={(e) => onChange({ ...data, workTitleLine1Color: e.target.value })}
                aria-label="Selected heading color"
                className="w-9 h-9 p-0.5 rounded border border-[color:var(--adm-line-strong)] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={data.workTitleLine1Color || "#E85D4A"}
                onChange={(e) => onChange({ ...data, workTitleLine1Color: e.target.value })}
                className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded px-3 py-1.5 text-xs text-[color:var(--adm-text)] font-mono w-28"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[color:var(--adm-text)] text-xs font-medium">
              Line 2 (“Works”) color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.workTitleLine2Color || "#5E9BFF"}
                onChange={(e) => onChange({ ...data, workTitleLine2Color: e.target.value })}
                aria-label="Works heading color"
                className="w-9 h-9 p-0.5 rounded border border-[color:var(--adm-line-strong)] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={data.workTitleLine2Color || "#5E9BFF"}
                onChange={(e) => onChange({ ...data, workTitleLine2Color: e.target.value })}
                className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded px-3 py-1.5 text-xs text-[color:var(--adm-text)] font-mono w-28"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[11px] text-[color:var(--adm-faint)]">Presets:</span>
          {[
            { name: "Coral + Blue (Default)", c1: "#E85D4A", c2: "#5E9BFF" },
            { name: "Monochrome Ink", c1: "#141413", c2: "#141413" },
            { name: "Coral + Charcoal", c1: "#E85D4A", c2: "#1F1E1B" },
            { name: "Forest + Sand", c1: "#2E6F5E", c2: "#C87D32" },
            { name: "Violet + Cobalt", c1: "#7C4DFF", c2: "#2563EB" },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() =>
                onChange({
                  ...data,
                  workTitleLine1Color: preset.c1,
                  workTitleLine2Color: preset.c2,
                })
              }
              className="px-2.5 py-1 text-xs border border-[color:var(--adm-line-strong)] rounded text-[color:var(--adm-text)] hover:border-[color:var(--adm-accent)] transition-colors flex items-center gap-1.5"
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20"
                style={{ backgroundColor: preset.c1 }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 -ml-1"
                style={{ backgroundColor: preset.c2 }}
              />
              {preset.name}
            </button>
          ))}
        </div>

        <div className="border border-[color:var(--adm-line)] bg-[color:var(--adm-input)] px-4 py-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--adm-faint)]">
            Preview:
          </span>
          <span className="font-display font-black uppercase text-2xl leading-none tracking-tight">
            <span style={{ color: data.workTitleLine1Color || "#E85D4A" }}>Selected</span>{" "}
            <span style={{ color: data.workTitleLine2Color || "#5E9BFF" }}>Works</span>
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[color:var(--adm-faint)] text-[11px] font-sans leading-relaxed">
          Live preview (not saved until Save to Site):
        </p>
        <div className="border border-[color:var(--adm-line-strong)] p-4 flex flex-col gap-4 bg-[color:var(--adm-input)] overflow-hidden">
          <p
            className="font-display font-black uppercase leading-[0.88] tracking-tight text-5xl max-w-[12ch] text-[color:var(--adm-text)]"
            style={{
              fontFamily: previewFont(data.displayFont, "sans-serif"),
              zoom: tuning.scale,
              lineHeight: tuning.lineHeight ?? 0.88,
              letterSpacing: `${tuning.letterSpacing ?? -0.025}em`,
              fontWeight: tuning.weight ?? 900,
              textTransform: tuning.uppercase ? "uppercase" : "none",
            }}
          >
            Research before pixels
          </p>
          <p
            className="font-sans text-[color:var(--adm-text)]"
            style={{ fontFamily: previewFont(data.sansFont, "sans-serif") }}
          >
            Body sample: the quick brown fox jumps over the lazy dog.
          </p>
          <p
            className="font-serif italic text-xl text-[color:var(--adm-accent)]"
            style={{ fontFamily: previewFont(data.serifFont, "serif") }}
          >
            Serif sample: Lenna
          </p>
        </div>
      </section>
    </div>
  );
}
