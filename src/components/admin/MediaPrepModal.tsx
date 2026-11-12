/**
 * MediaPrepModal — runs between picking a file and uploading it.
 * Still images: crop, rotate / flip, brightness / contrast / saturation, resize and re-encode.
 * Videos, GIFs and SVGs: dimension, duration and file-size checks only (no in-browser editing).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  assessMedia,
  formatAspect,
  formatSize,
  guidelineFor,
  type MediaCheck,
  type MediaUsage,
} from "@/lib/media-guidelines";
import { maxAssetBytesForFileType } from "@/lib/asset-limits";

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled.");
    this.name = "UploadCancelledError";
  }
}

export type MediaPrepOptions = {
  usage?: MediaUsage;
  /** Multi-file uploads: lets the user skip the editor for the rest of the batch. */
  batch?: { index: number; total: number };
  mode?: "upload" | "library";
  saveAsCopyLabel?: string;
  saveAndApplyLabel?: string;
  onSaveAsCopy?: (file: File) => Promise<void>;
  onSaveAndApply?: (file: File) => Promise<void>;
  onUseOriginal?: () => void;
};
export type MediaPrepFn = (file: File, opts?: MediaPrepOptions) => Promise<File | null>;

type PrepRequest = { id: number; file: File; opts: MediaPrepOptions; resolve: (f: File | null) => void };

/** Resolves with the file to upload (edited or original), or null when the user cancels. */
export function useMediaPrep(): { prepare: MediaPrepFn; modal: ReactNode } {
  const [req, setReq] = useState<PrepRequest | null>(null);
  const skipRest = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const nextId = useRef(0);

  const prepare = useCallback<MediaPrepFn>((file, opts = {}) => {
    if (!opts.batch || opts.batch.index === 0) skipRest.current = false;
    const run = () =>
      skipRest.current
        ? Promise.resolve<File | null>(file)
        : new Promise<File | null>((resolve) => setReq({ id: ++nextId.current, file, opts, resolve }));
    const result = queue.current.then(run, run);
    queue.current = result;
    return result;
  }, []);

  const modal = req ? (
    <MediaPrepModal
      key={req.id}
      file={req.file}
      opts={req.opts}
      onDone={(file, skipRemaining) => {
        if (skipRemaining) skipRest.current = true;
        req.resolve(file);
        setReq(null);
      }}
    />
  ) : null;

  return { prepare, modal };
}

// ── Helpers ────────────────────────────────────────────────────────────

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Adjust = { brightness: number; contrast: number; saturation: number };
type OutFormat = "image/jpeg" | "image/webp" | "image/png";
type Loaded = { url: string; width?: number; height?: number; duration?: number | null; img?: HTMLImageElement };

