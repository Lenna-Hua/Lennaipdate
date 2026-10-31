import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  Contact as ContactIcon,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  House,
  Images,
  Inbox,
  PanelRight,
  Tag,
  Type,
  User,
} from "lucide-react";
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
import { StudioTabEditor } from "@/components/admin/StudioTabEditor";
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
import { useMediaPrep, UploadCancelledError } from "@/components/admin/MediaPrepModal";
import { maxAssetBytesForFileType, formatMaxMb, MAX_FUNCTION_UPLOAD_BYTES } from "@/lib/asset-limits";
import { AboutEditor } from "@/components/admin/AboutEditor";
import { ExperienceEditor } from "@/components/admin/ExperienceEditor";
import { EducationEditor } from "@/components/admin/EducationEditor";
import { IdentityContactEditor } from "@/components/admin/IdentityContactEditor";
import { FilesEditor } from "@/components/admin/FilesEditor";
import { HomepageEditor } from "@/components/admin/HomepageEditor";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";
import {
  LivePreviewPane,
  type PreviewPage,
} from "@/components/admin/LivePreviewPane";
import { mergeStudio } from "@/lib/studio-content";
import { mergeAppearance } from "@/lib/fonts";
import { migrateBigGalleryToProjects } from "@/lib/gallery-migration";

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

/**
 * The bundle only ships card stubs for case studies (see vite.config.ts), so
 * swap any stub for the full project from the server before it can be edited.
 */
function mergeServerProjects(local: Project[], server: Project[]): Project[] {
  return local.map((p) => {
    if (!p.locked && !p.deferred) return p;
    return server.find((s) => s.id === p.id) ?? server.find((s) => s.slug === p.slug) ?? p;
  });
}

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

/** Draft plus how many gallery "big projects" were just moved into Projects. */
function loadInitialData(): { data: ContentData; movedBigProjects: number } {
  const draft = loadDraft();
  const moved = migrateBigGalleryToProjects(draft.projects ?? [], draft.gallery ?? []);
  return {
    data: { ...draft, projects: moved.projects, gallery: moved.gallery },
    movedBigProjects: moved.migrated,
  };
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
  studio: "/studio",
  homepage: "/",
  identity: "/about",
};

/** Tabs whose edits never show on the public site. */
const TABS_WITHOUT_PREVIEW = new Set<AdminTab>(["assets", "inbox"]);

/** "Pages" follows the public nav order (Home → Work → Studio → About). */
const TAB_GROUPS: { label: string; tabs: AdminTab[] }[] = [
  { label: "Pages", tabs: ["homepage", "projects", "studio", "about"] },
  { label: "Profile", tabs: ["experience", "education", "identity", "files"] },
  { label: "Site settings", tabs: ["tags", "appearance"] },
  { label: "Library", tabs: ["assets", "inbox"] },
];

