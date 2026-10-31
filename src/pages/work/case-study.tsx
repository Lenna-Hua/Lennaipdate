import { useParams, Link } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import projectsSeed from "@/data/projects.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { BRAND_EASE } from "@/lib/brand";
import { useFloatIn } from "@/lib/motion";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { CoverVideo, EmbedCover, isVideo } from "@/components/CoverMedia";
import {
  canPlayInBackground,
  embedAspect,
  embedProviderLabel,
  embedSupportsSound,
  parseVideoEmbed,
  playerEmbedUrl,
} from "@/lib/video-embed";
import { RotatingLiveBadge } from "@/components/RotatingLiveBadge";
import { MockupStage } from "@/components/DeviceMockup";
import { CaseStudyLock } from "@/components/CaseStudyLock";
import { isMockupDevice, isMockupLayout, type ScreenMeta } from "@/lib/device-mockup";
import { fetchCaseStudy, unlockCaseStudy } from "@/lib/case-study-access";

function ClampedText({ children, lines = 5 }: { children: React.ReactNode; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useCallback((node: HTMLParagraphElement | null) => {
    if (!node) return;
    setOverflows(node.scrollHeight - node.clientHeight > 2);
  }, []);
  return (
    <div className="flex flex-col gap-2">
      <p
        ref={ref}
        className="text-foreground text-sm md:text-base leading-relaxed font-sans"
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {children}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-primary text-xs uppercase tracking-[0.25em] font-sans font-bold w-max hover:opacity-80 transition-opacity"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

type SectionType = "text" | "image" | "video" | "problem-solution" | "embed" | "mockup";

interface ContentSection {
  id: string;
  type: SectionType;
  /** Default skim. "detail" only after See more. */
  visibility?: "always" | "detail";
  title?: string;
  summary?: string;
  body?: string;
  bullets?: string[];
  body2?: string;
  bullets2?: string[];
  /** When See more is on, these replace the skim fields on the same block. */
  titleDetail?: string;
  summaryDetail?: string;
  bodyDetail?: string;
  bulletsDetail?: string[];
  src?: string;
  caption?: string;
  problem?: string;
  solution?: string;
  problemDetail?: string;
  solutionDetail?: string;
  /** Optional CTA under image/video (no iframe). */
  href?: string;
  linkLabel?: string;
  /** Embed iframe height in px (default 500). PubHTML5 only. */
  height?: number;
  transparent?: boolean;
  loop?: boolean;
  columns?: 1 | 2 | 3;
  screens?: string[];
  device?: string;
  layout?: string;
  background?: string;
  screenMeta?: ScreenMeta[];
  interactive?: boolean;
  mockupWidth?: number;
}

interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  type: string;
  users?: string;
  methods?: string;
  tags: string[];
  description: string;
  bullets?: string[];
  challenge: string;
  solution: string;
  impact: string;
  coverImage: string;
  coverMime?: string;
  coverPoster?: string;
  hoverVideo?: string;
  liveUrl?: string;
  year: string;
  period?: string;
  featured: boolean;
  archived?: boolean;
  sections?: ContentSection[];
  /** @deprecated Prefer sections[].visibility — kept for older DB rows. */
  detailSections?: ContentSection[];
  /** Card-only stub: the server wants a password before sending the body. */
  locked?: boolean;
  /** Card-only stub from the bundled seed: the body comes from the API. */
  deferred?: boolean;
}

// `projects` is resolved per-render from useContent inside CaseStudy() so
// admin edits are reflected after the runtime hydration fetch completes.

type CaseStudyGate =
  | { status: "ready" }
  | { status: "loading" }
  | { status: "locked" }
  | { status: "error"; message: string };

/**
 * Swaps a locked/deferred stub for the full case study from the API.
 * Public projects resolve immediately; protected ones wait for a password.
 */
function useFullProject(base: Project | undefined) {
  const slug = base?.slug;
  const needsFetch = Boolean(base && (base.locked || base.deferred));
  const [fetched, setFetched] = useState<
    { slug: string; project?: Project; gate: CaseStudyGate } | null
  >(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needsFetch || !slug) return;
    let cancelled = false;
    setFetched({ slug, gate: { status: "loading" } });
    void fetchCaseStudy<Project>(slug).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setFetched({ slug, project: result.project, gate: { status: "ready" } });
      } else if (result.status === "locked") {
        setFetched({ slug, gate: { status: "locked" } });
      } else {
        setFetched({ slug, gate: { status: "error", message: result.message } });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, slug, attempt]);

  const unlock = useCallback(
    async (password: string): Promise<string | null> => {
      if (!slug) return "Case study not found.";
      const result = await unlockCaseStudy<Project>(slug, password);
      if (!result.ok) return result.message;
      setFetched({ slug, project: result.project, gate: { status: "ready" } });
      return null;
    },
    [slug],
  );
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!base || !needsFetch) {
    return { project: base, gate: { status: "ready" } as CaseStudyGate, unlock, retry };
  }
  const current = fetched?.slug === slug ? fetched : null;
  return {
    project: current?.project ?? base,
    gate: current?.gate ?? ({ status: "loading" } as CaseStudyGate),
    unlock,
    retry,
  };
}