const EDITABLE = /^image\/(jpeg|png|webp|bmp|avif)$/;
const NO_ADJUST: Adjust = { brightness: 100, contrast: 100, saturation: 100 };
const MIN_CROP = 0.03;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
const ASPECT_PRESETS: [number, number][] = [[1, 1], [4, 5], [3, 4], [4, 3], [3, 2], [16, 9], [9, 16], [16, 7]];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function fitAspect(na: number | null): Rect {
  if (!na) return { x: 0, y: 0, w: 1, h: 1 };
  let w = 1;
  let h = 1 / na;
  if (h > 1) {
    h = 1;
    w = na;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Rect spanning `anchor` → `p`, locked to normalized aspect `na` and kept inside the image. */
function rectFrom(anchor: Pt, p: Pt, na: number | null): Rect {
  const dirX = p.x >= anchor.x ? 1 : -1;
  const dirY = p.y >= anchor.y ? 1 : -1;
  const maxW = dirX > 0 ? 1 - anchor.x : anchor.x;
  const maxH = dirY > 0 ? 1 - anchor.y : anchor.y;
  let w = Math.max(MIN_CROP, Math.abs(p.x - anchor.x));
  let h = Math.max(MIN_CROP, Math.abs(p.y - anchor.y));
  if (na) {
    if (w / h > na) h = w / na;
    else w = h * na;
    if (w > maxW) {
      w = maxW;
      h = w / na;
    }
    if (h > maxH) {
      h = maxH;
      w = h * na;
    }
  } else {
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
  }
  return { x: dirX > 0 ? anchor.x : anchor.x - w, y: dirY > 0 ? anchor.y : anchor.y - h, w, h };
}

function drawTransformed(
  img: HTMLImageElement,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
  scale: number,
  target?: HTMLCanvasElement,
): HTMLCanvasElement {
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  const swap = rotation % 180 !== 0;
  const c = target ?? document.createElement("canvas");
  c.width = Math.max(1, Math.round(swap ? sh : sw));
  c.height = Math.max(1, Math.round(swap ? sw : sh));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  return c;
}

function filterCss(a: Adjust): string {
  if (a.brightness === 100 && a.contrast === 100 && a.saturation === 100) return "none";
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
}

/** Pixel fallback matching CSS brightness → contrast → saturate, for browsers without ctx.filter. */
function applyAdjustPixels(ctx: CanvasRenderingContext2D, w: number, h: number, a: Adjust) {
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const b = a.brightness / 100;
  const c = a.contrast / 100;
  const s = a.saturation / 100;
  const off = 128 * (1 - c);
  const m = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const cl = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < d.length; i += 4) {
    const r = cl(cl(d[i]! * b) * c + off);
    const g = cl(cl(d[i + 1]! * b) * c + off);
    const bl = cl(cl(d[i + 2]! * b) * c + off);
    d[i] = m[0]! * r + m[1]! * g + m[2]! * bl;
    d[i + 1] = m[3]! * r + m[4]! * g + m[5]! * bl;
    d[i + 2] = m[6]! * r + m[7]! * g + m[8]! * bl;
  }
  ctx.putImageData(data, 0, 0);
}

function renamed(name: string, mime: string): string {
  const base = name.replace(/\.[a-z0-9]{1,8}$/i, "") || "image";
  return `${base}.${EXT[mime] ?? "png"}`;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}:${String(sec).padStart(2, "0")}` : `${s.toFixed(1)}s`;
}

// ── Modal ──────────────────────────────────────────────────────────────

export function MediaPrepModal({
  file,
  opts,
  onDone,
}: {
  file: File;
  opts: MediaPrepOptions;
  onDone: (file: File | null, skipRemaining?: boolean) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let live = true;
    const done = (l: Omit<Loaded, "url">) => live && setLoaded({ url, ...l });
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        done({ width: v.videoWidth, height: v.videoHeight, duration: Number.isFinite(v.duration) ? v.duration : null });
      v.onerror = () => done({});
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth || undefined, height: img.naturalHeight || undefined, img });
      img.onerror = () => done({});
      img.src = url;
    }
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const batch = opts.batch && opts.batch.total > 1 ? opts.batch : null;
  const remaining = batch ? batch.total - batch.index - 1 : 0;
  const isVideo = file.type.startsWith("video/");
  const canEdit = EDITABLE.test(file.type) && !!loaded?.img?.naturalWidth;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 md:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-6xl max-h-[94vh] flex flex-col bg-[color:var(--adm-surface)] border border-[color:var(--adm-line)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[color:var(--adm-line)]">
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-[color:var(--adm-text)]">
              {opts.mode === "library"
                ? "Edit library image"
                : canEdit
                ? "Edit before upload"
                : isVideo
                ? "Check video before upload"
                : "Check file before upload"}
            </h2>
            <p className="text-xs text-[color:var(--adm-muted)] truncate" title={file.name}>
              {file.name}
              {opts.mode === "library"
                ? " · Crop, adjust, and choose save option"
                : batch
                ? ` · ${batch.index + 1} of ${batch.total}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDone(null)}
            className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)] text-2xl leading-none"
            aria-label="Cancel upload"
          >
            ×
          </button>
        </div>

        {!loaded ? (
          <p className="p-6 text-sm text-[color:var(--adm-muted)]">Reading file…</p>
        ) : canEdit ? (
          <ImageEditor
            file={file}
            img={loaded.img!}
            usage={opts.usage}
            remaining={remaining}
            opts={opts}
            onDone={onDone}
          />
        ) : (
          <InfoOnly file={file} loaded={loaded} usage={opts.usage} remaining={remaining} onDone={onDone} />
        )}
      </div>
    </div>
  );
}

// ── Image editor ───────────────────────────────────────────────────────

