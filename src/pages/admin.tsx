import { createContext, useContext, useEffect, useRef, useState } from "react";
import projectsDataRaw from "@/data/projects.json";
import aboutDataRaw from "@/data/about.json";
import experienceDataRaw from "@/data/experience.json";
import educationDataRaw from "@/data/education.json";
import galleryDataRaw from "@/data/gallery.json";
import identityDataRaw from "@/data/identity.json";
import contactDataRaw from "@/data/contact.json";
import filesDataRaw from "@/data/files.json";
import homepageDataRaw from "@/data/homepage.json";
import studioDataRaw from "@/data/studio.json";
import appearanceDataRaw from "@/data/appearance.json";

// ── Extracted component imports ────────────────────────────────────────
import type {
  Project,
  About,
  ExperienceItem,
  EducationItem,
  GalleryItem,
  Identity,
  Contact,
  Files,
  Homepage,
  Studio,
  Appearance,
  ContentData,
  ContactMessage,
  Asset,
  AssetType,
  AssetPickerFn,
  AssetUploadFn,
  PreflightInfo,
} from "@/components/admin/types";
import { galleryImageSrc, withGalleryImageSrc } from "@/lib/gallery-image";

import {
  formatBytes,
  slugify,
} from "@/components/admin/shared";

import { TagsManager, deriveTagStats } from "@/components/admin/TagsManager";
import { ProjectsEditor } from "@/components/admin/ProjectEditor";
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { InboxEditor } from "@/components/admin/MessageInbox";
import { PreflightPanel, computePreflight } from "@/components/admin/PreflightCheck";
import {
  AssetPickerContext,
  AssetUploadContext,
  AssetPickerModal,
  AssetsEditor,
  uploadAssetFile,
  readAssetDimensions,
  resolveAssetUrl,
  MAX_ASSET_BYTES,
} from "@/components/admin/AssetLibrary";
import { maxAssetBytesForFileType, formatMaxMb, MAX_FUNCTION_UPLOAD_BYTES } from "@/lib/asset-limits";
import { AboutEditor } from "@/components/admin/AboutEditor";
import { ExperienceEditor } from "@/components/admin/ExperienceEditor";
import { EducationEditor } from "@/components/admin/EducationEditor";
import { IdentityContactEditor } from "@/components/admin/IdentityContactEditor";
import { FilesEditor } from "@/components/admin/FilesEditor";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { StudioEditor } from "@/components/admin/StudioEditor";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";
import {
  LivePreviewPane,
  type PreviewPage,
} from "@/components/admin/LivePreviewPane";
import { mergeStudio } from "@/lib/studio-content";
import { mergeAppearance } from "@/lib/fonts";

// ── Constants ──────────────────────────────────────────────────────────

const STORAGE_KEY = "lenna_admin_draft";
const LIVE_PREVIEW_KEY = "lenna_admin_live_preview";
const AUTH_KEY = "lenna_admin_auth";
const TOKEN_KEY = "lenna_admin_token";
/** Legacy key that used to store the raw password — never store passwords client-side. */
const LEGACY_PASSWORD_KEY = "lenna_admin_pw";

const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  },
};

const memorySession: Record<string, string> = {};

const safeSession = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return memorySession[key] ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      memorySession[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      delete memorySession[key];
    }
  },
};

/** Clear any leftover raw-password storage from older admin builds. */
function clearLegacyPasswordStorage() {
  safeSession.removeItem(LEGACY_PASSWORD_KEY);
  safeStorage.removeItem(LEGACY_PASSWORD_KEY);
  safeStorage.removeItem(AUTH_KEY);
}

/**
 * Read a still-valid admin session token from this browser's localStorage.
 * Tokens are machine-local: other computers / browsers never see them.
 * Signature is verified only on the server; here we only check shape + expiry.
 */
function readStoredAdminToken(): string {
  const stored = safeStorage.getItem(TOKEN_KEY);
  if (!stored) return "";
  const parts = stored.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") {
    safeStorage.removeItem(TOKEN_KEY);
    return "";
  }
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) {
    safeStorage.removeItem(TOKEN_KEY);
    return "";
  }
  return stored;
}

// ── Data loading ───────────────────────────────────────────────────────

const defaultData: ContentData = {
  projects: projectsDataRaw as Project[],
  about: aboutDataRaw as About,
  experience: experienceDataRaw as ExperienceItem[],
  education: educationDataRaw as EducationItem[],
  gallery: galleryDataRaw as GalleryItem[],
  identity: identityDataRaw as Identity,
  contact: contactDataRaw as Contact,
  files: filesDataRaw as Files,
  homepage: homepageDataRaw as Homepage,
  studio: studioDataRaw as Studio,
  appearance: appearanceDataRaw as Appearance,
};