function buildSocials(contact: typeof contactSeed): Array<{ label: string; title: string; href: string }> {
  const out: Array<{ label: string; title: string; href: string }> = [];
  if (contact.email?.trim()) {
    out.push({ label: "✉", title: "Email", href: `mailto:${contact.email.trim()}` });
  }
  for (const s of contact.socials ?? []) {
    const label = (s.label ?? "").trim();
    const href = (s.href ?? "").trim();
    if (!label || !href) continue;
    out.push({ label: label.slice(0, 2), title: label, href });
  }
  return out;
}

type LightboxProps = {
  src: string;
  caption?: string;
  mime?: string;
  onClose: () => void;
};

/** Portaled to <body> so the fixed site header can't stack above it. */
function Lightbox(props: LightboxProps) {
  return createPortal(<LightboxContent {...props} />, document.body);
}

function LightboxContent({ src, caption, mime, onClose }: LightboxProps) {
  const embed = parseVideoEmbed(src);
  const video = Boolean(embed) || isVideo(src, mime);
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the close button on open
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Trap focus within lightbox
      if (e.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom(z => Math.min(4, Math.max(0.5, z - e.deltaY * 0.001)));
  }, []);

  if (video) {
    return (
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={caption || "Video lightbox"}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
        style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(6px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors text-lg"
          aria-label="Close"
        >✕</button>
        {embed ? (
          <motion.iframe
            src={playerEmbedUrl(embed)}
            title={caption || `${embedProviderLabel(embed)} video`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="rounded-xl bg-black"
            style={
              embed.provider === "instagram"
                ? { width: "min(92vw, 480px)", height: "85vh", border: 0 }
                : {
                    width: `min(92vw, ${(85 * embedAspect(embed)).toFixed(2)}vh)`,
                    aspectRatio: embedAspect(embed),
                    border: 0,
                  }
            }
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.28, ease: BRAND_EASE }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <motion.video
            src={src}
            controls
            autoPlay
            loop
            playsInline
            className="rounded-xl"
            style={{ maxWidth: "92vw", maxHeight: "85vh" }}
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.28, ease: BRAND_EASE }}
            onClick={e => e.stopPropagation()}
          />
        )}
        <p className="absolute bottom-5 left-0 right-0 text-center text-white/40 text-sm font-sans pointer-events-none">
          {caption ? `${caption} · ` : ""}Click outside to close
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={caption || "Image lightbox"}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: "rgba(5,5,5,0.95)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white text-base flex items-center justify-center transition-colors font-bold"
          aria-label="Zoom out"
        >−</button>
        <span className="text-white/60 text-sm font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.25))}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white text-base flex items-center justify-center transition-colors font-bold"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(1)}
          className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white text-sm flex items-center justify-center transition-colors ml-1"
          aria-label="Reset zoom"
        >Reset</button>
        <button
          ref={closeRef}
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors ml-2 text-lg"
          aria-label="Close"
        >✕</button>
      </div>

      <motion.div
        className="overflow-auto rounded-xl cursor-zoom-in"
        style={{ width: "92vw", height: "85vh", scrollbarWidth: "none" }}
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.28, ease: BRAND_EASE }}
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <div
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            minWidth: "100%",
            minHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "width 0.15s ease, height 0.15s ease",
          }}
        >
          <SafeImage
            src={src}
            alt={caption || ""}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
            fallbackAspect="16 / 5"
          />
        </div>
      </motion.div>

      <p className="absolute bottom-5 left-0 right-0 text-center text-white/40 text-sm font-sans pointer-events-none">
        {caption ? `${caption} · ` : ""}Scroll to zoom · Click outside to close
      </p>
    </motion.div>
  );
}

const COVER_CONTROL_CLASS =
  "w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-sm flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Case study hero cover: image, video file, or YouTube / Vimeo / Instagram link.
 * Click to expand; playable covers get play/pause and (where supported) sound.
 */