function ImageEditor({
  file,
  img,
  usage,
  remaining,
  opts,
  onDone,
}: {
  file: File;
  img: HTMLImageElement;
  usage?: MediaUsage;
  remaining: number;
  opts?: MediaPrepOptions;
  onDone: (file: File | null, skipRemaining?: boolean) => void;
}) {
  const guide = guidelineFor(usage);
  const siteAspect = guide.aspect ? `${guide.aspect[0]}:${guide.aspect[1]}` : null;
  const recLong = guide.image ? Math.max(guide.image.width, guide.image.height) : 0;

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectKey, setAspectKey] = useState<string>(siteAspect ?? "free");
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [adj, setAdj] = useState<Adjust>(NO_ADJUST);
  const [maxEdge, setMaxEdge] = useState(() =>
    recLong && Math.max(img.naturalWidth, img.naturalHeight) > recLong * 1.25 ? recLong : 0,
  );
  const [format, setFormat] = useState<OutFormat>(() => {
    if (file.type === "image/webp") return "image/webp";
    if (file.type === "image/png") return guide.image?.format.includes("PNG") ? "image/png" : "image/webp";
    return "image/jpeg";
  });
  const [quality, setQuality] = useState(85);
  const [estimate, setEstimate] = useState<{ bytes: number; width: number; height: number; type: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<"copy" | "apply" | "upload" | null>(null);
  const [err, setErr] = useState("");

  const swap = rotation % 180 !== 0;
  const W = swap ? img.naturalHeight : img.naturalWidth;
  const H = swap ? img.naturalWidth : img.naturalHeight;

  const aspect = useMemo(() => {
    if (aspectKey === "free") return null;
    if (aspectKey === "original") return W / H;
    const [a, b] = aspectKey.split(":").map(Number);
    return a! / b!;
  }, [aspectKey, W, H]);
  const na = aspect ? (aspect * H) / W : null;

  useEffect(() => setCrop(fitAspect(na)), [na]);

  const base = useMemo(() => drawTransformed(img, rotation, flipH, flipV, 1), [img, rotation, flipH, flipV]);

  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!previewRef.current) return;
    const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    drawTransformed(img, rotation, flipH, flipV, scale, previewRef.current);
  }, [img, rotation, flipH, flipV]);

  const renderOutput = useCallback(async () => {
    const sx = Math.round(crop.x * W);
    const sy = Math.round(crop.y * H);
    const sw = Math.max(1, Math.round(crop.w * W));
    const sh = Math.max(1, Math.round(crop.h * H));
    const scale = maxEdge && Math.max(sw, sh) > maxEdge ? maxEdge / Math.max(sw, sh) : 1;
    const ow = Math.max(1, Math.round(sw * scale));
    const oh = Math.max(1, Math.round(sh * scale));
    const out = document.createElement("canvas");
    out.width = ow;
    out.height = oh;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ow, oh);
    }
    const filter = filterCss(adj);
    const nativeFilter = filter !== "none" && typeof (ctx as { filter?: unknown }).filter === "string";
    if (nativeFilter) ctx.filter = filter;
    ctx.drawImage(base, sx, sy, sw, sh, 0, 0, ow, oh);
    if (nativeFilter) ctx.filter = "none";
    if (filter !== "none" && !nativeFilter) applyAdjustPixels(ctx, ow, oh, adj);
    const blob = await new Promise<Blob | null>((res) =>
      out.toBlob(res, format, format === "image/png" ? undefined : quality / 100),
    );
    if (!blob) throw new Error("Couldn't encode the image in this browser.");
    return { blob, width: ow, height: oh };
  }, [base, crop, W, H, maxEdge, format, quality, adj]);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      renderOutput()
        .then((r) => live && setEstimate({ bytes: r.blob.size, width: r.width, height: r.height, type: r.blob.type }))
        .catch(() => live && setEstimate(null));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [renderOutput]);

  // ── Crop dragging ──
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: string; start: Pt; rect: Rect; moved: boolean } | null>(null);

  const pointAt = (e: ReactPointerEvent): Pt => {
    const r = stageRef.current!.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const handle = (e.target as HTMLElement).dataset.handle ?? "new";
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: handle, start: pointAt(e), rect: crop, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = pointAt(e);
    const r = d.rect;
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) < 0.004) return;
    d.moved = true;
    if (d.mode === "move") {
      setCrop({
        ...r,
        x: Math.min(1 - r.w, Math.max(0, r.x + p.x - d.start.x)),
        y: Math.min(1 - r.h, Math.max(0, r.y + p.y - d.start.y)),
      });
      return;
    }
    const anchors: Record<string, Pt> = {
      nw: { x: r.x + r.w, y: r.y + r.h },
      ne: { x: r.x, y: r.y + r.h },
      sw: { x: r.x + r.w, y: r.y },
      se: { x: r.x, y: r.y },
      new: d.start,
    };
    setCrop(rectFrom(anchors[d.mode] ?? d.start, p, na));
  };

  const endDrag = () => {
    drag.current = null;
  };

  const rotate = (dir: 1 | -1) => setRotation((r) => (r + dir * 90 + 360) % 360);
  const flip = (axis: "h" | "v") => {
    if (axis === "h") {
      setFlipH((f) => !f);
      setCrop((c) => ({ ...c, x: 1 - c.x - c.w }));
    } else {
      setFlipV((f) => !f);
      setCrop((c) => ({ ...c, y: 1 - c.y - c.h }));
    }
  };
  const resetAll = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAdj(NO_ADJUST);
    setAspectKey(siteAspect ?? "free");
    setCrop(fitAspect(guide.aspect ? (guide.aspect[0] / guide.aspect[1]) * (img.naturalHeight / img.naturalWidth) : null));
  };

  const handleSaveAsCopy = async () => {
    if (!opts?.onSaveAsCopy) return;
    setBusy(true);
    setBusyAction("copy");
    setErr("");
    try {
      const { blob } = await renderOutput();
      const dot = file.name.lastIndexOf(".");
      const base = dot > 0 ? file.name.slice(0, dot) : file.name;
      const copyName = `${base}-copy.${EXT[blob.type] ?? "png"}`;
      const outFile = new File([blob], copyName, { type: blob.type, lastModified: Date.now() });
      await opts.onSaveAsCopy(outFile);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save copy.");
      setBusy(false);
      setBusyAction(null);
    }
  };

  const handleSaveAndApply = async () => {
    if (!opts?.onSaveAndApply) return;
    setBusy(true);
    setBusyAction("apply");
    setErr("");
    try {
      const { blob } = await renderOutput();
      const outFile = new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: Date.now() });
      await opts.onSaveAndApply(outFile);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save and apply.");
      setBusy(false);
      setBusyAction(null);
    }
  };

  const apply = async () => {
    setBusyAction("upload");
    setBusy(true);
    setErr("");
    try {
      const { blob } = await renderOutput();
      onDone(new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: Date.now() }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't process the image.");
      setBusy(false);
      setBusyAction(null);
    }
  };

  const aspectOptions = useMemo(() => {
    const keys = ASPECT_PRESETS.map(([a, b]) => `${a}:${b}`);
    if (siteAspect && !keys.includes(siteAspect)) keys.unshift(siteAspect);
    return ["free", "original", ...keys];
  }, [siteAspect]);

  const sizeOptions = useMemo(
    () => [0, recLong, 3840, 2560, 1920, 1600, 1200, 800, 512].filter((n, i, a) => a.indexOf(n) === i),
    [recLong],
  );

  const outChecks = estimate
    ? assessMedia({ usage, mime: estimate.type, bytes: estimate.bytes, width: estimate.width, height: estimate.height })
    : [];
  const hardMax = maxAssetBytesForFileType(file.type);
  const outTooBig = !!estimate && estimate.bytes > hardMax;
  const cropPx = { w: Math.round(crop.w * W), h: Math.round(crop.h * H) };

  return (
    <>
      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_340px] overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col gap-3 p-4 min-h-0 lg:overflow-y-auto">
          <div className="flex items-center justify-center rounded-lg bg-[color:var(--adm-input)] p-3 min-h-[240px]">
            <div
              ref={stageRef}
              className="relative select-none touch-none overflow-hidden cursor-crosshair"
              style={{ width: `min(100%, calc(56vh * ${W / H}))`, aspectRatio: `${W} / ${H}` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <canvas ref={previewRef} className="block w-full h-full" style={{ filter: filterCss(adj) }} />
              <div
                data-handle="move"
                className="absolute border border-white cursor-move"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                }}
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-1/3 border-l border-white/40" />
                  <div className="absolute inset-y-0 left-2/3 border-l border-white/40" />
                  <div className="absolute inset-x-0 top-1/3 border-t border-white/40" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-white/40" />
                </div>
                {(["nw", "ne", "sw", "se"] as const).map((h) => (
                  <span
                    key={h}
                    data-handle={h}
                    className="absolute h-3.5 w-3.5 bg-white border border-black/40 rounded-sm"
                    style={{
                      [h.includes("n") ? "top" : "bottom"]: -7,
                      [h.includes("w") ? "left" : "right"]: -7,
                      cursor: h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
                    }}
                  />
                ))}
                <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {cropPx.w} × {cropPx.h}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[color:var(--adm-faint)]">
            Drag the box to move it, drag a corner to resize, or drag anywhere outside it to draw a new crop.
          </p>

          <Group title="Crop shape">
            <div className="flex flex-wrap gap-1.5">
              {aspectOptions.map((k) => (
                <button key={k} type="button" className={chip(aspectKey === k)} onClick={() => setAspectKey(k)}>
                  {k === "free" ? "Free" : k === "original" ? "Original" : k}
                  {k === siteAspect ? " · site" : ""}
                </button>
              ))}
            </div>
          </Group>

          <Group title="Rotate & flip">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className={chip(false)} onClick={() => rotate(-1)}>⟲ Rotate left</button>
              <button type="button" className={chip(false)} onClick={() => rotate(1)}>⟳ Rotate right</button>
              <button type="button" className={chip(flipH)} onClick={() => flip("h")}>⇋ Flip horizontal</button>
              <button type="button" className={chip(flipV)} onClick={() => flip("v")}>⇵ Flip vertical</button>
              <button type="button" className={chip(false)} onClick={resetAll}>Reset all</button>
            </div>
          </Group>
        </div>

        <aside className="flex flex-col gap-4 p-4 border-t lg:border-t-0 lg:border-l border-[color:var(--adm-line)] min-h-0 lg:overflow-y-auto">
          <Group title="Adjust">
            <Slider label="Brightness" value={adj.brightness} onChange={(v) => setAdj({ ...adj, brightness: v })} />
            <Slider label="Contrast" value={adj.contrast} onChange={(v) => setAdj({ ...adj, contrast: v })} />
            <Slider label="Saturation" value={adj.saturation} onChange={(v) => setAdj({ ...adj, saturation: v })} />
            {filterCss(adj) !== "none" && (
              <button type="button" className={chip(false) + " self-start"} onClick={() => setAdj(NO_ADJUST)}>
                Reset adjustments
              </button>
            )}
          </Group>

          <Group title="Output">
            <label className="flex items-center justify-between gap-2 text-xs text-[color:var(--adm-muted)]">
              Max size
              <select
                value={maxEdge}
                onChange={(e) => setMaxEdge(Number(e.target.value))}
                className="bg-[color:var(--adm-surface)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-2 py-1 text-xs"
              >
                {sizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Keep crop size" : n === recLong ? `Recommended · ${n} px` : `${n} px long edge`}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-[color:var(--adm-muted)]">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as OutFormat)}
                className="bg-[color:var(--adm-surface)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-2 py-1 text-xs"
              >
                <option value="image/jpeg">JPG: photos, smallest</option>
                <option value="image/webp">WebP: small, keeps transparency</option>
                <option value="image/png">PNG: lossless, large</option>
              </select>
            </label>
            {format !== "image/png" && (
              <Slider label="Quality" value={quality} min={40} max={100} reset={85} suffix="" onChange={setQuality} />
            )}
          </Group>

          <Group title="Dimensions & size">
            <InfoRow label="Original" value={`${img.naturalWidth} × ${img.naturalHeight} · ${formatAspect(img.naturalWidth, img.naturalHeight)} · ${formatSize(file.size)}`} />
            <InfoRow
              label="Will upload"
              value={
                estimate
                  ? `${estimate.width} × ${estimate.height} · ${formatAspect(estimate.width, estimate.height)} · ~${formatSize(estimate.bytes)}`
                  : "Calculating…"
              }
            />
            {file.size > hardMax && (
              <p className="text-[11px] text-red-400">
                The original is over the {formatSize(hardMax)} upload limit: use Apply & upload to shrink it.
              </p>
            )}
            {estimate && estimate.type !== format && (
              <p className="text-[11px] text-amber-500">This browser can't save {EXT[format]?.toUpperCase()}; it will upload as {EXT[estimate.type]?.toUpperCase() ?? estimate.type}.</p>
            )}
          </Group>

          <Recommendation usage={usage} kind="image" />
          <Checks checks={outChecks} />
        </aside>
      </div>

      <Footer>
        {err && <p className="text-xs text-red-400 mr-auto">{err}</p>}
        <button type="button" className={btn("ghost")} onClick={() => onDone(null)}>Cancel</button>
        {opts?.mode === "library" ? (
          <>
            {opts.onUseOriginal && (
              <button
                type="button"
                className={btn("ghost")}
                onClick={opts.onUseOriginal}
                disabled={busy}
              >
                Use original
              </button>
            )}
            <button
              type="button"
              className={btn("outline")}
              onClick={handleSaveAsCopy}
              disabled={busy || !estimate || outTooBig}
            >
              {busyAction === "copy"
                ? "Saving copy…"
                : (opts.saveAsCopyLabel ?? "Save as a copy and use it")}
            </button>
            <button
              type="button"
              className={btn("primary")}
              onClick={handleSaveAndApply}
              disabled={busy || !estimate || outTooBig}
            >
              {busyAction === "apply"
                ? "Saving & applying…"
                : (opts.saveAndApplyLabel ?? "Save and apply")}
            </button>
          </>
        ) : (
          <>
            {remaining > 0 && (
              <button
                type="button"
                className={btn("ghost")}
                onClick={() => onDone(file, true)}
                disabled={file.size > hardMax || busy}
              >
                Upload this & {remaining} more as-is
              </button>
            )}
            <button
              type="button"
              className={btn("outline")}
              onClick={() => onDone(file)}
              disabled={file.size > hardMax || busy}
              title={file.size > hardMax ? "Original is over the upload limit" : undefined}
            >
              Upload original
            </button>
            <button
              type="button"
              className={btn("primary")}
              onClick={apply}
              disabled={busy || !estimate || outTooBig}
            >
              {busy ? "Processing…" : "Apply & upload"}
            </button>
          </>
        )}
      </Footer>
    </>
  );
}