function loadDraft(): ContentData {
  const fresh = JSON.parse(JSON.stringify(defaultData)) as ContentData;
  try {
    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<ContentData>;
      const merged = { ...fresh };
      for (const key of Object.keys(fresh) as (keyof ContentData)[]) {
        if (parsed[key] !== undefined) {
          const freshVal = fresh[key];
          const parsedVal = parsed[key];
          if (
            freshVal && typeof freshVal === "object" && !Array.isArray(freshVal) &&
            parsedVal && typeof parsedVal === "object" && !Array.isArray(parsedVal)
          ) {
            merged[key] = { ...freshVal, ...parsedVal } as any;
          } else {
            merged[key] = parsedVal as any;
          }
        }
      }
      return merged;
    }
  } catch {
    // fall through to default
  }
  return fresh;
}

// ── Inline image handling (migration) ──────────────────────────────────

async function dataUrlToFile(dataUrl: string, baseName: string): Promise<File> {
  const mimeMatch = /^data:([^;,]+)/i.exec(dataUrl);
  const mime = (mimeMatch?.[1] ?? "application/octet-stream").toLowerCase();
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const ext = extForMime(mime);
  const safeBase = slugify(baseName || "gallery-inline") || "gallery-inline";
  return new File([blob], `${safeBase}.${ext}`, { type: mime });
}

function extForMime(mime: string): string {
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

async function shrinkImageDataUrlToFit(
  dataUrl: string,
  maxBytes: number,
): Promise<string> {
  const mimeMatch = /^data:([^;,]+)/i.exec(dataUrl);
  const mime = (mimeMatch?.[1] ?? "").toLowerCase();
  if (!mime.startsWith("image/")) return dataUrl;
  if (mime === "image/gif" || mime === "image/svg+xml") return dataUrl;
  const initial = await fetch(dataUrl).then((r) => r.blob());
  if (initial.size <= maxBytes) return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode inline image."));
    el.src = dataUrl;
  });

  const targetBytes = Math.max(256 * 1024, Math.floor(maxBytes * 0.9));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  const sourceW = Math.max(1, img.naturalWidth);
  const sourceH = Math.max(1, img.naturalHeight);
  const longest = Math.max(sourceW, sourceH);

  const scales = [1, 0.85, 0.7, 0.55, 0.45, 0.35];
  const qualities = [0.9, 0.82, 0.75, 0.68, 0.6, 0.5];

  for (const scale of scales) {
    const maxEdge = Math.max(640, Math.round(longest * scale));
    const ratio = Math.min(1, maxEdge / longest);
    const w = Math.max(1, Math.round(sourceW * ratio));
    const h = Math.max(1, Math.round(sourceH * ratio));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const quality of qualities) {
      const out = canvas.toDataURL("image/jpeg", quality);
      const size = await fetch(out).then((r) => r.blob()).then((b) => b.size);
      if (size <= targetBytes) return out;
    }
  }

  return dataUrl;
}

function findInlineMediaInGallery(items: GalleryItem[]): {
  itemLabel: string;
  field: string;
} | null {
  for (const item of items) {
    const label = item.title?.trim() || item.slug?.trim() || item.id;
    if (typeof item.coverImage === "string" && item.coverImage.startsWith("data:")) {
      return { itemLabel: label, field: "coverImage" };
    }
    const imgs = item.images ?? [];
    for (let i = 0; i < imgs.length; i += 1) {
      const src = galleryImageSrc(imgs[i]);
      if (src.startsWith("data:")) {
        return { itemLabel: label, field: `images[${i}]` };
      }
    }
  }
  return null;
}

// ── Live preview routing ───────────────────────────────────────────────

type AdminTab = keyof ContentData | "inbox" | "assets" | "tags";

/** Page the live preview jumps to when a tab opens. Tabs not listed keep the current page. */
const PREVIEW_PATH_FOR_TAB: Partial<Record<AdminTab, string>> = {
  projects: "/work",
  tags: "/work",
  about: "/about",
  experience: "/about",
  education: "/about",
  gallery: "/studio",
  studio: "/studio",
  homepage: "/",
  identity: "/about",
};

/** Tabs whose edits never show on the public site. */
const TABS_WITHOUT_PREVIEW = new Set<AdminTab>(["assets", "inbox"]);

function buildPreviewPages(data: ContentData): PreviewPage[] {
  const pages: PreviewPage[] = [
    { group: "Pages", label: "Home", path: "/" },
    { group: "Pages", label: "Work", path: "/work" },
    { group: "Pages", label: "About", path: "/about" },
    { group: "Pages", label: "Studio", path: "/studio" },
  ];
  for (const p of data.projects) {
    if (p.archived || !p.slug) continue;
    pages.push({ group: "Case studies", label: p.title || p.slug, path: `/work/${p.slug}` });
  }
  for (const g of data.gallery) {
    if (g.archived || !g.slug) continue;
    pages.push({ group: "Studio pieces", label: g.title || g.slug, path: `/studio/${g.slug}` });
  }
  return pages;
}

