/**
 * AssetLibrary — central media store: upload, browse, rename, delete, replace assets.
 * Also provides the AssetPickerModal for inserting images from the library.
 */
import { createContext, useContext, useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import type { Asset, AssetType, AssetPickerFn, AssetUploadFn } from "./types";
import {
  formatBytes,
  assetTypeOf,
  resolveAssetUrl,
  formatDate,
} from "./shared";
import {
  MAX_ASSET_BYTES,
  MAX_FUNCTION_UPLOAD_BYTES,
  maxAssetBytesForFileType,
  formatMaxMb,
} from "@/lib/asset-limits";
import { guidelineSummary, type MediaUsage } from "@/lib/media-guidelines";
import { UploadCancelledError, MediaPrepModal } from "./MediaPrepModal";

// ── Constants ──────────────────────────────────────────────────────────

export { resolveAssetUrl } from "./shared";
export { MAX_ASSET_BYTES } from "@/lib/asset-limits";

// ── Asset helpers ──────────────────────────────────────────────────────

export async function readAssetDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (file.type.startsWith("image/")) {
    return new Promise((resolve) => {
      const objUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const out = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(objUrl);
        resolve(out);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      img.src = objUrl;
    });
  }
  if (file.type.startsWith("video/")) {
    return new Promise((resolve) => {
      const objUrl = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        const out = { width: v.videoWidth, height: v.videoHeight };
        URL.revokeObjectURL(objUrl);
        resolve(out);
      };
      v.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      v.src = objUrl;
    });
  }
  return null;
}

export async function uploadAssetFile(
  file: File,
  sessionToken: string,
): Promise<Asset> {
  if (!sessionToken) throw new Error("Session expired: log out and back in.");
  if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}.`);
  }
  const maxBytes = maxAssetBytesForFileType(file.type);
  if (file.size > maxBytes) {
    throw new Error(
      `"${file.name}" is too large (max ${formatMaxMb(maxBytes)} MB).`,
    );
  }
  const dims = await readAssetDimensions(file);
  if (file.size > MAX_FUNCTION_UPLOAD_BYTES) {
    return uploadAssetFileDirect(file, sessionToken, dims);
  }
  const fd = new FormData();
  fd.append("filename", file.name);
  if (dims?.width != null) fd.append("width", String(dims.width));
  if (dims?.height != null) fd.append("height", String(dims.height));
  fd.append("file", file, file.name);
  const url = `${import.meta.env.BASE_URL}api/admin/assets/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: fd,
  });
  const body = (await res.json().catch(() => ({}))) as {
    asset?: Asset;
    error?: string;
  };
  if (!res.ok || !body.asset) {
    if (res.status === 413) {
      throw new Error(`"${file.name}" is too large for the server upload (${formatMaxMb(MAX_FUNCTION_UPLOAD_BYTES)} MB).`);
    }
    throw new Error(body.error ?? `Upload failed (${res.status}).`);
  }
  return body.asset;
}

