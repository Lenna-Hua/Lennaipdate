import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PREVIEW_MSG,
  isPreviewMessage,
  type PreviewMessage,
} from "@/lib/live-preview";

// Build-time fallback. These are the same JSON files the API seeds the
// database from on first deploy, so the SPA can render correctly even
// before the API responds (or if the DB is briefly unreachable).
import projectsSeed from "@/data/projects.json";
import aboutSeed from "@/data/about.json";
import experienceSeed from "@/data/experience.json";
import educationSeed from "@/data/education.json";
import gallerySeed from "@/data/gallery.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import filesSeed from "@/data/files.json";
import homepageSeed from "@/data/homepage.json";
import studioSeed from "@/data/studio.json";
import appearanceSeed from "@/data/appearance.json";

type ContentMap = {
  projects: unknown;
  about: unknown;
  experience: unknown;
  education: unknown;
  gallery: unknown;
  identity: unknown;
  contact: unknown;
  files: unknown;
  homepage: unknown;
  studio: unknown;
  appearance: unknown;
};

const SEEDS: ContentMap = {
  projects: projectsSeed,
  about: aboutSeed,
  experience: experienceSeed,
  education: educationSeed,
  gallery: gallerySeed,
  identity: identitySeed,
  contact: contactSeed,
  files: filesSeed,
  homepage: homepageSeed,
  studio: studioSeed,
  appearance: appearanceSeed,
};

const DRAFT_KEY = "lenna_admin_draft";

const ContentCtx = createContext<ContentMap>(SEEDS);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Keep new seed fields (e.g. yearsExperience) when live DB rows are older. */
function mergeWithSeed(key: keyof ContentMap, live: unknown): unknown {
  const seed = SEEDS[key];
  if (live == null) return seed;
  if (isPlainObject(seed) && isPlainObject(live)) {
    return { ...seed, ...live };
  }
  return live;
}

/**
 * Latched at load: in-app navigation drops `?preview=1` from the URL, but the
 * draft must keep applying on every page the preview visits.
 */
const PREVIEW_MODE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("preview") === "1";

/** Preview running inside the admin's live preview iframe. */
const EMBEDDED_PREVIEW =
  PREVIEW_MODE && typeof window !== "undefined" && window.parent !== window;

function readStoredDraft(): Partial<ContentMap> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<ContentMap>) : null;
  } catch {
    return null;
  }
}

function overlayDraft(
  content: ContentMap,
  draft: Partial<ContentMap> | null,
): ContentMap {
  if (!draft) return content;
  const next = { ...content };
  (Object.keys(SEEDS) as (keyof ContentMap)[]).forEach((key) => {
    if (draft[key] === undefined) return;
    const seed = SEEDS[key];
    const live = content[key];
    const d = draft[key];
    if (isPlainObject(seed) && isPlainObject(live) && isPlainObject(d)) {
      next[key] = { ...seed, ...live, ...d };
    } else {
      next[key] = d;
    }
  });
  return next;
}

function buildContentMap(data: Record<string, unknown>): ContentMap {
  const merged: ContentMap = {
    projects: mergeWithSeed("projects", data.projects),
    about: mergeWithSeed("about", data.about),
    experience: mergeWithSeed("experience", data.experience),
    education: mergeWithSeed("education", data.education),
    gallery: mergeWithSeed("gallery", data.gallery),
    identity: mergeWithSeed("identity", data.identity),
    contact: mergeWithSeed("contact", data.contact),
    files: mergeWithSeed("files", data.files),
    homepage: mergeWithSeed("homepage", data.homepage),
    studio: mergeWithSeed("studio", data.studio),
    appearance: mergeWithSeed("appearance", data.appearance),
  };
  return merged;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [liveContent, setContent] = useState<ContentMap>(SEEDS);
  const [draft, setDraft] = useState<Partial<ContentMap> | null>(() =>
    PREVIEW_MODE ? readStoredDraft() : null,
  );
  const content = useMemo(
    () => overlayDraft(liveContent, draft),
    [liveContent, draft],
  );

  useEffect(() => {
    if (!EMBEDDED_PREVIEW) return;
    const origin = window.location.origin;
    const post = (msg: PreviewMessage) => window.parent.postMessage(msg, origin);

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== window.parent) return;
      if (!isPreviewMessage(e.data)) return;
      if (e.data.type === PREVIEW_MSG.draft) {
        setDraft(e.data.draft as Partial<ContentMap>);
      } else if (e.data.type === PREVIEW_MSG.navigate) {
        if (window.location.pathname !== e.data.path) {
          window.history.pushState(null, "", e.data.path);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }
    };
    window.addEventListener("message", onMessage);
    post({ type: PREVIEW_MSG.ready });

    // wouter navigates with pushState, which fires no event — poll the path.
    let lastPath = "";
    const reportPath = () => {
      const path = window.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      post({ type: PREVIEW_MSG.location, path });
    };
    reportPath();
    const pathTimer = window.setInterval(reportPath, 400);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(pathTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const r = await fetch("/api/content?meta=1");
      if (!r.ok) return;
      const payload = (await r.json()) as {
        data?: Record<string, unknown>;
        meta?: Record<string, { updatedAt?: string | null }>;
      };
      const data = payload.data;
      if (cancelled || !data || typeof data !== "object") return;
      setContent(buildContentMap(data));
    };
    // Fetch live content once on mount. If it fails (network, cold-start
    // hiccup, or first ever deploy before the DB seed runs), the SPA
    // keeps rendering with the bundled seed values — never a blank page.
    hydrate()
      .catch(() => {
        // Stay on seeds. Don't surface a network error here — the page
        // is already showing valid content.
      });
    const timer = window.setInterval(() => {
      void hydrate().catch(() => {
        // Keep current rendered data if refresh fails.
      });
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <ContentCtx.Provider value={content}>
      {PREVIEW_MODE && !EMBEDDED_PREVIEW && (
        <div
          className="fixed top-0 inset-x-0 z-[100] px-4 py-2 text-center text-sm font-sans"
          style={{ background: "#C8A96E", color: "#0A0908" }}
        >
          Draft preview — not published yet. Click Save to Site in Admin to go live.
        </div>
      )}
      {children}
    </ContentCtx.Provider>
  );
}

// Typed accessor. Pages call this with the same JSON they used to import
// directly — that import becomes the per-section fallback so the
// returned value is never undefined.
export function useContent<T>(section: keyof ContentMap, fallback: T): T {
  const ctx = useContext(ContentCtx);
  const value = ctx[section];
  return (value as T) ?? fallback;
}
