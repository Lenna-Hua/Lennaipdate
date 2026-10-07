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
  if (!sessionToken) throw new Error("Session expired — log out and back in.");
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
        className={"w-full h-full object-cover bg-[#0A0908] " + className}
      />
    );
  }
  return (
    <img
      src={url}
      alt={asset.filename}
      loading="lazy"
      className={"w-full h-full object-cover bg-[#0A0908] " + className}
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
      ? "text-xs border border-[#3A3530] text-[#8A8278] px-2 py-1 hover:border-[#C8A96E] hover:text-[#C8A96E] uppercase tracking-widest"
      : "text-sm border border-[#3A3530] text-[#8A8278] px-3 py-1.5 hover:border-[#C8A96E] hover:text-[#C8A96E] uppercase tracking-widest";
  return (
    <button type="button" onClick={() => open(onPick, { type })} className={cls}>
      ⌘ {label}
    </button>
  );
}

export function SectionImageUploader({
  onPicked,
  accept = "image/*,video/mp4,video/webm,.gif,.mp4,.webm",
  label = "↑ Upload to library",
}: {
  onPicked: (url: string) => void;
  accept?: string;
  label?: string;
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
            ? "border-[#3A3530] text-[#4A4540] cursor-wait"
            : "border-[#C8A96E] text-[#C8A96E] hover:bg-[#C8A96E] hover:text-[#0A0908]"
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
              const url = await upload(f);
              onPicked(url);
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : "Upload failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

export function UploadToLibraryDashed({
  label,
  accept,
  onUploaded,
}: {
  label: string;
  accept: string;
  onUploaded: (url: string, meta?: { mime?: string }) => void;
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
            ? "border-[#3A3530] text-[#4A4540] cursor-wait"
            : "border-[#3A3530] hover:border-[#C8A96E] text-[#8A8278] cursor-pointer"
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
              const url = await upload(f);
              onUploaded(url, { mime: f.type });
            } catch (e2) {
              setErr(e2 instanceof Error ? e2.message : "Upload failed.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

// ── AssetPickerModal ───────────────────────────────────────────────────

export function AssetPickerModal({
  open,
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0F0D0B] border border-[#272421]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#272421]">
          <h2 className="font-serif text-xl text-[#F2EDE5]">
            Insert from library
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A8278] hover:text-[#F2EDE5] text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#272421]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="flex-1 min-w-[180px] bg-transparent border border-[#3A3530] text-[#F2EDE5] px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8A96E]"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="bg-[#0F0D0B] border border-[#3A3530] text-[#F2EDE5] px-2 py-1.5 text-sm"
          >
            <option value="all">All types</option>
            <option value="image">Images</option>
            <option value="gif">GIFs</option>
            <option value="video">Videos</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="border border-[#3A3530] text-[#8A8278] px-3 py-1.5 hover:border-[#C8A96E] hover:text-[#C8A96E] text-xs uppercase tracking-widest"
          >
            Refresh
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-[#8A8278] text-sm">Loading…</p>}
          {error && (
            <p className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2 mb-3">
              {error}
            </p>
          )}
          {!loading && assets.length === 0 && !error && (
            <p className="text-[#8A8278] text-sm">
              No assets yet. Upload some in the Assets tab first.
            </p>
          )}
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a)}
                className="group flex flex-col gap-1 text-left border border-[#272421] hover:border-[#C8A96E] transition-colors p-1"
              >
                <div className="aspect-square overflow-hidden">
                  <AssetThumb asset={a} />
                </div>
                <div
                  className="text-[10px] text-[#8A8278] truncate px-1"
                  title={a.filename}
                >
                  {a.filename}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
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
          <h2 className="text-[#F2EDE5] text-lg font-serif">Asset Library</h2>
          <p className="text-[#8A8278] text-xs mt-1 max-w-xl">
            Upload, organise, and insert media. Every image or video you upload
            here is stored on the server and can be picked from any editor.
          </p>
        </div>
      </div>

      {/* Drop zone / upload button */}
      <label
        className={`flex items-center justify-center gap-2 px-6 py-5 border-2 border-dashed transition-colors rounded cursor-pointer ${
          drag
            ? "border-[#C8A96E] bg-[#C8A96E]/10"
            : "border-[#3A3530] hover:border-[#C8A96E]"
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
        <span className="text-[#8A8278] text-sm uppercase tracking-widest">
          ↑ Drop files here or click to upload
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
          className="flex-1 min-w-[180px] bg-transparent border border-[#3A3530] text-[#F2EDE5] px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8A96E]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetType)}
          className="bg-[#0F0D0B] border border-[#3A3530] text-[#F2EDE5] px-2 py-1.5 text-sm"
        >
          <option value="all">All types</option>
          <option value="image">Images</option>
          <option value="gif">GIFs</option>
          <option value="video">Videos</option>
        </select>
        <span className="text-[#4A4540] text-xs uppercase tracking-widest">
          {total} {total === 1 ? "item" : "items"}
        </span>
      </div>

      {error && (
        <div className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2">
          {error}
        </div>
      )}

      {!loading && assets.length === 0 && !error ? (
        <div className="text-[#8A8278] text-sm border border-dashed border-[#3A3530] p-8 text-center">
          No assets yet. Upload some above.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {assets.map((a) => (
            <div
              key={a.id}
              className="border border-[#272421] bg-[#0A0908] flex flex-col"
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
                      className="bg-transparent border border-[#3A3530] text-[#F2EDE5] px-2 py-1 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button
                        type="submit"
                        disabled={busyId === a.id}
                        className="text-[10px] uppercase tracking-widest text-[#C8A96E] border border-[#C8A96E] px-2 py-1"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenaming(null)}
                        className="text-[10px] uppercase tracking-widest text-[#8A8278] border border-[#3A3530] px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <span
                    className="text-[#F2EDE5] truncate"
                    title={a.filename}
                  >
                    {a.filename}
                  </span>
                )}
                <span className="text-[#4A4540] text-[10px] uppercase tracking-widest">
                  {assetTypeOf(a.mime)} · {formatBytes(a.size)}
                  {a.width && a.height ? ` · ${a.width}×${a.height}` : ""}
                </span>
                <span className="text-[#4A4540] text-[10px]">
                  {formatDate(a.createdAt)}
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => onCopy(a)}
                    className="text-[10px] uppercase tracking-widest text-[#8A8278] border border-[#3A3530] px-2 py-1 hover:text-[#C8A96E] hover:border-[#C8A96E]"
                  >
                    {copied === a.id ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(a.id);
                      setRenameValue(a.filename);
                    }}
                    className="text-[10px] uppercase tracking-widest text-[#8A8278] border border-[#3A3530] px-2 py-1 hover:text-[#C8A96E] hover:border-[#C8A96E]"
                  >
                    Rename
                  </button>
                  <label className="text-[10px] uppercase tracking-widest text-[#8A8278] border border-[#3A3530] px-2 py-1 hover:text-[#C8A96E] hover:border-[#C8A96E] cursor-pointer">
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
    </div>
  );
}