const TAB_ICONS: Partial<Record<AdminTab, LucideIcon>> = {
  projects: Briefcase,
  tags: Tag,
  about: User,
  experience: Building2,
  education: GraduationCap,
  identity: ContactIcon,
  homepage: House,
  studio: Images,
  appearance: Type,
  files: FileText,
  assets: FolderOpen,
  inbox: Inbox,
};

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
    pages.push({ group: "Artworks", label: g.title || g.slug, path: `/studio/${g.slug}` });
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
  const [initial] = useState(loadInitialData);
  const [data, setData] = useState<ContentData>(initial.data);
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
  const pickerCallbackRef = useRef<Parameters<AssetPickerFn>[0] | null>(null);
  const mediaPrep = useMediaPrep();

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

  const fetchServerProjects = async (token: string): Promise<Project[] | null> => {
    try {
      const url = `${import.meta.env.BASE_URL}api/admin/content?section=projects`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        handleLogout();
        return null;
      }
      if (!res.ok) return null;
      const body = (await res.json().catch(() => null)) as unknown;
      return Array.isArray(body) ? (body as Project[]) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    void fetchServerProjects(sessionToken).then((server) => {
      if (cancelled || !server) return;
      setData((prev) => ({ ...prev, projects: mergeServerProjects(prev.projects, server) }));
    });
    return () => {
      cancelled = true;
    };
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
    for (const [index, original] of files.entries()) {
      try {
        const file = await mediaPrep.prepare(original, { usage: "general", batch: { index, total: files.length } });
        if (!file) continue;
        await uploadAssetFile(file, sessionToken);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Failed: ${original.name}`);
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

  const handleAssetReplace = async (id: string, picked: File) => {
    const file = await mediaPrep.prepare(picked, { usage: "general" });
    if (!file) return;
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

  const handleLibraryUpload: AssetUploadFn = async (picked, opts) => {
    const file = await mediaPrep.prepare(picked, { usage: opts?.usage, batch: opts?.batch });
    if (!file) throw new UploadCancelledError();
    opts?.onPrepared?.(file);
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

  useEffect(() => {
    if (!isAuthenticated || initial.movedBigProjects === 0) return;
    setSavedMsg(
      `Moved ${initial.movedBigProjects} gallery big project(s) into Projects. Click Save to site to publish.`,
    );
    const handle = setTimeout(() => setSavedMsg(""), 9000);
    return () => clearTimeout(handle);
  }, [isAuthenticated, initial.movedBigProjects]);

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
    const incompleteProject = (normalizedData.projects ?? []).find((p) => p.locked || p.deferred);
    if (incompleteProject) {
      setSavedMsg(
        `Error: "${incompleteProject.title}" is still loading from the server. Reload Admin and try again.`,
      );
      setTimeout(() => setSavedMsg(""), 7000);
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

      // The server hashes new case study passwords — keep the hash, not the plain text, locally.
      const serverProjects = await fetchServerProjects(sessionToken);
      if (serverProjects) {
        normalizedData = {
          ...normalizedData,
          projects: normalizedData.projects.map((p) => {
            const saved = serverProjects.find((s) => s.id === p.id);
            return saved ? { ...p, password: saved.password } : p;
          }),
        };
        setData(normalizedData);
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
    if (tab === "studio") {
      content = { studio: data.studio, gallery: data.gallery };
      filename = "studio_artworks.json";
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
      <div className="admin-theme min-h-screen flex items-center justify-center px-4">
        <div className="bg-[color:var(--adm-surface)] p-10 border border-[color:var(--adm-line)] rounded-2xl shadow-sm w-full max-w-sm flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--adm-text)]">Content Manager</h1>
            <p className="text-sm text-[color:var(--adm-muted)] mt-1">Sign in to edit your portfolio.</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-[color:var(--adm-text)]">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md px-3 py-2 text-[color:var(--adm-text)] focus:outline-none focus:border-[color:var(--adm-accent)] focus:ring-2 focus:ring-[color:var(--adm-accent)]/15 transition-colors"
                autoFocus
              />
              {error && <span className="text-red-600 text-sm mt-1">{error}</span>}
            </div>
            <button
              type="submit"
              className="bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] py-2.5 px-6 rounded-md hover:bg-[color:var(--adm-accent-hover)] transition-colors font-medium"
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabLabel = (tab: AdminTab): string => {
    if (tab === "identity") return "Identity & Contact";
    if (tab === "files") return "Files";
    if (tab === "homepage") return "Home & Entry";
    if (tab === "projects") return "Projects";
    if (tab === "studio") return "Studio";
    if (tab === "about") return "About";
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

  const busy = isSaving || isMigratingInlineMedia;

  return (
    <div className="admin-theme min-h-screen flex flex-col">
      {mediaPrep.modal}
      <header className="sticky top-0 z-40 h-14 shrink-0 flex items-center gap-3 px-4 bg-[color:var(--adm-surface)] border-b border-[color:var(--adm-line)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-semibold text-[color:var(--adm-text)] whitespace-nowrap">Content Manager</span>
          <span className="text-[color:var(--adm-placeholder)]">/</span>
          <span className="text-sm text-[color:var(--adm-muted)] capitalize truncate">{tabLabel(activeTab)}</span>
        </div>
        <div className="flex-1" />
        {savedMsg && (
          <span
            role="status"
            className={`hidden md:block text-xs truncate max-w-[280px] ${
              savedMsg.startsWith("Error") || savedMsg.startsWith("Network") ? "text-red-600" : "text-[color:var(--adm-muted)]"
            }`}
          >
            {savedMsg}
          </span>
        )}
        <button
          type="button"
          onClick={toggleLivePreview}
          aria-pressed={livePreview}
          title={livePreview ? "Hide live preview" : "Show live preview"}
          className={`hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm transition-colors ${
            livePreview
              ? "bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-accent)]"
              : "text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)]"
          }`}
        >
          <PanelRight className="h-4 w-4" aria-hidden />
          Preview
        </button>
        <a
          href={import.meta.env.BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)] transition-colors"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View site
        </a>
        <AdminToolsMenu
          items={[
            { label: "Preflight check", onClick: handleRunPreflight, disabled: busy },
            {
              label: isMigratingInlineMedia ? "Migrating…" : "Migrate inline gallery media",
              onClick: handleMigrateInlineGalleryMedia,
              disabled: busy,
            },
            {
              label: isDryRunning ? "Scanning…" : "Dry run migration",
              onClick: handleDryRunMigration,
              disabled: busy || isDryRunning,
            },
            {
              label: "Export JSON",
              onClick: () =>
                handleExport(
                  activeTab === "inbox" || activeTab === "assets" || activeTab === "tags"
                    ? undefined
                    : activeTab,
                ),
            },
            { label: "Log out", onClick: handleLogout, divider: true },
          ]}
        />
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={busy}
          className="h-9 px-3 rounded-md border border-[color:var(--adm-line-strong)] text-sm text-[color:var(--adm-text)] hover:bg-[color:var(--adm-subtle)] transition-colors disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={handleSaveToSite}
          disabled={busy}
          className="h-9 px-4 rounded-md bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] text-sm font-medium hover:bg-[color:var(--adm-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving…" : "Save to site"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
      <nav
        aria-label="Admin sections"
        className="sticky top-14 h-[calc(100vh-3.5rem)] w-14 md:w-56 shrink-0 overflow-y-auto bg-[color:var(--adm-surface)] border-r border-[color:var(--adm-line)] py-3"
      >
        {TAB_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="hidden md:block px-4 pb-1 pt-2 text-[11px] font-medium text-[color:var(--adm-faint)]">
              {group.label}
            </p>
            <ul className="px-2 flex flex-col gap-0.5">
              {group.tabs.map((tab) => {
                const Icon = TAB_ICONS[tab];
                const active = activeTab === tab;
                return (
                  <li key={tab}>
                    <button
                      type="button"
                      onClick={() => selectTab(tab)}
                      aria-current={active ? "page" : undefined}
                      title={tabLabel(tab)}
                      className={`relative w-full flex items-center justify-center md:justify-start gap-3 h-9 px-2.5 rounded-md text-left text-sm capitalize transition-colors ${
                        active
                          ? "bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-accent)] font-medium"
                          : "text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)]"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
                      <span className="hidden md:block flex-1 truncate">{tabLabel(tab)}</span>
                      {tab === "inbox" && unreadCount > 0 && (
                        <span className="absolute md:static top-0.5 right-0.5 text-[10px] font-semibold bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <main className="flex-1 min-w-0 flex flex-col gap-6 p-4 md:p-6">

      {/* Preflight Panel */}
      {showPreflightPanel && preflightInfo && (
        <PreflightPanel
          info={preflightInfo}
          onClose={() => setShowPreflightPanel(false)}
        />
      )}

      {/* Dry Run Results */}
      {dryRunResults && (
        <div className="border border-[color:var(--adm-line-strong)] rounded-lg p-5 bg-[color:var(--adm-surface)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[color:var(--adm-text)] text-lg font-medium">
              Migration Dry Run{" "}
              <span className="text-[color:var(--adm-accent)] text-sm ml-2">
                {dryRunResults.totalMedia} file(s) would be migrated
              </span>
            </h3>
            <button
              onClick={() => setDryRunResults(null)}
              className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)] text-sm"
            >
              ✕ Close
            </button>
          </div>
          {dryRunResults.items.length === 0 ? (
            <p className="text-emerald-400/70 text-sm">No inline media found — nothing to migrate.</p>
          ) : (
            <div className="space-y-1">
              {dryRunResults.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-[color:var(--adm-subtle)] rounded px-3 py-2">
                  <span className="text-[color:var(--adm-accent)]">{i + 1}.</span>
                  <span className="text-[color:var(--adm-text)]">{item.label}</span>
                  <span className="text-[color:var(--adm-muted)]">→ {item.field}</span>
                  <span className="text-[color:var(--adm-muted)]">({item.fileName})</span>
                  <span className="text-[color:var(--adm-accent)] ml-auto">{item.sizeFormatted}</span>
                </div>
              ))}
            </div>
          )}
          {dryRunResults.totalMedia > 0 && (
            <p className="text-[color:var(--adm-muted)] text-xs mt-3">
              Click <span className="text-[color:var(--adm-accent)]">Migrate Inline Gallery Media</span> to upload these files, then <span className="text-[color:var(--adm-accent)]">Save to Site</span>.
            </p>
          )}
        </div>
      )}

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
      <div className="bg-[color:var(--adm-surface)] border border-[color:var(--adm-line)] rounded-xl p-4 md:p-6 min-h-[500px] min-w-0">
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
          <StudioTabEditor
            gallery={data.gallery}
            studio={mergeStudio(data.studio)}
            onGalleryChange={(d) => updateSection("gallery", d)}
            onStudioChange={(d) => updateSection("studio", d)}
            onPreview={() => openDraftPreview("/studio")}
            tagSuggestions={allTagSuggestions}
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
        <aside className="hidden lg:block sticky top-[80px] h-[calc(100vh-104px)]">
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

      <p className="text-[color:var(--adm-faint)] text-xs">
        <span className="text-[color:var(--adm-muted)] font-medium">Workflow:</span> edit content, then{" "}
        <span className="text-[color:var(--adm-accent)]">Save to site</span> to publish. Save draft keeps changes in this
        browser only; Tools → Export JSON makes a manual backup.
      </p>
      </main>
      </div>
    </div>
  );
}

function AdminToolsMenu({
  items,
}: {
  items: { label: string; onClick: () => void; disabled?: boolean; divider?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-md text-sm text-[color:var(--adm-muted)] hover:bg-[color:var(--adm-subtle)] hover:text-[color:var(--adm-text)] transition-colors"
      >
        Tools
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-60 py-1 rounded-lg border border-[color:var(--adm-line)] bg-[color:var(--adm-surface)] shadow-lg z-50"
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.divider && <div className="my-1 border-t border-[color:var(--adm-line)]" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="w-full text-left px-3 py-2 text-sm text-[color:var(--adm-text)] hover:bg-[color:var(--adm-subtle)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
