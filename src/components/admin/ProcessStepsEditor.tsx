import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { DEFAULT_STEP_COLORS, STEP_COLOR_SWATCHES } from "@/components/ProcessStack";
import type { ProcessLayout, ProcessStep } from "./types";
import { TextInput, TextareaInput } from "./shared";

const iconBtn =
  "inline-flex items-center justify-center h-7 w-7 rounded-none text-[color:var(--adm-faint)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)] transition-colors disabled:opacity-30 disabled:pointer-events-none";

export function ProcessLayoutToggle({
  value,
  onChange,
}: {
  value: ProcessLayout;
  onChange: (layout: ProcessLayout) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">
        Showcase Display Style
      </span>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "stack" as const, label: "Overlapping Card Stack (← →)" },
            { id: "flow" as const, label: "User Flow (Box ──► Box)" },
          ] as const
        ).map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors cursor-pointer ${
                active
                  ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)] font-medium"
                  : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProcessStepsEditor({
  steps,
  layout = "stack",
  onLayoutChange,
  onChange,
}: {
  steps: ProcessStep[];
  layout?: ProcessLayout;
  onLayoutChange?: (layout: ProcessLayout) => void;
  onChange: (steps: ProcessStep[]) => void;
}) {
  const update = (i: number, patch: Partial<ProcessStep>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[i], next[to]] = [next[to]!, next[i]!];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--adm-line)] pt-3">
      {onLayoutChange && <ProcessLayoutToggle value={layout} onChange={onLayoutChange} />}

      <p className="text-[color:var(--adm-muted)] text-[10px] uppercase tracking-widest">
        Steps · {steps.length} : {" "}
        {layout === "flow"
          ? "shown as square boxes connected by arrows (Box ──► Box)"
          : "shown as compact square cards that slide over each other with ← → arrows"}
      </p>

      {steps.map((step, i) => {
        const defaultHex = DEFAULT_STEP_COLORS[i % DEFAULT_STEP_COLORS.length]!;
        const currentColor =
          step.color && /^#[0-9a-fA-F]{6}$/.test(step.color.trim())
            ? step.color.trim()
            : defaultHex;

        return (
          <div
            key={i}
            className="flex flex-col gap-2.5 border border-[color:var(--adm-line-strong)] p-3 bg-[color:var(--adm-subtle)]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 border border-black/20"
                  style={{ backgroundColor: step.color?.trim() || defaultHex }}
                />
                <span className="text-xs font-medium text-[color:var(--adm-text)]">
                  Step {i + 1}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className={iconBtn}
                  aria-label="Move step up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  className={iconBtn}
                  aria-label="Move step down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(steps.filter((_, j) => j !== i))}
                  className={`${iconBtn} hover:!text-red-600`}
                  aria-label="Delete step"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <TextInput
              label="Step title"
              value={step.title}
              onChange={(v) => update(i, { title: v })}
            />
            <TextareaInput
              label="Step description"
              value={step.body ?? ""}
              onChange={(v) => update(i, { body: v })}
              rows={2}
            />

            {/* Card / Box Color Picker */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[color:var(--adm-muted)] text-[10px] uppercase tracking-widest">
                Card / Box Color
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => update(i, { color: e.target.value })}
                  aria-label={`Pick color for step ${i + 1}`}
                  className="h-7 w-9 cursor-pointer border border-[color:var(--adm-line-strong)] bg-transparent p-0"
                />
                <input
                  type="text"
                  value={step.color ?? ""}
                  onChange={(e) => update(i, { color: e.target.value || undefined })}
                  placeholder={defaultHex}
                  className="w-24 bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] px-2 py-1 text-xs font-mono text-[color:var(--adm-text)] focus:outline-none focus:border-[color:var(--adm-accent)]"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {STEP_COLOR_SWATCHES.map((sw) => {
                    const isSelected =
                      (step.color?.trim() || defaultHex).toLowerCase() === sw.hex.toLowerCase();
                    return (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() => update(i, { color: sw.hex })}
                        title={`${sw.label} (${sw.hex})`}
                        aria-label={`Set step ${i + 1} color to ${sw.label}`}
                        className={`h-5 w-5 border transition-transform cursor-pointer ${
                          isSelected
                            ? "border-[color:var(--adm-text)] scale-110 ring-1 ring-[color:var(--adm-accent)]"
                            : "border-black/20 hover:scale-105"
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    );
                  })}
                </div>
                {step.color && (
                  <button
                    type="button"
                    onClick={() => update(i, { color: undefined })}
                    className="text-[11px] text-[color:var(--adm-faint)] hover:text-[color:var(--adm-text)] underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          onChange([
            ...steps,
            {
              title: "",
              body: "",
              color: DEFAULT_STEP_COLORS[steps.length % DEFAULT_STEP_COLORS.length],
            },
          ])
        }
        className="inline-flex w-max items-center gap-1 h-8 px-3 border border-[color:var(--adm-line-strong)] text-[13px] text-[color:var(--adm-text)] hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add step
      </button>
    </div>
  );
}
