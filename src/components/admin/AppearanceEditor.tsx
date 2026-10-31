/**
 * Site-wide typefaces. Changing these restyles every public page after Save to Site.
 */
import type { Appearance, AppearancePreset } from "./types";
import { TextInput } from "./shared";
import {
  FONT_PRESETS,
  appearanceFromPreset,
  rebuildCustomFamilies,
} from "@/lib/fonts";

export function AppearanceEditor({
  data,
  onChange,
}: {
  data: Appearance;
  onChange: (next: Appearance) => void;
}) {
  const applyPreset = (id: AppearancePreset) => {
    if (id === "custom") {
      onChange({ ...data, preset: "custom" });
      return;
    }
    onChange(appearanceFromPreset(id));
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
        <p className="text-[color:var(--adm-faint)] text-[11px] font-sans leading-relaxed">
          Live preview of the current trio:
        </p>
        <div className="border border-[color:var(--adm-line-strong)] p-4 flex flex-col gap-2 bg-[color:var(--adm-input)]">
          <p className="font-display font-black uppercase text-3xl text-[color:var(--adm-text)]">
            Display sample
          </p>
          <p className="font-sans text-[color:var(--adm-text)]">
            Body sample — the quick brown fox jumps over the lazy dog.
          </p>
          <p className="font-serif italic text-xl text-[color:var(--adm-accent)]">Serif sample — Lenna</p>
        </div>
      </section>
    </div>
  );
}