/** Large files skip the API function (4.5 MB body cap) and go straight from the browser to Blob storage. */
async function uploadAssetFileDirect(
  file: File,
  sessionToken: string,
  dims: { width: number; height: number } | null,
): Promise<Asset> {
  const { upload } = await import("@vercel/blob/client");
  const ext = (/\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1] ?? file.type.split("/")[1] ?? "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const pathname = `assets/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext || "bin"}`;
  const authHeaders = { Authorization: `Bearer ${sessionToken}` };
  let blob: { url: string };
  try {
    blob = await upload(pathname, file, {
      access: "private",
      contentType: file.type,
      handleUploadUrl: `${import.meta.env.BASE_URL}api/admin/assets?op=client-token`,
      headers: authHeaders,
      multipart: file.size > 20 * 1024 * 1024,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    throw new Error(msg ? `Upload failed: ${msg}` : "Upload failed.");
  }
  const res = await fetch(`${import.meta.env.BASE_URL}api/admin/assets?op=register`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      url: blob.url,
      filename: file.name,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { asset?: Asset; error?: string };
  if (!res.ok || !body.asset) {
    throw new Error(body.error ?? `Upload failed (${res.status}).`);
  }
  return body.asset;
}

export function isEditableAsset(asset: Asset): boolean {
  const mime = (asset.mime || "").toLowerCase();
  return (
    mime.startsWith("image/") &&
    mime !== "image/gif" &&
    mime !== "image/svg+xml"
  );
}

export async function assetToFile(asset: Asset): Promise<File> {
  const url = resolveAssetUrl(asset.url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load "${asset.filename}" (${res.status}).`);
  }
  const blob = await res.blob();
  const extMatch = /\.([a-z0-9]+)$/i.exec(asset.filename);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  const fallbackMime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "image/jpeg";
  const mime = asset.mime || blob.type || fallbackMime;
  return new File([blob], asset.filename, {
    type: mime,
    lastModified: Date.now(),
  });
}

export async function replaceAssetFile(
  id: string,
  file: File,
  sessionToken: string,
): Promise<Asset> {
  if (!sessionToken) throw new Error("Session expired: log out and back in.");
  if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}.`);
  }
  const maxBytes = Math.min(
    maxAssetBytesForFileType(file.type),
    MAX_FUNCTION_UPLOAD_BYTES,
  );
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large for replace (max ${formatMaxMb(maxBytes)} MB).`,
    );
  }
  const dims = await readAssetDimensions(file);
  const fd = new FormData();
  if (dims?.width != null) fd.append("width", String(dims.width));
  if (dims?.height != null) fd.append("height", String(dims.height));
  fd.append("file", file, file.name);
  const url = `${import.meta.env.BASE_URL}api/admin/assets/${encodeURIComponent(id)}/replace`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: fd,
  });
  const body = (await res.json().catch(() => ({}))) as {
    asset?: Asset;
    error?: string;
  };
  if (!res.ok || !body.asset) {
    throw new Error(body.error ?? "Replace failed");
  }
  return body.asset;
}

// ── Contexts ───────────────────────────────────────────────────────────

export const AssetPickerContext = createContext<AssetPickerFn | null>(null);
export const AssetUploadContext = createContext<AssetUploadFn | null>(null);

export function useAssetPicker(): AssetPickerFn | null {
  return useContext(AssetPickerContext);
}

export function useAssetUpload(): AssetUploadFn | null {
  return useContext(AssetUploadContext);
}

// ── Sub-components ─────────────────────────────────────────────────────

export function AssetThumb({
  asset,
  className = "",
}: {
  asset: Asset;
  className?: string;
}) {
  const t = assetTypeOf(asset.mime);
  const url = resolveAssetUrl(asset.url);
  if (t === "video") {
    return (
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        className={"w-full h-full object-cover bg-[color:var(--adm-input)] " + className}
      />
    );
  }
  return (
    <img
      src={url}
      alt={asset.filename}
      loading="lazy"
      className={"w-full h-full object-cover bg-[color:var(--adm-input)] " + className}
    />
  );
}

export function PickFromLibraryButton({
  onPick,
  type = "all",
  label = "From library",
  size = "md",
}: {
  onPick: (url: string, meta?: { mime?: string }) => void;
  type?: AssetType;
  label?: string;
  size?: "md" | "sm";
}) {
  const open = useAssetPicker();
  if (!open) return null;
  const cls =
    size === "sm"
      ? "text-xs border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-2 py-1 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] uppercase tracking-widest"
      : "text-sm border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-1.5 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] uppercase tracking-widest";
  return (
    <button type="button" onClick={() => open(onPick, { type })} className={cls}>
      ⌘ {label}
    </button>
  );
}

function UploadHint({ usage }: { usage?: MediaUsage }) {
  return (
    <p className="text-[10px] text-[color:var(--adm-faint)] leading-snug">
      {guidelineSummary(usage)} · crop & adjust after picking
    </p>
  );
}

export function SectionImageUploader({
  onPicked,
  accept = "image/*,video/mp4,video/webm,.gif,.mp4,.webm",
  label = "↑ Upload to library",
  usage,
}: {
  onPicked: (url: string) => void;
  accept?: string;
  label?: string;
  usage?: MediaUsage;
}) {
  const upload = useAssetUpload();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!upload) return null;
  return (
    <div className="flex flex-col gap-1">
      <label
        className={`text-sm border px-3 py-1.5 uppercase tracking-widest cursor-pointer inline-flex items-center justify-center ${
          busy
            ? "border-[color:var(--adm-line-strong)] text-[color:var(--adm-faint)] cursor-wait"
            : "border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)]"
        }`}
      >
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            setErr("");
            try {
              const url = await upload(f, { usage });
              onPicked(url);
            } catch (e2) {
              if (!(e2 instanceof UploadCancelledError)) {
                setErr(e2 instanceof Error ? e2.message : "Upload failed.");
              }
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <UploadHint usage={usage} />
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

export function UploadToLibraryDashed({
  label,
  accept,
  onUploaded,
  usage,
}: {
  label: string;
  accept: string;
  onUploaded: (url: string, meta?: { mime?: string }) => void;
  usage?: MediaUsage;
}) {
  const upload = useAssetUpload();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!upload) return null;
  return (
    <div className="flex flex-col gap-1 flex-1">
      <label
        className={`flex items-center gap-2 px-3 py-2 border border-dashed transition-colors rounded text-[11px] uppercase tracking-widest ${
          busy
            ? "border-[color:var(--adm-line-strong)] text-[color:var(--adm-faint)] cursor-wait"
            : "border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)] text-[color:var(--adm-muted)] cursor-pointer"
        }`}
      >
        <span>{busy ? "Uploading…" : label}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            setErr("");
            try {
              let mime = f.type;
              const url = await upload(f, { usage, onPrepared: (p) => (mime = p.type) });
              onUploaded(url, { mime });
            } catch (e2) {
              if (!(e2 instanceof UploadCancelledError)) {
                setErr(e2 instanceof Error ? e2.message : "Upload failed.");
              }
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <UploadHint usage={usage} />
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

// ── AssetPickerModal ───────────────────────────────────────────────────

export function AssetPickerModal({
  open,
  sessionToken = "",
  assets,
  loading,
  error,
  search,
  setSearch,
  type,
  setType,
  onPick,
  onClose,
  onRefresh,
}: {
  open: boolean;
  sessionToken?: string;
  assets: Asset[];
  loading: boolean;
  error: string;
  search: string;
  setSearch: (s: string) => void;
  type: AssetType;
  setType: (t: AssetType) => void;
  onPick: (asset: Asset) => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  const handleStartEdit = async (a: Asset) => {
    setLoadingAssetId(a.id);
    setEditError("");
    try {
      const file = await assetToFile(a);
      setEditingAsset(a);
      setEditingFile(file);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to load image for editing.");
    } finally {
      setLoadingAssetId(null);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[color:var(--adm-surface)] border border-[color:var(--adm-line)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--adm-line)]">
          <div>
            <h2 className="font-serif text-xl text-[color:var(--adm-text)]">
              Insert from library
            </h2>
            <p className="text-[11px] text-[color:var(--adm-muted)]">
              Click any image to use it directly, or click Edit to crop and adjust before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)] text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[color:var(--adm-line)]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="flex-1 min-w-[180px] bg-transparent border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--adm-accent)]"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="bg-[color:var(--adm-surface)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-2 py-1.5 text-sm"
          >
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="gif">GIFs</option>
            <option value="video">Videos</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-1.5 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] text-xs uppercase tracking-widest"
          >
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-[color:var(--adm-muted)] text-sm">Loading…</p>}
          {error && (
            <p className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2 mb-3">
              {error}
            </p>
          )}
          {editError && (
            <p className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2 mb-3">
              {editError}
            </p>
          )}
          {!loading && assets.length === 0 && !error && (
            <p className="text-[color:var(--adm-muted)] text-sm">
              No assets yet. Upload some in the Assets tab first.
            </p>
          )}
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {assets.map((a) => {
              const editable = isEditableAsset(a);
              const isLoading = loadingAssetId === a.id;
              return (
                <div
                  key={a.id}
                  className="group flex flex-col justify-between border border-[color:var(--adm-line)] hover:border-[color:var(--adm-accent)] transition-colors p-1 bg-[color:var(--adm-surface)]"
                >
                  <div
                    className="relative aspect-square overflow-hidden cursor-pointer bg-[color:var(--adm-input)]"
                    onClick={() => onPick(a)}
                    title={`Click to use "${a.filename}"`}
                  >
                    <AssetThumb asset={a} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPick(a);
                        }}
                        className="w-full text-[11px] font-semibold uppercase tracking-widest text-white bg-[color:var(--adm-accent)] hover:opacity-90 py-1 px-2 rounded-sm text-center shadow"
                      >
                        Use
                      </button>
                      {editable && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleStartEdit(a);
                          }}
                          className="w-full text-[10px] uppercase tracking-widest text-white bg-black/80 hover:bg-black border border-white/30 py-1 px-2 rounded-sm text-center disabled:opacity-50"
                        >
                          {isLoading ? "Loading…" : "✏️ Edit"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1.5 px-0.5">
                    <div
                      className="text-[11px] text-[color:var(--adm-text)] font-medium truncate"
                      title={a.filename}
                    >
                      {a.filename}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[color:var(--adm-faint)]">
                      <span>{formatBytes(a.size)}</span>
                      {a.width && a.height ? <span>{a.width}×{a.height}</span> : null}
                    </div>
                    <div className="flex items-center gap-1 mt-1 pt-1 border-t border-[color:var(--adm-line)]">
                      <button
                        type="button"
                        onClick={() => onPick(a)}
                        className="flex-1 text-[10px] uppercase tracking-wider py-1 px-1 text-[color:var(--adm-accent)] border border-[color:var(--adm-accent)] hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors text-center font-medium rounded-sm"
                      >
                        Use
                      </button>
                      {editable && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void handleStartEdit(a)}
                          className="flex-1 text-[10px] uppercase tracking-wider py-1 px-1 text-[color:var(--adm-muted)] border border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors text-center rounded-sm disabled:opacity-50"
                        >
                          {isLoading ? "…" : "Edit"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingFile && editingAsset && (
        <MediaPrepModal
          file={editingFile}
          opts={{
            mode: "library",
            saveAsCopyLabel: "Save as a copy and use it",
            saveAndApplyLabel: "Save and apply",
            onUseOriginal: () => {
              const target = editingAsset;
              setEditingFile(null);
              setEditingAsset(null);
              onPick(target);
            },
            onSaveAsCopy: async (outFile) => {
              const newAsset = await uploadAssetFile(outFile, sessionToken);
              onRefresh();
              setEditingFile(null);
              setEditingAsset(null);
              onPick(newAsset);
            },
            onSaveAndApply: async (outFile) => {
              const updated = await replaceAssetFile(editingAsset.id, outFile, sessionToken);
              onRefresh();
              setEditingFile(null);
              setEditingAsset(null);
              onPick(updated);
            },
          }}
          onDone={(result) => {
            if (!result) {
              setEditingFile(null);
              setEditingAsset(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ── AssetsEditor ───────────────────────────────────────────────────────

export function AssetsEditor({
  assets,
  total,
  loading,
  error,
  search,
  setSearch,
  type,
  setType,
  onRefresh,
  onUploadFiles,
  onRename,
  onDelete,
  onReplace,
}: {
  sessionToken: string;
  assets: Asset[];
  total: number;
  loading: boolean;
  error: string;
  search: string;
  setSearch: (s: string) => void;
  type: AssetType;
  setType: (t: AssetType) => void;
  onRefresh: () => void;
  onUploadFiles: (files: File[]) => Promise<void>;
  onRename: (id: string, filename: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReplace: (id: string, file: File) => Promise<void>;
}) {
  const [drag, setDrag] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  const handleStartEdit = async (a: Asset) => {
    setLoadingAssetId(a.id);
    setEditError("");
    try {
      const file = await assetToFile(a);
      setEditingAsset(a);
      setEditingFile(file);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to load image for editing.");
    } finally {
      setLoadingAssetId(null);
    }
  };

  const onCopy = async (a: Asset) => {
    try {
      await navigator.clipboard.writeText(resolveAssetUrl(a.url));
      setCopied(a.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[color:var(--adm-text)] text-lg font-serif">Asset Library</h2>
          <p className="text-[color:var(--adm-muted)] text-xs mt-1 max-w-xl">
            Upload, organise, and insert media. Every image or video you upload
            here is stored on the server and can be picked from any editor.
          </p>
        </div>
      </div>

      {/* Drop zone / upload button */}
      <label
        className={`flex items-center justify-center gap-2 px-6 py-5 border-2 border-dashed transition-colors rounded cursor-pointer ${
          drag
            ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10"
            : "border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) {
            try {
              await onUploadFiles(files);
            } catch {
              // errors shown via parent state
            }
          }
        }}
      >
        <span className="flex flex-col items-center gap-1 text-center">
          <span className="text-[color:var(--adm-muted)] text-sm uppercase tracking-widest">
            ↑ Drop files here or click to upload
          </span>
          <span className="text-[color:var(--adm-faint)] text-[11px]">
            {guidelineSummary("general")}. Images open in the crop & adjust editor before uploading.
          </span>
        </span>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) {
              try {
                await onUploadFiles(files);
              } catch {
                // errors shown via parent state
              }
            }
          }}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by filename…"
          className="flex-1 min-w-[180px] bg-transparent border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--adm-accent)]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetType)}
          className="bg-[color:var(--adm-surface)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="gif">GIFs</option>
          <option value="video">Videos</option>
        </select>
        <span className="text-[color:var(--adm-faint)] text-xs uppercase tracking-widest">
          {total} {total === 1 ? "item" : "items"}
        </span>
      </div>

      {error && (
        <div className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2">
          {error}
        </div>
      )}

      {!loading && assets.length === 0 && !error ? (
        <div className="text-[color:var(--adm-muted)] text-sm border border-dashed border-[color:var(--adm-line-strong)] p-8 text-center">
          No assets yet. Upload some above.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {assets.map((a) => (
            <div
              key={a.id}
              className="border border-[color:var(--adm-line)] bg-[color:var(--adm-input)] flex flex-col"
            >
              <div className="aspect-square overflow-hidden">
                <AssetThumb asset={a} />
              </div>
              <div className="p-2 flex flex-col gap-1 text-xs">
                {renaming === a.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusyId(a.id);
                      try {
                        await onRename(a.id, renameValue);
                        setRenaming(null);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="flex flex-col gap-1"
                  >
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="bg-transparent border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] px-2 py-1 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        type="submit"
                        disabled={busyId === a.id}
                        className="text-[10px] uppercase tracking-widest text-[color:var(--adm-accent)] border border-[color:var(--adm-accent)] px-2 py-1"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(null)}
                        className="text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)] border border-[color:var(--adm-line-strong)] px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <span
                    className="text-[color:var(--adm-text)] truncate"
                    title={a.filename}
                  >
                    {a.filename}
                  </span>
                )}
                <span className="text-[color:var(--adm-faint)] text-[10px] uppercase tracking-widest">
                  {assetTypeOf(a.mime)} · {formatBytes(a.size)}
                  {a.width && a.height ? ` · ${a.width}×${a.height}` : ""}
                </span>
                <span className="text-[color:var(--adm-faint)] text-[10px]">
                  {formatDate(a.createdAt)}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => onCopy(a)}
                    className="text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)] border border-[color:var(--adm-line-strong)] px-2 py-1 hover:text-[color:var(--adm-accent)] hover:border-[color:var(--adm-accent)]"
                  >
                    {copied === a.id ? "Copied!" : "Copy URL"}
                  </button>
                  {isEditableAsset(a) && (
                    <button
                      type="button"
                      disabled={loadingAssetId === a.id || busyId === a.id}
                      onClick={() => void handleStartEdit(a)}
                      className="text-[10px] uppercase tracking-widest text-[color:var(--adm-accent)] border border-[color:var(--adm-accent)] px-2 py-1 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] disabled:opacity-50"
                    >
                      {loadingAssetId === a.id ? "Loading…" : "Edit"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(a.id);
                      setRenameValue(a.filename);
                    }}
                    className="text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)] border border-[color:var(--adm-line-strong)] px-2 py-1 hover:text-[color:var(--adm-accent)] hover:border-[color:var(--adm-accent)]"
                  >
                    Rename
                  </button>
                  <label className="text-[10px] uppercase tracking-widest text-[color:var(--adm-muted)] border border-[color:var(--adm-line-strong)] px-2 py-1 hover:text-[color:var(--adm-accent)] hover:border-[color:var(--adm-accent)] cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setBusyId(a.id);
                        try {
                          await onReplace(a.id, f);
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete "${a.filename}"? This can't be undone.`,
                        )
                      )
                        return;
                      setBusyId(a.id);
                      try {
                        await onDelete(a.id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="text-[10px] uppercase tracking-widest text-red-400 border border-red-900/60 px-2 py-1 hover:bg-red-950/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingFile && editingAsset && (
        <MediaPrepModal
          file={editingFile}
          opts={{
            mode: "library",
            saveAsCopyLabel: "Save as copy",
            saveAndApplyLabel: "Save and apply",
            onSaveAsCopy: async (outFile) => {
              await onUploadFiles([outFile]);
              onRefresh();
              setEditingFile(null);
              setEditingAsset(null);
            },
            onSaveAndApply: async (outFile) => {
              await onReplace(editingAsset.id, outFile);
              onRefresh();
              setEditingFile(null);
              setEditingAsset(null);
            },
          }}
          onDone={(result) => {
            if (!result) {
              setEditingFile(null);
              setEditingAsset(null);
            }
          }}
        />
      )}
    </div>
  );
}
