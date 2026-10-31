/**
 * Mockup section fields — bulk-import screenshots, auto-pick a device frame
 * from each screen's shape, then choose a layout and tune each screen.
 */
import { useState } from "react";
import { MockupStage } from "@/components/DeviceMockup";
import {
  DEVICE_FRAMES,
  MOCKUP_BACKGROUNDS,
  MOCKUP_DEVICES,
  MOCKUP_LAYOUTS,
  defaultLayout,
  detectDevice,
  isMockupDevice,
  isMockupLayout,
  type MockupDevice,
  type MockupLayout,
  type ScreenMeta,
} from "@/lib/device-mockup";
import { guidelineSummary } from "@/lib/media-guidelines";
import type { Section } from "./types";
import { CheckboxInput, TextInput } from "./shared";
import {
  PickFromLibraryButton,
  readAssetDimensions,
  useAssetUpload,
} from "./AssetLibrary";
import { UploadCancelledError } from "./MediaPrepModal";

const chip = (active: boolean) =>
  `text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
    active
      ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
      : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
  }`;

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)]">
      <span className="w-14 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[color:var(--adm-accent)]"
      />
      <span className="w-10 text-right tabular-nums text-[color:var(--adm-text)]">
        {value}
        {suffix}
      </span>
    </label>
  );
}