// ── Main Admin component ───────────────────────────────────────────────

export default function Admin() {
  // Restore from localStorage synchronously so navigating away and back on the
  // same computer stays logged in (no password flash). New machines have no token.
  const [sessionToken, setSessionToken] = useState(readStoredAdminToken);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isAuthenticated = Boolean(sessionToken);
  const [activeTab, setActiveTab] = useState<AdminTab>("projects");
  const [data, setData] = useState<ContentData>(() => loadDraft());
  const [livePreview, setLivePreview] = useState(
    () => safeStorage.getItem(LIVE_PREVIEW_KEY) === "1",
  );
  const [previewPath, setPreviewPath] = useState(
    () => PREVIEW_PATH_FOR_TAB.projects ?? "/",
  );
  const [savedMsg, setSavedMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMigratingInlineMedia, setIsMigratingInlineMedia] = useState(false);
  const [preflightInfo, setPreflightInfo] = useState<PreflightInfo | null>(null);
  const [showPreflightPanel, setShowPreflightPanel] = useState(false);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<{ items: { label: string; field: string; fileName: string; sizeFormatted: string }[]; totalMedia: number } | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsTotal, setAssetsTotal] = useState(0);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerType, setPickerType] = useState<AssetType>("all");
  const pickerCallbackRef = useRef<((url: string) => void) | null>(null);

  const handleLogout = () => {
    safeStorage.removeItem(TOKEN_KEY);
    clearLegacyPasswordStorage();
    setSessionToken("");
  };

  const fetchMessages = async (token: string) => {
    if (!token) return;
    setMessagesLoading(true);
    setMessagesError("");
    try {
      const url = `${import.meta.env.BASE_URL}api/admin/messages`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        messages?: ContactMessage[];
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          return;
        }
        setMessagesError(body.error ?? `Failed to load (${res.status})`);
        return;
      }
      setMessages(body.messages ?? []);
    } catch {
      setMessagesError("Network error — couldn't reach the server.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (sessionToken) void fetchMessages(sessionToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  const fetchAssets = async (
    token: string,
    opts?: { search?: string; type?: AssetType },
  ) => {
    if (!token) return;
    setAssetsLoading(true);
    setAssetsError("");
    try {
      const params = new URLSearchParams();
      const s = opts?.search ?? assetSearch;
      const t = opts?.type ?? assetType;
      if (s) params.set("search", s);
      if (t && t !== "all") params.set("type", t);
      params.set("limit", "200");
      const url = `${import.meta.env.BASE_URL}api/admin/assets?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        assets?: Asset[];
        total?: number;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          handleLogout();
          return;
        }
        setAssetsError(body.error ?? `Failed to load (${res.status})`);
        return;
      }
      setAssets(body.assets ?? []);
      setAssetsTotal(body.total ?? body.assets?.length ?? 0);
    } catch {
      setAssetsError("Network error — couldn't reach the server.");
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionToken) return;
    const handle = setTimeout(() => {
      void fetchAssets(sessionToken, {
        search: assetSearch,
        type: assetType,
      });
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, assetSearch, assetType]);

  const handleAssetUpload = async (files: File[]) => {
    const errors: string[] = [];
    for (const file of files) {
      try {
        await uploadAssetFile(file, sessionToken);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Failed: ${file.name}`);
      }
    }
    await fetchAssets(sessionToken);
    if (errors.length > 0) throw new Error(errors.join(" • "));
  };

  const handleAssetRename = async (id: string, filename: string) => {
    const url = `${import.meta.env.BASE_URL}api/admin/assets/${encodeURIComponent(id)}/rename`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ filename }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      asset?: Asset;
      error?: string;
    };
    if (!res.ok || !body.asset) {
      throw new Error(body.error ?? "Rename failed");
    }
    setAssets((prev) => prev.map((a) => (a.id === id ? body.asset! : a)));
  };

  const handleAssetDelete = async (id: string) => {
    const url = `${import.meta.env.BASE_URL}api/admin/assets/${encodeURIComponent(id)}/delete`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Delete failed");
    }
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setAssetsTotal((n) => Math.max(0, n - 1));
  };

  const handleAssetReplace = async (id: string, file: File) => {
    if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || "unknown"}.`);
    }
    const maxBytes = Math.min(maxAssetBytesForFileType(file.type), MAX_FUNCTION_UPLOAD_BYTES);
    if (file.size > maxBytes) {
      throw new Error(
        `Replace supports files up to ${formatMaxMb(maxBytes)} MB — upload this one as a new asset instead.`,
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
    setAssets((prev) => prev.map((a) => (a.id === id ? body.asset! : a)));
  };

  const handleLibraryUpload: AssetUploadFn = async (file) => {
    const asset = await uploadAssetFile(file, sessionToken);
    void fetchAssets(sessionToken, {
      search: assetSearch,
      type: assetType,
    });
    return resolveAssetUrl(asset.url);
  };

  const openAssetPicker: AssetPickerFn = (onPick, opts) => {
    pickerCallbackRef.current = onPick;
    setPickerType(opts?.type ?? "all");
    setPickerSearch("");
    setPickerOpen(true);
    if (sessionToken) {
      void fetchAssets(sessionToken, { search: "", type: opts?.type ?? "all" });
    }
  };

  const unreadCount = messages.reduce((n, m) => (m.readAt ? n : n + 1), 0);

  useEffect(() => {
    clearLegacyPasswordStorage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const url = `${import.meta.env.BASE_URL}api/admin/login`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        token?: string;
        error?: string;
      };
      if (!res.ok || !body.token) {
        setError(body.error ?? "Incorrect password");
        return;
      }
      // Persist signed token on this browser only — never the password.
      safeStorage.setItem(TOKEN_KEY, body.token);
      setSessionToken(body.token);
      setPassword("");
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
  };

  const handleRunPreflight = async () => {
    try {
      const url = `${import.meta.env.BASE_URL}api/healthz`;
      let storage = "unknown";
      try {
        const res = await fetch(url);
        if (res.ok) {
          const body = await res.json() as { storage?: string };
          storage = body.storage ?? "unknown";
        }
      } catch { /* ignore */ }
      const info = computePreflight(data, storage);
      setPreflightInfo(info);
      setShowPreflightPanel(true);
    } catch {
      setSavedMsg("Error: could not run preflight check.");
      setTimeout(() => setSavedMsg(""), 4000);
    }
  };

  const handleDryRunMigration = async () => {
    setIsDryRunning(true);
    setDryRunResults(null);
    try {
      const items: { label: string; field: string; fileName: string; sizeFormatted: string }[] = [];
      for (let idx = 0; idx < (data.gallery ?? []).length; idx += 1) {
        const item = data.gallery[idx]!;
        const label = item.title?.trim() || item.slug?.trim() || item.id;

        if (typeof item.coverImage === "string" && item.coverImage.startsWith("data:")) {
          const optimized = await shrinkImageDataUrlToFit(item.coverImage, MAX_ASSET_BYTES);
          const file = await dataUrlToFile(optimized, `${item.slug || item.id || `item-${idx + 1}`}-cover`);
          items.push({ label, field: "coverImage", fileName: file.name, sizeFormatted: formatBytes(file.size) });
        }
        for (let imageIdx = 0; imageIdx < (item.images ?? []).length; imageIdx += 1) {
          const src = galleryImageSrc(item.images![imageIdx]);
          if (!src.startsWith("data:")) continue;
          const optimized = await shrinkImageDataUrlToFit(src, MAX_ASSET_BYTES);
          const file = await dataUrlToFile(optimized, `${item.slug || item.id || `item-${idx + 1}`}-image-${imageIdx + 1}`);
          items.push({ label, field: `images[${imageIdx}]`, fileName: file.name, sizeFormatted: formatBytes(file.size) });
        }
      }
      setDryRunResults({ items, totalMedia: items.length });
    } catch {
      setSavedMsg("Error: dry-run scan failed.");
      setTimeout(() => setSavedMsg(""), 4000);
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleSaveDraft = () => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedMsg("Draft saved locally");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleMigrateInlineGalleryMedia = async () => {
    if (!sessionToken) {
      handleLogout();
      setSavedMsg("Session expired — please log in again.");
      setTimeout(() => setSavedMsg(""), 4000);
      return;
    }
    setIsMigratingInlineMedia(true);
    setSavedMsg("");
    try {
      let converted = 0;
      const migratedGallery: GalleryItem[] = [];
      for (let idx = 0; idx < (data.gallery ?? []).length; idx += 1) {
        const item = data.gallery[idx]!;
        let nextItem = item;

        if (typeof item.coverImage === "string" && item.coverImage.startsWith("data:")) {
          const optimized = await shrinkImageDataUrlToFit(item.coverImage, MAX_ASSET_BYTES);
          const file = await dataUrlToFile(optimized, `${item.slug || item.id || `item-${idx + 1}`}-cover`);
          if (file.size > MAX_ASSET_BYTES) {
            throw new Error(`"${file.name}" is too large after optimization (max ${MAX_ASSET_BYTES / 1024 / 1024} MB). Please replace it manually in Gallery.`);
          }
          const uploaded = await uploadAssetFile(file, sessionToken);
          nextItem = { ...nextItem, coverImage: resolveAssetUrl(uploaded.url) };
          converted += 1;
        }

        const images = nextItem.images ?? [];
        if (images.length > 0) {
          const nextImages = [...images];
          let changedImages = false;
          for (let imageIdx = 0; imageIdx < images.length; imageIdx += 1) {
            const src = galleryImageSrc(images[imageIdx]);
            if (!src.startsWith("data:")) continue;
            const optimized = await shrinkImageDataUrlToFit(src, MAX_ASSET_BYTES);
            const file = await dataUrlToFile(optimized, `${item.slug || item.id || `item-${idx + 1}`}-image-${imageIdx + 1}`);
            if (file.size > MAX_ASSET_BYTES) {
              throw new Error(`"${file.name}" is too large after optimization (max ${MAX_ASSET_BYTES / 1024 / 1024} MB). Please replace it manually in Gallery.`);
            }
            const uploaded = await uploadAssetFile(file, sessionToken);
            nextImages[imageIdx] = withGalleryImageSrc(
              images[imageIdx] ?? "",
              resolveAssetUrl(uploaded.url),
            );
            converted += 1;
            changedImages = true;
          }
          if (changedImages) nextItem = { ...nextItem, images: nextImages };
        }

        migratedGallery.push(nextItem);
      }

      if (converted === 0) {
        setSavedMsg("No inline gallery media found — nothing to migrate.");
        setTimeout(() => setSavedMsg(""), 3500);
        return;
      }

      const nextData = { ...data, gallery: migratedGallery };
      setData(nextData);
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      void fetchAssets(sessionToken, { search: assetSearch, type: assetType });
      setSavedMsg(
        `Migrated ${converted} inline gallery media file(s) to hosted URLs. Click Save to Site.`,
      );
      setTimeout(() => setSavedMsg(""), 7000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Migration failed";
      setSavedMsg(`Error: inline media migration failed — ${message}`);
      setTimeout(() => setSavedMsg(""), 7000);
    } finally {
      setIsMigratingInlineMedia(false);
    }
  };

  const handleSaveToSite = async () => {
    let normalizedData = data;
    let autoFixedGallerySlugs = 0;
    if ((data.gallery ?? []).length > 0) {
      const used = new Set<string>();
      const normalizedGallery = (data.gallery ?? []).map((item, idx) => {
        const preferred =
          slugify(item.slug ?? "") ||
          slugify(item.title ?? "") ||
          `item-${idx + 1}`;
        let candidate = preferred;
        let suffix = 2;
        while (!candidate || used.has(candidate)) {
          candidate = `${preferred}-${suffix++}`;
        }
        used.add(candidate);
        if ((item.slug ?? "") !== candidate) {
          autoFixedGallerySlugs += 1;
          return { ...item, slug: candidate };
        }
        return item;
      });
      if (autoFixedGallerySlugs > 0) {
        normalizedData = { ...data, gallery: normalizedGallery };
        setData(normalizedData);
      }
    }
    if (!data.identity?.name?.trim()) {
      setSavedMsg("Error: Identity name cannot be empty.");
      setTimeout(() => setSavedMsg(""), 5000);
      return;
    }
    const badSocials = (data.contact?.socials ?? []).filter((s) => {
      const href = (s.href ?? "").trim();
      if (!href) return false;
      try {
        const u = new URL(href);
        return !["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
      } catch {
        return true;
      }
    });
    if (badSocials.length > 0) {
      setSavedMsg(
        `Error: invalid social URL(s): ${badSocials.map((s) => s.label || s.href).join(", ")}`,
      );
      setTimeout(() => setSavedMsg(""), 5000);
      return;
    }
    if (!sessionToken) {
      handleLogout();
      setSavedMsg("Session expired — please log in again.");
      setTimeout(() => setSavedMsg(""), 4000);
      return;
    }
    const inlineMedia = findInlineMediaInGallery(normalizedData.gallery ?? []);
    if (inlineMedia) {
      setSavedMsg(
        `Error: inline base64 media found in gallery (${inlineMedia.itemLabel} -> ${inlineMedia.field}). Re-upload via media library so it becomes a URL, then save again.`,
      );
      setTimeout(() => setSavedMsg(""), 7000);
      return;
    }
    setIsSaving(true);
    setSavedMsg("");
    try {
      const sectionsToSave: (keyof ContentData)[] = [
        "projects",
        "about",
        "experience",
        "education",
        "gallery",
        "identity",
        "contact",
        "files",
        "homepage",
        "studio",
        "appearance",
      ];
      const savedSections: string[] = [];
      for (const section of sectionsToSave) {
        const url = `${import.meta.env.BASE_URL}api/admin/content?section=${encodeURIComponent(section)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            data: normalizedData[section],
          }),
        });
        const rawText = await res.text();
        const body = (() => {
          if (!rawText) return {} as { error?: string };
          try {
            return JSON.parse(rawText) as { error?: string };
          } catch {
            return {} as { error?: string };
          }
        })();
        if (!res.ok) {
          if (res.status === 401) {
            handleLogout();
            setSavedMsg("Unauthorized — please log in again.");
          } else {
            const detail = body.error || rawText || res.statusText || `HTTP ${res.status}`;
            const savedNote = savedSections.length > 0
              ? ` (${savedSections.length} sections already saved — site may be partially updated)`
              : "";
            setSavedMsg(`Error: ${detail} (section: ${section})${savedNote}`);
          }
          setTimeout(() => setSavedMsg(""), 7000);
          return;
        }
        savedSections.push(section);
      }

      safeStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
      setSavedMsg(
        autoFixedGallerySlugs > 0
          ? `Saved ${savedSections.length} sections. Auto-fixed ${autoFixedGallerySlugs} gallery slug(s).`
          : `Saved ${savedSections.length} sections to live database.`,
      );
      setTimeout(() => setSavedMsg(""), 4500);
    } catch {
      setSavedMsg("Network error — check the API server is running.");
      setTimeout(() => setSavedMsg(""), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = (tab?: keyof ContentData) => {
    let content: unknown = tab ? data[tab] : data;
    let filename = tab ? `${tab}.json` : "lenna_portfolio_data.json";
    if (tab === "identity") {
      content = { identity: data.identity, contact: data.contact };
      filename = "identity_contact.json";
    }
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateSection = <K extends keyof ContentData>(key: K, value: ContentData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const openDraftPreview = (path: string, aboutOverride?: About) => {
    const snapshot = aboutOverride
      ? { ...data, about: aboutOverride }
      : data;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${window.location.origin}${base}${path}?preview=1`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSavedMsg("Draft preview opened — yellow banner means not published yet");
    setTimeout(() => setSavedMsg(""), 4000);
  };

  const toggleLivePreview = () => {
    setLivePreview((on) => {
      safeStorage.setItem(LIVE_PREVIEW_KEY, on ? "0" : "1");
      return !on;
    });
  };

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    const path = PREVIEW_PATH_FOR_TAB[tab];
    if (path) setPreviewPath(path);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-[#141210] p-12 border border-[#272421] w-full max-w-md flex flex-col gap-8">
          <h1 className="font-serif text-3xl text-[#F2EDE5]">Admin Access</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[#8A8278] text-sm uppercase tracking-widest">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 focus:outline-none focus:border-[#C8A96E] transition-colors"
                autoFocus
              />
              {error && <span className="text-[#C8A96E] text-sm mt-1">{error}</span>}
            </div>
            <button
              type="submit"
              className="bg-[#C8A96E] text-[#0A0908] py-3 px-6 uppercase tracking-widest hover:bg-[#E2C99A] transition-colors font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: AdminTab[] = [
    "projects",
    "about",
    "experience",
    "education",
    "gallery",
    "tags",
    "identity",
    "files",
    "homepage",
    "studio",
    "appearance",
    "assets",
    "inbox",
  ];

  const tabLabel = (tab: AdminTab): string => {
    if (tab === "identity") return "Identity & Contact";
    if (tab === "files") return "Files";
    if (tab === "homepage") return "Home & Entry";
    if (tab === "studio") return "Studio Page";
    if (tab === "appearance") return "Fonts & Look";
    if (tab === "inbox") return "Inbox";
    if (tab === "assets") return "Assets";
    if (tab === "tags") return "Tags";
    return tab;
  };

  const allTagSuggestions = Array.from(
    deriveTagStats(data.projects, data.gallery).keys(),
  ).sort((a, b) => a.localeCompare(b));

  const showLivePreview = livePreview && !TABS_WITHOUT_PREVIEW.has(activeTab);

  return (
    <div className="w-full flex flex-col gap-8 pt-12 pb-24">
      <div className="flex flex-wrap justify-between items-start border-b border-[#272421] pb-6 gap-4">
        <div>
          <h1 className="font-serif text-4xl text-[#F2EDE5]">Content Manager</h1>
          <p className="text-[#8A8278] text-sm mt-1">
            Edit content below, then click Save to Site to publish to the live database instantly.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {savedMsg && (
            <span className={`text-sm ${savedMsg.startsWith("Error") || savedMsg.startsWith("Network") ? "text-red-400" : "text-[#C8A96E]"}`}>
              {savedMsg}
            </span>
          )}
          <button
            type="button"
            onClick={toggleLivePreview}
            aria-pressed={livePreview}
            className={`hidden lg:inline-block border px-4 py-2 transition-colors text-sm uppercase tracking-widest ${
              livePreview
                ? "border-[#C8A96E] text-[#C8A96E] bg-[#C8A96E]/10"
                : "border-[#3A3530] text-[#8A8278] hover:border-[#C8A96E] hover:text-[#C8A96E]"
            }`}
          >
            {livePreview ? "Hide Live Preview" : "Live Preview"}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isMigratingInlineMedia}
            className="border border-[#3A3530] text-[#8A8278] px-4 py-2 hover:border-[#C8A96E] hover:text-[#C8A96E] transition-colors text-sm uppercase tracking-widest"
          >
            Save Draft
          </button>
          <button
            onClick={handleRunPreflight}
            disabled={isSaving || isMigratingInlineMedia}
            className="border border-[#3A3530] text-[#8A8278] px-4 py-2 hover:border-[#C8A96E] hover:text-[#C8A96E] transition-colors text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preflight
          </button>
          <button
            onClick={handleMigrateInlineGalleryMedia}
            disabled={isSaving || isMigratingInlineMedia}
            className="border border-[#3A3530] text-[#8A8278] px-4 py-2 hover:border-[#C8A96E] hover:text-[#C8A96E] transition-colors text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMigratingInlineMedia ? "Migrating…" : "Migrate Inline Gallery Media"}
          </button>
          <button
            onClick={handleDryRunMigration}
            disabled={isSaving || isMigratingInlineMedia || isDryRunning}
            className="border border-[#3A3530] text-[#8A8278] px-4 py-2 hover:border-[#C8A96E] hover:text-[#C8A96E] transition-colors text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDryRunning ? "Scanning…" : "Dry Run Migration"}
          </button>
          <button
            onClick={handleSaveToSite}
            disabled={isSaving || isMigratingInlineMedia}
            className="bg-[#C8A96E] text-[#0A0908] px-4 py-2 hover:bg-[#E2C99A] transition-colors text-sm uppercase tracking-widest font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : "Save to Site"}
          </button>
          <button
            onClick={() =>
              handleExport(
                activeTab === "inbox" || activeTab === "assets" || activeTab === "tags"
                  ? undefined
                  : activeTab,
              )
            }
            className="border border-[#272421] text-[#4A4540] px-4 py-2 hover:border-[#3A3530] hover:text-[#8A8278] transition-colors text-sm uppercase tracking-widest"
          >
            Export JSON
          </button>
          <button
            onClick={handleLogout}
            className="border border-[#272421] text-[#4A4540] px-4 py-2 hover:border-[#3A3530] hover:text-[#8A8278] transition-colors text-sm uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Preflight Panel */}
      {showPreflightPanel && preflightInfo && (
        <PreflightPanel
          info={preflightInfo}
          onClose={() => setShowPreflightPanel(false)}
        />
      )}

      {/* Dry Run Results */}
      {dryRunResults && (
        <div className="border border-[#3A3530] rounded-lg p-5 bg-[#0F0E0C]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#F2EDE5] text-lg font-medium">
              Migration Dry Run{" "}
              <span className="text-[#C8A96E] text-sm ml-2">
                {dryRunResults.totalMedia} file(s) would be migrated
              </span>
            </h3>
            <button
              onClick={() => setDryRunResults(null)}
              className="text-[#8A8278] hover:text-[#F2EDE5] text-sm"
            >
              ✕ Close
            </button>
          </div>
          {dryRunResults.items.length === 0 ? (
            <p className="text-emerald-400/70 text-sm">No inline media found — nothing to migrate.</p>
          ) : (
            <div className="space-y-1">
              {dryRunResults.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-[#1A1917] rounded px-3 py-2">
                  <span className="text-[#C8A96E]">{i + 1}.</span>
                  <span className="text-[#F2EDE5]">{item.label}</span>
                  <span className="text-[#8A8278]">→ {item.field}</span>
                  <span className="text-[#8A8278]">({item.fileName})</span>
                  <span className="text-[#C8A96E] ml-auto">{item.sizeFormatted}</span>
                </div>
              ))}
            </div>
          )}
          {dryRunResults.totalMedia > 0 && (
            <p className="text-[#8A8278] text-xs mt-3">
              Click <span className="text-[#C8A96E]">Migrate Inline Gallery Media</span> to upload these files, then <span className="text-[#C8A96E]">Save to Site</span>.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 border-b border-[#272421] pb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`px-4 py-2 uppercase tracking-widest text-sm transition-colors capitalize whitespace-nowrap inline-flex items-center gap-2 ${
              activeTab === tab
                ? "text-[#C8A96E] border-b-2 border-[#C8A96E]"
                : "text-[#8A8278] hover:text-[#F2EDE5]"
            }`}
          >
            {tabLabel(tab)}
            {tab === "inbox" && unreadCount > 0 && (
              <span className="text-[10px] font-semibold bg-[#C8A96E] text-[#0A0908] rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <AssetPickerContext.Provider value={openAssetPicker}>
      <AssetUploadContext.Provider value={handleLibraryUpload}>
      <AssetPickerModal
        open={pickerOpen}
        assets={assets}
        loading={assetsLoading}
        error={assetsError}
        search={pickerSearch}
        setSearch={(s) => {
          setPickerSearch(s);
          if (sessionToken) {
            void fetchAssets(sessionToken, { search: s, type: pickerType });
          }
        }}
        type={pickerType}
        setType={(t) => {
          setPickerType(t);
          if (sessionToken) {
            void fetchAssets(sessionToken, {
              search: pickerSearch,
              type: t,
            });
          }
        }}
        onPick={(a) => {
          const cb = pickerCallbackRef.current;
          pickerCallbackRef.current = null;
          setPickerOpen(false);
          if (cb) cb(resolveAssetUrl(a.url), { mime: a.mime });
        }}
        onClose={() => {
          pickerCallbackRef.current = null;
          setPickerOpen(false);
        }}
        onRefresh={() => {
          if (sessionToken) {
            void fetchAssets(sessionToken, {
              search: pickerSearch,
              type: pickerType,
            });
          }
        }}
      />
      <div
        className={
          showLivePreview
            ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] gap-4 items-start"
            : undefined
        }
      >
      <div className="bg-[#141210] border border-[#272421] p-6 md:p-8 min-h-[500px] min-w-0">
        {activeTab === "projects" && (
          <ProjectsEditor
            data={data.projects}
            onChange={(d) => updateSection("projects", d)}
            tagSuggestions={allTagSuggestions}
          />
        )}
        {activeTab === "tags" && (
          <TagsManager
            projects={data.projects}
            gallery={data.gallery}
            onProjectsChange={(p) => updateSection("projects", p)}
            onGalleryChange={(g) => updateSection("gallery", g)}
          />
        )}
        {activeTab === "about" && (
          <AboutEditor
            data={data.about}
            onChange={(d) => updateSection("about", d)}
            onPreviewHome={(about) => openDraftPreview("/", about)}
            onPreviewAbout={(about) => openDraftPreview("/about", about)}
          />
        )}
        {activeTab === "experience" && (
          <ExperienceEditor
            data={data.experience}
            onChange={(d) => updateSection("experience", d)}
          />
        )}
        {activeTab === "education" && (
          <EducationEditor
            data={data.education}
            onChange={(d) => updateSection("education", d)}
          />
        )}
        {activeTab === "gallery" && (
          <GalleryEditor
            data={data.gallery}
            onChange={(d) => updateSection("gallery", d)}
            tagSuggestions={allTagSuggestions}
          />
        )}
        {activeTab === "identity" && (
          <IdentityContactEditor
            identity={data.identity}
            contact={data.contact}
            onIdentityChange={(d) => updateSection("identity", d)}
            onContactChange={(d) => updateSection("contact", d)}
          />
        )}
        {activeTab === "files" && (
          <FilesEditor
            data={data.files}
            onChange={(d) => updateSection("files", d)}
            sessionToken={sessionToken}
          />
        )}
        {activeTab === "homepage" && (
          <HomepageEditor
            data={data.homepage}
            onChange={(d) => updateSection("homepage", d)}
            onPreview={() => openDraftPreview("/")}
          />
        )}
        {activeTab === "studio" && (
          <StudioEditor
            data={mergeStudio(data.studio)}
            onChange={(d) => updateSection("studio", d)}
            onPreview={() => openDraftPreview("/studio")}
          />
        )}
        {activeTab === "appearance" && (
          <AppearanceEditor
            data={mergeAppearance(data.appearance)}
            onChange={(d) => updateSection("appearance", d)}
          />
        )}
        {activeTab === "assets" && (
          <AssetsEditor
            sessionToken={sessionToken}
            assets={assets}
            total={assetsTotal}
            loading={assetsLoading}
            error={assetsError}
            search={assetSearch}
            setSearch={setAssetSearch}
            type={assetType}
            setType={setAssetType}
            onRefresh={() =>
              void fetchAssets(sessionToken, {
                search: assetSearch,
                type: assetType,
              })
            }
            onUploadFiles={handleAssetUpload}
            onRename={handleAssetRename}
            onDelete={handleAssetDelete}
            onReplace={handleAssetReplace}
          />
        )}
        {activeTab === "inbox" && (
          <InboxEditor
            sessionToken={sessionToken}
            messages={messages}
            loading={messagesLoading}
            error={messagesError}
            onRefresh={() => void fetchMessages(sessionToken)}
            onUpdate={(m) =>
              setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)))
            }
            onDelete={(id) =>
              setMessages((prev) => prev.filter((x) => x.id !== id))
            }
          />
        )}
      </div>
      {showLivePreview && (
        <aside className="hidden lg:block sticky top-[112px] h-[calc(100vh-128px)]">
          <LivePreviewPane
            draft={data}
            path={previewPath}
            onPathChange={setPreviewPath}
            pages={buildPreviewPages(data)}
            onOpenTab={(path) => openDraftPreview(path)}
            onClose={toggleLivePreview}
          />
        </aside>
      )}
      </div>
      </AssetUploadContext.Provider>
      </AssetPickerContext.Provider>

      <div className="border border-[#272421] p-4 text-[#4A4540] text-sm">
        <strong className="text-[#8A8278]">Workflow:</strong> Edit content above
        {" → "}<span className="text-[#C8A96E]">Save to Site</span> (writes to the live database and updates the site)
        {" — or — "}Save Draft (browser only)
        {" → "}Export JSON (manual backup).
      </div>
    </div>
  );
}