function CaseStudyCover({ project, onExpand }: { project: Project; onExpand: () => void }) {
  const [errored, setErrored] = useState(false);
  const embed = parseVideoEmbed(project.coverImage);
  const video = !embed && isVideo(project.coverImage, project.coverMime);
  const backgroundEmbed = embed && canPlayInBackground(embed) ? embed : null;
  const playable = video || Boolean(backgroundEmbed);
  const hasSound = video || Boolean(backgroundEmbed && embedSupportsSound(backgroundEmbed));
  const videoRef = useRef<HTMLVideoElement>(null);
  /** null = default (play unless reduced motion); otherwise the visitor's explicit choice. */
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => setChoice(playing ? "pause" : "play");

  const toggleSound = () => {
    setMuted(!muted);
    if (muted && !playing) setChoice("play");
  };

  const expand = () => {
    setMuted(true);
    onExpand();
  };

  const kind = embed || video ? "video" : "image";
  const label = `Expand cover ${kind}: ${project.title}`;
  const playState = {
    allowPlay: choice !== "pause",
    ignoreReducedMotion: choice === "play",
    onPlayingChange: setPlaying,
  };

  return (
    <motion.div
      className="w-full overflow-hidden rounded-xl group relative bg-card"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 1, ease: BRAND_EASE }}
      style={{ aspectRatio: "16/7" }}
    >
      {embed ? (
        <EmbedCover
          embed={embed}
          poster={project.coverPoster}
          label={project.title}
          muted={muted}
          className="w-full h-full"
          {...playState}
        />
      ) : video ? (
        <CoverVideo
          ref={videoRef}
          src={project.coverImage}
          poster={project.coverPoster}
          label={project.title}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
          {...playState}
        />
      ) : (
        <SafeImage
          src={project.coverImage}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          onError={() => setErrored(true)}
        />
      )}
      {!errored && (
        <button
          type="button"
          onClick={expand}
          aria-label={label}
          className="absolute inset-0 bg-black/0 hover:bg-black/25 focus-visible:bg-black/25 transition-colors duration-300 flex items-center justify-center rounded-xl cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {embed && !backgroundEmbed ? (
            <span className="flex items-center gap-2 text-white text-sm uppercase tracking-widest font-sans bg-black/60 px-5 py-2.5 rounded-full">
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              Play video
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm uppercase tracking-widest font-sans bg-black/60 px-4 py-2 rounded-full">
              Click to expand
            </span>
          )}
        </button>
      )}
      {playable && !errored && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause cover video" : "Play cover video"}
            className={COVER_CONTROL_CLASS}
          >
            {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          {hasSound ? (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? "Unmute cover video" : "Mute cover video"}
              aria-pressed={!muted}
              className={COVER_CONTROL_CLASS}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

function useTOC(sections: ContentSection[]) {
  const tocItems = sections.filter(s => s.title);
  const [activeId, setActiveId] = useState(tocItems[0]?.id ?? "");

  useEffect(() => {
    if (!tocItems.length) return;
    const observers: IntersectionObserver[] = [];
    tocItems.forEach(item => {
      const el = document.getElementById(`cs-${item.id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        entries => { if (entries[0].isIntersecting) setActiveId(item.id); },
        { rootMargin: "-15% 0% -65% 0%", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  return { tocItems, activeId };
}

function isAllowedEmbedSrc(src: string): boolean {
  try {
    const u = new URL(src);
    // Live product sites use CTA links — iframe only for PubHTML5 publications.
    return u.protocol === "https:" && (
      u.hostname === "online.pubhtml5.com" ||
      u.hostname.endsWith(".pubhtml5.com")
    );
  } catch {
    return false;
  }
}

function isSafeCtaHref(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return href.startsWith("/");
  }
}

function MediaCta({ href, linkLabel }: { href?: string; linkLabel?: string }) {
  const raw = href?.trim() ?? "";
  if (!raw || !isSafeCtaHref(raw)) return null;
  const label = (linkLabel?.trim() || "Try the product").replace(/\s*[→↗›»]+\s*$/, "");
  return (
    <a
      href={raw}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center justify-center gap-3 mt-2 self-start px-7 py-3.5 rounded-full border-2 border-primary bg-primary text-primary-foreground font-sans text-sm md:text-base font-bold uppercase tracking-[0.18em] shadow-md shadow-primary/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {label}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
        →
      </span>
    </a>
  );
}

type SectionRow = { key: string; sections: ContentSection[]; shared: boolean };

const SHARED_ROW_SPAN: Record<2 | 3, string> = { 2: "md:col-span-3", 3: "md:col-span-2" };

function sharesRow(s: ContentSection): s is ContentSection & { columns: 2 | 3 } {
  return (s.type === "image" || s.type === "video") && (s.columns === 2 || s.columns === 3);
}

/** Consecutive Half / Third image or video sections go into one 6-column grid. */
function groupSectionRows(sections: ContentSection[]): SectionRow[] {
  const rows: SectionRow[] = [];
  for (const s of sections) {
    const shared = sharesRow(s);
    const last = rows[rows.length - 1];
    if (shared && last?.shared) last.sections.push(s);
    else rows.push({ key: s.id, sections: [s], shared });
  }
  return rows;
}

/** Resolve skim vs expanded without remounting a second document tree when possible. */
function resolveDisplaySections(
  project: Project | undefined,
  showDetail: boolean,
): { sections: ContentSection[]; hasExpandable: boolean } {
  const base = project?.sections ?? [];
  const legacyDetail = project?.detailSections ?? [];
  const usesVisibility = base.some((s) => s.visibility === "detail" || s.visibility === "always");

  if (usesVisibility) {
    const hasExpandable =
      base.some((s) => s.visibility === "detail") ||
      base.some(
        (s) =>
          !!(s.bodyDetail || s.summaryDetail || s.titleDetail || s.bulletsDetail?.length ||
            s.problemDetail || s.solutionDetail),
      );
    return {
      hasExpandable,
      sections: showDetail ? base : base.filter((s) => s.visibility !== "detail"),
    };
  }

  // Legacy: separate detailSections array (older DB / seed rows)
  if (legacyDetail.length > 0) {
    return {
      hasExpandable: true,
      sections: showDetail ? legacyDetail : base,
    };
  }

  const hasTextExpand = base.some(
    (s) =>
      !!(s.bodyDetail || s.summaryDetail || s.titleDetail || s.bulletsDetail?.length ||
        s.problemDetail || s.solutionDetail),
  );
  return { hasExpandable: hasTextExpand, sections: base };
}

function SectionBlock({
  section,
  expanded,
  onImageClick,
}: {
  section: ContentSection;
  expanded: boolean;
  onImageClick: (src: string, caption?: string) => void;
}) {
  if (section.type === "image" || section.type === "video") {
    return <ImageSection section={section} onImageClick={onImageClick} />;
  }
  if (section.type === "embed") {
    return <EmbedSection section={section} />;
  }
  if (section.type === "mockup") {
    return <MockupSection section={section} onImageClick={onImageClick} />;
  }
  return <SectionBlockText section={section} expanded={expanded} />;
}

function MockupSection({
  section,
  onImageClick,
}: {
  section: ContentSection;
  onImageClick: (src: string, caption?: string) => void;
}) {
  const floatIn = useFloatIn();
  const screens = (section.screens ?? []).filter(Boolean);
  if (!screens.length) return null;
  const device = isMockupDevice(section.device) ? section.device : "phone";
  const layout = isMockupLayout(section.layout) ? section.layout : "single";
  return (
    <motion.div
      id={`cs-${section.id}`}
      className="flex flex-col gap-3"
      {...floatIn}
    >
      {section.title && (
        <h2 className="font-display font-black uppercase text-xl md:text-2xl text-primary leading-tight tracking-tight">
          {section.title}
        </h2>
      )}
      <MockupStage
        device={device}
        layout={layout}
        screens={section.screens ?? []}
        meta={section.screenMeta}
        background={section.background}
        width={section.mockupWidth}
        interactive={!!section.interactive}
        alt={section.caption || section.title}
        onScreenClick={(src) => onImageClick(src, section.caption)}
      />
      {section.caption && (
        <p className="text-sm font-sans text-muted-foreground italic">
          {section.caption}
        </p>
      )}
      <MediaCta href={section.href} linkLabel={section.linkLabel} />
    </motion.div>
  );
}

function pickExpanded<T>(expanded: boolean, skim: T | undefined, detail: T | undefined): T | undefined {
  if (expanded && detail !== undefined && detail !== null && detail !== "") {
    if (Array.isArray(detail) && detail.length === 0) return skim;
    return detail;
  }
  return skim;
}

function EmbedSection({ section }: { section: ContentSection }) {
  const floatIn = useFloatIn();
  const src = section.src?.trim() ?? "";
  const allowed = isAllowedEmbedSrc(src);
  const height =
    typeof section.height === "number" && section.height > 0 ? section.height : 500;

  return (
    <motion.div
      id={`cs-${section.id}`}
      className="flex flex-col gap-3"
      {...floatIn}
    >
      {section.title && (
        <h2 className="font-display font-black uppercase text-xl md:text-2xl text-primary leading-tight tracking-tight">
          {section.title}
        </h2>
      )}
      {allowed ? (
        <>
          <div
            className="w-full overflow-hidden rounded-xl bg-card border border-border"
            style={{ height }}
          >
            <iframe
              src={src}
              title={section.title || section.caption || "Embedded publication"}
              className="w-full h-full border-0"
              allowFullScreen
              sandbox="allow-same-origin allow-scripts allow-pointer-lock allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs uppercase tracking-[0.25em] font-sans font-bold w-max hover:opacity-80 transition-opacity"
          >
            Open in a new tab ↗
          </a>
        </>
      ) : (
        <p className="text-sm font-sans text-muted-foreground">
          Embed unavailable — add a valid embed URL.
        </p>
      )}
      {section.caption && (
        <p className="text-sm font-sans text-muted-foreground italic">
          {section.caption}
        </p>
      )}
    </motion.div>
  );
}

function SectionVideo({ src, loop, label }: { src: string; loop: boolean; label?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const gifLike = loop && !reduceMotion;
  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  return (
    <video
      ref={ref}
      src={src}
      controls={!gifLike}
      loop={loop}
      autoPlay={gifLike}
      muted={gifLike}
      playsInline
      preload={gifLike ? "auto" : "metadata"}
      aria-label={label || undefined}
      title={gifLike ? "Click to pause or play" : undefined}
      onClick={gifLike ? togglePlay : undefined}
      tabIndex={gifLike ? 0 : undefined}
      onKeyDown={
        gifLike
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                togglePlay();
              }
            }
          : undefined
      }
      className={`block w-full h-auto max-h-[70vh] ${gifLike ? "cursor-pointer" : ""}`}
    />
  );
}

function ImageSection({
  section,
  onImageClick,
}: {
  section: ContentSection;
  onImageClick: (src: string, caption?: string) => void;
}) {
  const floatIn = useFloatIn();
  const [errored, setErrored] = useState(false);
  const isVideo =
    section.type === "video" ||
    (!!section.src &&
      (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(section.src) || section.src.startsWith("data:video")));
  const clickable = !errored && !!section.src && !isVideo;

  if (isVideo) {
    return (
      <motion.div
        id={`cs-${section.id}`}
        className="flex flex-col gap-3"
        {...floatIn}
      >
        {section.title && (
          <h2 className="font-display font-black uppercase text-xl md:text-2xl text-primary leading-tight tracking-tight">
            {section.title}
          </h2>
        )}
        <div className={`w-full overflow-hidden rounded-xl ${section.transparent ? "" : "bg-card"}`}>
          <SectionVideo src={section.src!} loop={!!section.loop} label={section.caption || section.title} />
        </div>
        {section.caption && (
          <p className="text-sm font-sans text-muted-foreground italic">
            {section.caption}
          </p>
        )}
        <MediaCta href={section.href} linkLabel={section.linkLabel} />
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`cs-${section.id}`}
      className="flex flex-col gap-3"
      {...floatIn}
    >
      {section.title && (
        <h2 className="font-display font-black uppercase text-xl md:text-2xl text-primary leading-tight tracking-tight">
          {section.title}
        </h2>
      )}
      <div
        className={`w-full overflow-hidden rounded-xl group relative flex items-center justify-center ${section.transparent ? "" : "bg-card"} ${clickable ? "cursor-zoom-in" : ""}`}
        onClick={() => clickable && onImageClick(section.src!, section.caption)}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? `Expand image: ${section.caption || ""}` : undefined}
        onKeyDown={e => clickable && e.key === "Enter" && onImageClick(section.src!, section.caption)}
      >
        <SafeImage
          src={section.src}
          alt={section.caption || section.title || ""}
          className="block max-w-full max-h-[40vh] md:max-h-[55vh] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.015]"
          loading="lazy"
          fallbackAspect="16 / 5"
          onError={() => setErrored(true)}
        />
        {clickable && (
          <div className={`absolute inset-0 transition-colors duration-300 rounded-xl flex items-center justify-center ${section.transparent ? "" : "bg-black/0 group-hover:bg-black/30"}`}>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm uppercase tracking-widest font-sans bg-black/60 px-4 py-2 rounded-full">
              Click to expand
            </span>
          </div>
        )}
      </div>
      {section.caption && (
        <p className="text-sm font-sans text-muted-foreground italic">
          {section.caption}
        </p>
      )}
      <MediaCta href={section.href} linkLabel={section.linkLabel} />
    </motion.div>
  );
}

function SectionBlockText({
  section,
  expanded,
}: {
  section: ContentSection;
  expanded: boolean;
}) {
  const floatIn = useFloatIn();
  const title = pickExpanded(expanded, section.title, section.titleDetail);
  const summary = pickExpanded(expanded, section.summary, section.summaryDetail);
  const body = pickExpanded(expanded, section.body, section.bodyDetail);
  const bullets = pickExpanded(expanded, section.bullets, section.bulletsDetail);
  const problem = pickExpanded(expanded, section.problem, section.problemDetail);
  const solution = pickExpanded(expanded, section.solution, section.solutionDetail);

  if (section.type === "problem-solution") {
    return (
      <motion.div
        id={`cs-${section.id}`}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        {...floatIn}
      >
        <div className="bg-card border border-border p-5 md:p-6 flex flex-col gap-3 rounded-xl">
          <span className="text-primary text-xs uppercase tracking-[0.4em] font-sans font-bold">Problem</span>
          <ClampedText>{problem}</ClampedText>
        </div>
        <div className="bg-card border border-primary/40 p-5 md:p-6 flex flex-col gap-3 rounded-xl">
          <span className="text-primary text-xs uppercase tracking-[0.4em] font-sans font-bold">Solution</span>
          <ClampedText>{solution}</ClampedText>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`cs-${section.id}`}
      className="flex flex-col gap-4"
      {...floatIn}
    >
      {(title || summary) && (
        <div className="flex flex-col lg:flex-row lg:gap-10 gap-3 border-b border-border pb-5">
          {title && (
            <h2 className="font-display font-black uppercase text-xl md:text-2xl text-primary lg:w-48 flex-shrink-0 leading-tight tracking-tight">
              {title}
            </h2>
          )}
          {summary && (
            <p className="text-foreground text-base md:text-xl font-sans leading-relaxed flex-1 font-medium">
              {summary}
            </p>
          )}
        </div>
      )}
      {body && (
        <p className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans">
          {body}
        </p>
      )}
      {bullets && bullets.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="text-primary flex-shrink-0 mt-[0.3em] text-sm leading-none">▸</span>
              <span className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans">{b}</span>
            </li>
          ))}
        </ul>
      )}
      {section.body2 && (
        <p className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans mt-1">
          {section.body2}
        </p>
      )}
      {section.bullets2 && section.bullets2.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-1">
          {section.bullets2.map((b, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="text-primary flex-shrink-0 mt-[0.3em] text-sm leading-none">▸</span>
              <span className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function FallbackSections({ project }: { project: Project }) {
  const floatIn = useFloatIn();
  return (
    <>
      {project.description && (
        <motion.div
          className="flex flex-col gap-5"
          {...floatIn}
        >
          <div className="flex flex-col lg:flex-row lg:gap-10 gap-3 border-b border-border pb-5">
            <h3 className="font-display font-black uppercase text-xl text-primary lg:w-48 flex-shrink-0 tracking-tight">
              Overview
            </h3>
          </div>
          <p className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans">{project.description}</p>
          {project.bullets && project.bullets.length > 0 && (
            <ul className="flex flex-col gap-2 list-disc pl-5 mt-1">
              {project.bullets.map((b, i) => (
                <li key={i} className="text-foreground/80 text-base md:text-lg leading-relaxed font-sans">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
      {(project.challenge || project.solution) && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          {...floatIn}
        >
          {project.challenge && (
            <div className="bg-card border border-border p-5 md:p-6 flex flex-col gap-3 rounded-xl">
              <span className="text-primary text-xs uppercase tracking-[0.4em] font-sans font-bold">Problem</span>
              <ClampedText>{project.challenge}</ClampedText>
            </div>
          )}
          {project.solution && (
            <div className="bg-card border border-primary/40 p-5 md:p-6 flex flex-col gap-3 rounded-xl">
              <span className="text-primary text-xs uppercase tracking-[0.4em] font-sans font-bold">Solution</span>
              <ClampedText>{project.solution}</ClampedText>
            </div>
          )}
        </motion.div>
      )}
      {project.impact && (
        <motion.div
          className="bg-card border border-border p-8 md:p-12 flex flex-col gap-4 rounded-xl"
          {...floatIn}
        >
          <span className="text-primary text-sm uppercase tracking-[0.4em] font-sans font-bold">Impact</span>
          <p className="text-foreground text-base md:text-lg leading-relaxed font-sans">{project.impact}</p>
        </motion.div>
      )}
    </>
  );
}

export default function CaseStudy({ full = false }: { full?: boolean }) {
  const projects = useContent("projects", projectsSeed) as Project[];
  const visibleProjects = projects.filter((p) => !p.archived);
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const socials = buildSocials(contactData);
  const params = useParams();
  const currentIdx = visibleProjects.findIndex(p => p.slug === params.slug);
  const { project, gate, unlock, retry } = useFullProject(visibleProjects[currentIdx]);
  const prevProject = currentIdx > 0 ? visibleProjects[currentIdx - 1] : null;
  const nextProject = currentIdx < visibleProjects.length - 1 ? visibleProjects[currentIdx + 1] : null;
  const hasSections = Boolean(project?.sections?.length);
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string; mime?: string } | null>(null);
  const showDetail = full;
  const { sections: displaySections, hasExpandable: hasDetailSections } = resolveDisplaySections(
    project,
    showDetail,
  );
  const { tocItems, activeId } = useTOC(displaySections);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`cs-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-4">
        <p className="text-muted-foreground font-sans">Project not found.</p>
        <Link href="/work" className="text-primary text-sm font-sans underline">Back to Work</Link>
      </div>
    );
  }

  if (gate.status === "locked") {
    return (
      <CaseStudyLock
        title={project.title}
        subtitle={project.subtitle}
        coverImage={project.coverImage}
        coverMime={project.coverMime}
        coverPoster={project.coverPoster}
        contactEmail={contactData.email?.trim()}
        onUnlock={unlock}
      />
    );
  }

  if (gate.status === "loading") {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-12 animate-pulse" role="status" aria-label="Loading case study">
        <div className="h-10 w-3/4 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="w-full rounded-xl bg-muted" style={{ aspectRatio: "16/7" }} />
        <span className="sr-only">Loading case study…</span>
      </div>
    );
  }

  if (gate.status === "error") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground font-sans">{gate.message}</p>
        <div className="flex gap-4">
          <button type="button" onClick={retry} className="text-primary text-sm font-sans underline">
            Try again
          </button>
          <Link href="/work" className="text-primary text-sm font-sans underline">Back to Work</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-16 md:gap-20 pb-24">
      {project.liveUrl?.trim() ? (
        <RotatingLiveBadge
          href={project.liveUrl.trim()}
          label="VIEW LIVE • VIEW LIVE •"
          fixed
          size={156}
        />
      ) : null}
      <AnimatePresence>
        {lightbox && (
          <Lightbox
            src={lightbox.src}
            caption={lightbox.caption}
            mime={lightbox.mime}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Hero: title-led layout, supporting author rail on the left ── */}
      <section className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-10 md:gap-16 pt-8 md:pt-16 border-b border-border pb-12">

        {/* Left: quiet supporting rail (bio → socials+name → back) */}
        <motion.aside
          className="order-2 md:order-1 flex flex-col gap-6 md:gap-7"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: BRAND_EASE }}
        >
          <p className="text-foreground/60 text-sm font-sans leading-relaxed">
            {`I'm ${(identityData.name || "").trim().split(/\s+/)[0] || "there"}. I help shape`}<br />ideas into products.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {socials.map(s => (
                <a
                  key={s.title}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.title}
                  title={s.title}
                  className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all text-xs font-bold font-sans"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground font-sans text-sm font-semibold">{identityData.name}</span>
              {identityData.role && (
                <span className="text-muted-foreground font-sans text-xs">{identityData.role}</span>
              )}
            </div>
          </div>

          <Link
            href="/work"
            className="text-muted-foreground/80 hover:text-primary transition-colors text-xs uppercase tracking-[0.2em] font-sans w-max"
          >
            ← All Projects
          </Link>
        </motion.aside>

        {/* Right: title-led project header */}
        <motion.div
          className="order-1 md:order-2 flex flex-col gap-5 md:gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: BRAND_EASE }}
        >
          <h1
            className="font-display font-black text-primary leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.6rem, 6.4vw, 5.5rem)" }}
          >
            {project.title}
          </h1>

          <p className="text-foreground/65 text-base md:text-lg font-sans font-normal leading-relaxed max-w-2xl">
            {project.subtitle}
          </p>

          {project.bullets && project.bullets.length > 0 && (
            <ul className="flex flex-col gap-2 list-disc pl-5 max-w-2xl">
              {project.bullets.map((b, i) => (
                <li key={i} className="text-foreground/80 text-sm md:text-base font-sans leading-relaxed">
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Metadata strip — equal columns, captions read as secondary */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 pt-6 border-t border-border mt-3">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground/80 text-[10px] uppercase tracking-[0.22em] font-sans font-medium">Role</dt>
              <dd className="text-foreground font-sans text-sm md:text-[15px] leading-snug font-medium">{project.type}</dd>
            </div>
            {project.users && (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground/80 text-[10px] uppercase tracking-[0.22em] font-sans font-medium">Users</dt>
                <dd className="text-foreground font-sans text-sm md:text-[15px] leading-snug font-medium">{project.users}</dd>
              </div>
            )}
            {project.methods && (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground/80 text-[10px] uppercase tracking-[0.22em] font-sans font-medium">Methods</dt>
                <dd className="text-foreground font-sans text-sm md:text-[15px] leading-snug font-medium">{project.methods}</dd>
              </div>
            )}
          </dl>
        </motion.div>
      </section>

      {project.coverImage && (
        <CaseStudyCover
          key={project.slug}
          project={project}
          onExpand={() =>
            setLightbox({ src: project.coverImage, caption: project.title, mime: project.coverMime })
          }
        />
      )}

      {/* ── TOC sidebar + content ── */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 md:gap-8">

        {/* Sticky sidebar */}
        <aside className="flex flex-col gap-6 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto">

          {/* Table of Contents */}
          {tocItems.length > 1 && (
            <nav className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans mb-2 block">
                Contents
              </span>
              {tocItems.map((item, i) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`group/toc text-left text-sm font-sans py-1.5 px-2.5 rounded-lg transition-all leading-snug cursor-pointer flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                      isActive
                        ? "text-primary bg-primary/15 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                    }`}
                  >
                    <span className={`font-mono text-[10px] tabular-nums tracking-wider transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground/70 group-hover/toc:text-foreground"
                    }`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{item.title}</span>
                    <span
                      aria-hidden="true"
                      className={`text-xs transition-transform duration-200 ${
                        isActive
                          ? "opacity-100 translate-x-0 text-primary"
                          : "opacity-0 -translate-x-1 group-hover/toc:opacity-100 group-hover/toc:translate-x-0"
                      }`}
                    >
                      ›
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Project meta */}
          <div className="flex flex-col gap-4 border-t border-border pt-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans">{project.period ? "Period" : "Year"}</span>
              <span className="text-foreground font-sans text-base">{project.period ?? project.year}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans">Disciplines</span>
              <div className="flex flex-col gap-1">
                {project.tags.map(tag => (
                  <span key={tag} className="text-foreground/85 font-sans text-base">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-col gap-12 md:gap-16">
          {hasSections
            ? groupSectionRows(displaySections).map(row =>
                row.shared ? (
                  <div key={row.key} className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6 items-start">
                    {row.sections.map(s => (
                      <div key={s.id} className={sharesRow(s) ? SHARED_ROW_SPAN[s.columns] : undefined}>
                        <SectionBlock
                          section={s}
                          expanded={showDetail}
                          onImageClick={(src, cap) => setLightbox({ src, caption: cap })}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <SectionBlock
                    key={row.key}
                    section={row.sections[0]!}
                    expanded={showDetail}
                    onImageClick={(src, cap) => setLightbox({ src, caption: cap })}
                  />
                ),
              )
            : <FallbackSections project={project} />}

          {hasDetailSections && (
            <motion.div
              className="flex flex-col items-center gap-3 pt-4 border-t border-border"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: BRAND_EASE }}
            >
              <Link
                href={showDetail ? `/work/${project.slug}` : `/work/${project.slug}/full`}
                id="cs-detail-toggle"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary bg-primary/10 text-primary font-sans text-sm font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {showDetail ? "Show less" : "See more detail"}
                <span aria-hidden="true">{showDetail ? "↑" : "↓"}</span>
              </Link>
              <p className="text-muted-foreground text-xs font-sans text-center max-w-md">
                {showDetail
                  ? "Full case study with research, Figma system, and product deep-dive."
                  : "Skim version (~5 min). Expand for research, video, and more detail."}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Prev / Next ── */}
      <div className="border-t border-border pt-10 grid grid-cols-2 gap-6 sm:gap-10">
        {prevProject ? (
          <Link href={`/work/${prevProject.slug}`} className="group flex flex-col gap-1 min-w-0">
            <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans">← Previous</span>
            <span className="font-display font-black uppercase text-base sm:text-lg text-foreground group-hover:text-primary transition-colors tracking-tight line-clamp-2 break-words">
              {prevProject.title}
            </span>
          </Link>
        ) : <div />}
        {nextProject ? (
          <Link href={`/work/${nextProject.slug}`} className="group flex flex-col gap-1 text-right min-w-0">
            <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans">Next →</span>
            <span className="font-display font-black uppercase text-base sm:text-lg text-foreground group-hover:text-primary transition-colors tracking-tight line-clamp-2 break-words">
              {nextProject.title}
            </span>
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