export function MockupSectionEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
}) {
  const upload = useAssetUpload();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const screens = section.screens ?? [];
  const meta: ScreenMeta[] = screens.map((_, i) => section.screenMeta?.[i] ?? {});
  const device: MockupDevice = isMockupDevice(section.device) ? section.device : "phone";
  const layout: MockupLayout = isMockupLayout(section.layout) ? section.layout : "single";
  const spec = DEVICE_FRAMES[device];

  const setScreens = (nextScreens: string[], nextMeta: ScreenMeta[]) =>
    onChange({ screens: nextScreens, screenMeta: nextMeta });

  const patchMeta = (i: number, patch: Partial<ScreenMeta>) =>
    onChange({ screenMeta: meta.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  const importFiles = async (files: File[]) => {
    if (!upload || !files.length) return;
    setErr("");
    const added: string[] = [];
    const addedMeta: ScreenMeta[] = [];
    try {
      for (const [i, f] of files.entries()) {
        setBusy(`Uploading ${i + 1} / ${files.length}…`);
        let prepared = f;
        try {
          added.push(
            await upload(f, {
              usage: "mockup-screen",
              batch: { index: i, total: files.length },
              onPrepared: (p) => (prepared = p),
            }),
          );
        } catch (e) {
          if (e instanceof UploadCancelledError) continue;
          throw e;
        }
        const dims = await readAssetDimensions(prepared);
        addedMeta.push(dims ? { device: detectDevice(dims.width, dims.height) } : {});
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy("");
    }
    if (!added.length) return;
    const nextScreens = [...screens, ...added];
    const nextMeta = [...meta, ...addedMeta];
    const patch: Partial<Section> = { screens: nextScreens, screenMeta: nextMeta };
    if (!screens.length) {
      const detected = nextMeta.map((m) => m.device).filter(isMockupDevice);
      const first = detected[0] ?? device;
      patch.device = first;
      patch.layout = defaultLayout(first, nextScreens.length, detected);
    }
    onChange(patch);
  };

  const moveScreen = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= screens.length) return;
    const s = [...screens];
    const m = [...meta];
    [s[i], s[to]] = [s[to], s[i]];
    [m[i], m[to]] = [m[to], m[i]];
    setScreens(s, m);
    if (open === i) setOpen(to);
  };

  const removeScreen = (i: number) => {
    setScreens(screens.filter((_, j) => j !== i), meta.filter((_, j) => j !== i));
    setOpen(null);
  };

  return (
    <>
      <TextInput label="Title (optional)" value={section.title ?? ""} onChange={(v) => onChange({ title: v })} />

      <div className="flex flex-col gap-2">
        <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">Screens</span>
        {upload && (
          <label
            className={`flex flex-col items-center justify-center gap-1 px-3 py-5 border border-dashed rounded text-[11px] uppercase tracking-widest text-center ${
              busy ? "border-[color:var(--adm-line-strong)] text-[color:var(--adm-faint)] cursor-wait" : "border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)] text-[color:var(--adm-muted)] cursor-pointer"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (busy) return;
              void importFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")));
            }}
          >
            <span>{busy || "↑ Drop or pick screenshots (multiple)"}</span>
            <span className="normal-case tracking-normal text-[color:var(--adm-faint)]">
              {guidelineSummary("mockup-screen")}. Full-bleed UI only — no device in the image. Each screen's shape picks its frame; mix phone, tablet and
              desktop shots to get a device set. Full-page (long) screenshots scroll inside the device.
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              disabled={!!busy}
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                void importFiles(files);
              }}
            />
          </label>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <PickFromLibraryButton
            type="image"
            size="sm"
            label="Add from library"
            onPick={(url) => setScreens([...screens, url], [...meta, {}])}
          />
          {screens.length > 0 && (
            <button type="button" className={chip(false)} onClick={() => setScreens([], [])}>
              Clear all
            </button>
          )}
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}

        {screens.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {screens.map((s, i) => (
              <div
                key={`${s}-${i}`}
                className={`flex flex-col items-center gap-1 border p-1 ${open === i ? "border-[color:var(--adm-accent)]" : "border-[color:var(--adm-line)]"}`}
              >
                <button type="button" onClick={() => setOpen(open === i ? null : i)} title="Adjust this screen">
                  <img src={s} alt="" className="h-20 w-auto max-w-[120px] object-contain bg-[color:var(--adm-input)]" />
                </button>
                <span className="text-[9px] uppercase tracking-widest text-[color:var(--adm-faint)]">
                  {meta[i].device ? DEVICE_FRAMES[meta[i].device!].label : "auto"}
                </span>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => moveScreen(i, -1)} className="text-[color:var(--adm-faint)] hover:text-[color:var(--adm-text)]">←</button>
                  <button type="button" onClick={() => setOpen(open === i ? null : i)} className="text-[color:var(--adm-faint)] hover:text-[color:var(--adm-accent)]">⚙</button>
                  <button type="button" onClick={() => moveScreen(i, 1)} className="text-[color:var(--adm-faint)] hover:text-[color:var(--adm-text)]">→</button>
                  <button type="button" onClick={() => removeScreen(i)} className="text-[color:var(--adm-faint)] hover:text-red-400">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {open !== null && open < screens.length && (
          <div className="border border-[color:var(--adm-accent)]/40 bg-[color:var(--adm-surface)] p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--adm-accent)] text-[10px] uppercase tracking-widest">Screen {open + 1}</span>
              <button
                type="button"
                className="text-[10px] uppercase tracking-widest text-[color:var(--adm-faint)] hover:text-[color:var(--adm-text)]"
                onClick={() => patchMeta(open, { zoom: 100, y: 0, size: 100 })}
              >
                Reset
              </button>
            </div>
            <Slider label="Zoom" value={meta[open].zoom ?? 100} min={100} max={200} onChange={(v) => patchMeta(open, { zoom: v })} />
            <Slider label="Focus" value={meta[open].y ?? 0} min={0} max={100} onChange={(v) => patchMeta(open, { y: v })} />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)] w-14 shrink-0">Set as</span>
              {MOCKUP_DEVICES.map((d) => (
                <button key={d} type="button" className={chip(meta[open].device === d)} onClick={() => patchMeta(open, { device: d })}>
                  {DEVICE_FRAMES[d].label}
                </button>
              ))}
            </div>
            <Slider label="Size" value={meta[open].size ?? 100} min={50} max={150} onChange={(v) => patchMeta(open, { size: v })} />
            <p className="text-[color:var(--adm-faint)] text-[11px] leading-relaxed">
              Zoom and Focus crop the image inside the screen (Focus 0 = top). Interactive mockups ignore Focus on long
              screens and scroll them from the top. "Set as" and Size apply to the Device set layout — the first screen
              of each kind is the one shown.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest w-28 shrink-0">Layout</span>
        {MOCKUP_LAYOUTS.map((l) => (
          <button key={l.value} type="button" className={chip(layout === l.value)} onClick={() => onChange({ layout: l.value })}>
            {l.label}
          </button>
        ))}
      </div>

      {layout !== "set" ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest w-28 shrink-0">Device</span>
            {MOCKUP_DEVICES.map((d) => (
              <button key={d} type="button" className={chip(device === d)} onClick={() => onChange({ device: d })}>
                {DEVICE_FRAMES[d].label}
              </button>
            ))}
          </div>
          <p className="text-[color:var(--adm-faint)] text-xs -mt-1">
            Export screens at {spec.exportSize[0]} × {spec.exportSize[1]} px for a perfect fit.
          </p>
        </>
      ) : (
        <p className="text-[color:var(--adm-faint)] text-xs -mt-1">
          Device set shows one laptop/browser, one tablet and one phone. Tag screens with ⚙ → "Set as"; untagged screens
          fill the empty devices in order.
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest w-28 shrink-0">Background</span>
        {MOCKUP_BACKGROUNDS.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`${chip((section.background ?? "") === b.value)} inline-flex items-center gap-1`}
            onClick={() => onChange({ background: b.value })}
          >
            {b.value && <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/30" style={{ background: b.value }} />}
            {b.label}
          </button>
        ))}
        <input
          type="text"
          value={section.background ?? ""}
          placeholder="#hex"
          onChange={(e) => onChange({ background: e.target.value.trim() })}
          className="w-24 bg-transparent border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] text-xs px-2 py-1"
        />
      </div>
      {layout === "floating" && !section.background && (
        <p className="text-[color:var(--adm-faint)] text-xs -mt-1">Floating uses navy when no background is set.</p>
      )}

      <Slider
        label="Width"
        value={section.mockupWidth ?? 100}
        min={40}
        max={100}
        onChange={(v) => onChange({ mockupWidth: v })}
      />

      <CheckboxInput
        label="Interactive (prototype preview)"
        checked={!!section.interactive}
        onChange={(v) => onChange({ interactive: v })}
      />
      <p className="text-[color:var(--adm-faint)] text-xs -mt-1 leading-relaxed">
        Long screens scroll up and down inside the device like a website, clicking fades to the next screen, and the
        device tilts toward the cursor — like a Figma prototype. Off = click opens the full-size image.
      </p>

      <TextInput label="Caption (optional)" value={section.caption ?? ""} onChange={(v) => onChange({ caption: v })} />

      {screens.length > 0 && (
        <div className="border border-[color:var(--adm-line)] p-3 bg-[color:var(--adm-surface)]">
          <p className="text-[color:var(--adm-muted)] text-[10px] uppercase tracking-widest mb-2">Preview</p>
          <div className="max-w-[560px] mx-auto">
            <MockupStage
              device={device}
              layout={layout}
              screens={screens}
              meta={meta}
              background={section.background}
              width={section.mockupWidth}
              interactive={!!section.interactive}
            />
          </div>
        </div>
      )}
    </>
  );
}