// ── Video / GIF / SVG info ─────────────────────────────────────────────

function InfoOnly({
  file,
  loaded,
  usage,
  remaining,
  opts,
  onDone,
}: {
  file: File;
  loaded: Loaded;
  usage?: MediaUsage;
  remaining: number;
  opts?: MediaPrepOptions;
  onDone: (file: File | null, skipRemaining?: boolean) => void;
}) {
  const isVideo = file.type.startsWith("video/");
  const { width, height, duration } = loaded;
  const checks = assessMedia({ usage, mime: file.type, bytes: file.size, width, height, duration });
  const tooBig = file.size > maxAssetBytesForFileType(file.type);
  const bitrate = isVideo && duration ? (file.size * 8) / duration / 1_000_000 : null;
  const spec = guidelineFor(usage).video;

  return (
    <>
      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_340px] overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col gap-3 p-4 min-h-0 lg:overflow-y-auto">
          <div className="flex items-center justify-center rounded-lg bg-[color:var(--adm-input)] p-3 min-h-[240px]">
            {isVideo ? (
              <video src={loaded.url} controls muted playsInline className="max-w-full max-h-[56vh]" />
            ) : loaded.img ? (
              <img src={loaded.url} alt="" className="max-w-full max-h-[56vh]" />
            ) : (
              <p className="text-sm text-[color:var(--adm-muted)]">This browser can't preview the file.</p>
            )}
          </div>
          {file.type === "image/gif" && (
            <p className="text-xs text-[color:var(--adm-muted)]">
              Animated GIFs can't be cropped here without losing the animation. A looping MP4 of the same clip is
              usually 5–10× smaller.
            </p>
          )}
          {file.type === "image/svg+xml" && (
            <p className="text-xs text-[color:var(--adm-muted)]">SVGs are vector: they stay sharp at any size, so no editing needed.</p>
          )}
          {isVideo && (
            <div className="text-xs text-[color:var(--adm-muted)] flex flex-col gap-1">
              <p>
                Videos can't be edited in the browser. To shrink or crop one, re-export it with HandBrake (H.264, RF
                24–28) or ffmpeg:
              </p>
              <code className="block rounded bg-[color:var(--adm-input)] px-2 py-1.5 text-[11px] text-[color:var(--adm-text)] break-all">
                ffmpeg -i input.mov -vf "scale={spec?.width ?? 1920}:-2" -c:v libx264 -crf 26 -preset slow -an -movflags +faststart output.mp4
              </code>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4 p-4 border-t lg:border-t-0 lg:border-l border-[color:var(--adm-line)] min-h-0 lg:overflow-y-auto">
          <Group title="Dimensions & size">
            <InfoRow label="Type" value={file.type || "unknown"} />
            <InfoRow
              label="Dimensions"
              value={width && height ? `${width} × ${height} · ${formatAspect(width, height)}` : "Unknown"}
            />
            {isVideo && <InfoRow label="Duration" value={duration ? formatDuration(duration) : "Unknown"} />}
            <InfoRow label="File size" value={formatSize(file.size)} />
            {bitrate != null && (
              <InfoRow
                label="Bitrate"
                value={bitrate >= 1 ? `${bitrate.toFixed(1)} Mbps` : `${Math.round(bitrate * 1000)} kbps`}
              />
            )}
          </Group>
          <Recommendation usage={usage} kind={isVideo ? "video" : "image"} />
          <Checks checks={checks} />
        </aside>
      </div>

      <Footer>
        <button type="button" className={btn("ghost")} onClick={() => onDone(null)}>Cancel</button>
        {remaining > 0 && (
          <button type="button" className={btn("ghost")} onClick={() => onDone(file, true)} disabled={tooBig}>
            Upload this & {remaining} more as-is
          </button>
        )}
        <button type="button" className={btn("primary")} onClick={() => onDone(file)} disabled={tooBig}>
          Upload
        </button>
      </Footer>
    </>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────

function Recommendation({ usage, kind }: { usage?: MediaUsage; kind: "image" | "video" }) {
  const g = guidelineFor(usage);
  const spec = kind === "video" ? g.video : g.image;
  return (
    <Group title={`Recommended · ${g.label}`}>
      {spec ? (
        <>
          <InfoRow label="Dimensions" value={`${spec.width} × ${spec.height} px${g.aspect ? ` (${g.aspect[0]}:${g.aspect[1]})` : ""}`} />
          <InfoRow label="File size" value={`under ${formatSize(spec.targetBytes)}`} />
          {"maxSeconds" in spec && <InfoRow label="Length" value={`${spec.maxSeconds}s or less`} />}
          <InfoRow label="Format" value={spec.format} />
        </>
      ) : (
        <p className="text-xs text-[color:var(--adm-muted)]">
          This spot is meant for {kind === "video" ? "images" : "videos"}.
        </p>
      )}
      {g.note && <p className="text-[11px] text-[color:var(--adm-faint)] leading-snug">{g.note}</p>}
    </Group>
  );
}

function Checks({ checks }: { checks: MediaCheck[] }) {
  if (!checks.length) return null;
  const color = { ok: "text-emerald-500", warn: "text-amber-500", error: "text-red-400" } as const;
  const icon = { ok: "✓", warn: "!", error: "✕" } as const;
  return (
    <ul className="flex flex-col gap-1.5">
      {checks.map((c, i) => (
        <li key={i} className={`flex gap-2 text-xs leading-snug ${color[c.level]}`}>
          <span className="font-semibold">{icon[c.level]}</span>
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] uppercase tracking-widest text-[color:var(--adm-faint)]">{title}</h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[color:var(--adm-muted)] shrink-0">{label}</span>
      <span className="text-[color:var(--adm-text)] text-right">{value}</span>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 200,
  reset = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  reset?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[color:var(--adm-muted)]">
      <span className="flex justify-between">
        {label}
        <span className="text-[color:var(--adm-text)] tabular-nums">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(reset)}
        title="Double-click to reset"
        className="w-full accent-[color:var(--adm-accent)]"
      />
    </label>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-[color:var(--adm-line)]">
      {children}
    </div>
  );
}

function chip(active: boolean): string {
  return `text-[11px] px-2.5 py-1 rounded border transition-colors ${
    active
      ? "border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10"
      : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)]"
  }`;
}

function btn(kind: "primary" | "outline" | "ghost"): string {
  const base = "text-xs uppercase tracking-widest px-3 py-2 rounded disabled:opacity-40 disabled:cursor-not-allowed";
  if (kind === "primary") {
    return `${base} bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] hover:opacity-90`;
  }
  if (kind === "outline") {
    return `${base} border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] hover:bg-[color:var(--adm-accent)]/10`;
  }
  return `${base} text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]`;
}
