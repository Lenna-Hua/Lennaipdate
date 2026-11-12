﻿﻿﻿import { useParams, Link } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import projectsSeed from "@/data/projects.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { BRAND_EASE } from "@/lib/brand";
import { useFloatIn } from "@/lib/motion";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Lock, Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { CoverVideo, EmbedCover, isVideo } from "@/components/CoverMedia";
import {
  canPlayInBackground,
  embedAspect,
  embedProviderLabel,
  embedSupportsSound,
  extractIframeSrc,
  inlineEmbedUrl,
  parseVideoEmbed,
  playerEmbedUrl,
} from "@/lib/video-embed";
import { MockupStage } from "@/components/DeviceMockup";
import { Eyebrow, SPLIT_COLUMNS } from "@/components/layout/SplitShowcase";
import { scrollPageTo, useLenis, useScrollLock } from "@/lib/smooth-scroll";
import { CaseStudyLock } from "@/components/CaseStudyLock";
import { AdjustmentFrame } from "@/components/AdjustmentFrame";
import { ProcessStack, parseStepsFromBullets, type ProcessLayout, type ProcessStep } from "@/components/ProcessStack";
import { renderRichText, stripRichText } from "@/lib/rich-text";
import { isMockupDevice, isMockupLayout, type ScreenMeta } from "@/lib/device-mockup";
import { fetchCaseStudy, unlockCaseStudy, type CaseStudyAccess } from "@/lib/case-study-access";

function ClampedText({ children, lines = 6 }: { children: React.ReactNode; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const pRef = useRef<HTMLParagraphElement | null>(null);

  const setNode = useCallback((node: HTMLParagraphElement | null) => {
    pRef.current = node;
    if (node) {
      setOverflows(node.scrollHeight - node.clientHeight > 2);
    }
  }, []);

  useEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight - el.clientHeight > 2);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [children, lines]);

  return (
    <div className="flex flex-col gap-3">
      <p
        ref={setNode}
        className="text-foreground/90 text-base md:text-[17px] leading-relaxed font-sans whitespace-pre-line"
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
        {typeof children === "string" ? renderRichText(children) : children}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="w-max inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] font-mono font-medium text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
        >
          <span>{expanded ? "Show less" : "Read more"}</span>
          <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
        </button>
      )}
    </div>
  );
}

type SectionType = "text" | "image" | "video" | "problem-solution" | "embed" | "mockup" | "cta" | "process";

interface ContentSection {
  id: string;
  type: SectionType;
  /** Process: ordered steps shown as the sliding card deck or user flow. */
  steps?: ProcessStep[];
  /** Process display style: "stack" (overlapping cards) or "flow" (Box → Arrow → Box). */
  processLayout?: ProcessLayout;
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
  slideshow?: boolean;
  images?: string[];
  imageCaptions?: string[];
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
  heroImage?: string;
  heroImageMime?: string;
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
    { slug: string; project?: Project; access?: CaseStudyAccess; gate: CaseStudyGate } | null
  >(null);
  const [attempt, setAttempt] = useState(0);
  const [visitorSlug, setVisitorSlug] = useState<string | null>(null);
  const asVisitor = Boolean(slug) && visitorSlug === slug;

  useEffect(() => {
    if (!needsFetch || !slug) return;
    let cancelled = false;
    setFetched({ slug, gate: { status: "loading" } });
    void fetchCaseStudy<Project>(slug, { asVisitor }).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setFetched({ slug, project: result.project, access: result.access, gate: { status: "ready" } });
      } else if (result.status === "locked") {
        setFetched({ slug, gate: { status: "locked" } });
      } else {
        setFetched({ slug, gate: { status: "error", message: result.message } });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, slug, attempt, asVisitor]);

  const unlock = useCallback(
    async (password: string): Promise<string | null> => {
      if (!slug) return "Case study not found.";
      const result = await unlockCaseStudy<Project>(slug, password);
      if (!result.ok) return result.message;
      setFetched({ slug, project: result.project, access: result.access, gate: { status: "ready" } });
      return null;
    },
    [slug],
  );
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const viewAsVisitor = useCallback(() => setVisitorSlug(slug ?? null), [slug]);

  if (!base || !needsFetch) {
    return {
      project: base,
      gate: { status: "ready" } as CaseStudyGate,
      access: undefined,
      unlock,
      retry,
      viewAsVisitor,
    };
  }
  const current = fetched?.slug === slug ? fetched : null;
  return {
    project: current?.project ?? base,
    gate: current?.gate ?? ({ status: "loading" } as CaseStudyGate),
    access: current?.access,
    unlock,
    retry,
    viewAsVisitor,
  };
}

/** The owner's browser skips the lock, so say why and offer the visitor view. */
function ProtectedAccessNotice({
  access,
  onViewAsVisitor,
}: {
  access: "admin" | "unlock";
  onViewAsVisitor: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-border px-4 py-3">
      <Eyebrow className="inline-flex items-center gap-2">
        <Lock className="w-3 h-3" aria-hidden="true" />
        Password protected
      </Eyebrow>
      <p className="flex-1 min-w-[16rem] text-sm text-muted-foreground">
        {access === "admin"
          ? "You're seeing this because you're signed in to Admin on this browser. Visitors get the password screen."
          : "You unlocked this on this browser, so it stays open for 7 days. Visitors without the password get the password screen."}
      </p>
      <button type="button" onClick={onViewAsVisitor} className={STATE_LINK}>
        View as visitor
      </button>
    </div>
  );
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

const LIGHTBOX_BACKDROP =
  "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md";
const LIGHTBOX_TEXT_BUTTON =
  "text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors";
const LIGHTBOX_HINT =
  "absolute bottom-5 left-0 right-0 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground pointer-events-none";

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

  useScrollLock(true);

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
    return () => document.removeEventListener("keydown", onKey);
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
        className={LIGHTBOX_BACKDROP}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className={`absolute top-5 right-6 z-10 ${LIGHTBOX_TEXT_BUTTON}`}
        >Close</button>
        {embed ? (
          <motion.iframe
            src={playerEmbedUrl(embed)}
            title={caption || `${embedProviderLabel(embed)} video`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="bg-black"
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
            style={{ maxWidth: "92vw", maxHeight: "85vh" }}
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.28, ease: BRAND_EASE }}
            onClick={e => e.stopPropagation()}
          />
        )}
        <p className={LIGHTBOX_HINT}>
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
      className={LIGHTBOX_BACKDROP}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="absolute top-5 right-6 flex items-center gap-5 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className={LIGHTBOX_TEXT_BUTTON}
          aria-label="Zoom out"
        >−</button>
        <span className="text-xs tabular-nums text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.25))}
          className={LIGHTBOX_TEXT_BUTTON}
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(1)}
          className={LIGHTBOX_TEXT_BUTTON}
          aria-label="Reset zoom"
        >Reset</button>
        <button
          ref={closeRef}
          onClick={onClose}
          className={`ml-3 ${LIGHTBOX_TEXT_BUTTON}`}
        >Close</button>
      </div>

      <motion.div
        className="overflow-auto cursor-zoom-in"
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

      <p className={LIGHTBOX_HINT}>
        {caption ? `${caption} · ` : ""}Scroll to zoom · Click outside to close
      </p>
    </motion.div>
  );
}

const COVER_CONTROL_CLASS =
  "w-10 h-10 bg-background/85 hover:bg-background text-foreground backdrop-blur-sm flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const EXPAND_HINT =
  "opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground";

const SECTION_TITLE =
  "font-display font-black uppercase tracking-tight leading-[0.95] text-2xl md:text-3xl text-foreground";

const CAPTION = "text-sm text-muted-foreground";

const STATE_LINK =
  "text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors";

const META_LABEL = "text-[11px] uppercase tracking-[0.2em] text-muted-foreground";
const META_VALUE = "text-sm md:text-[15px] leading-snug text-foreground";

const pad2 = (n: number) => String(n).padStart(2, "0");

function ProjectNavCard({
  project,
  direction,
}: {
  project: Project;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group relative flex flex-col gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className={`flex items-center gap-2 ${isPrev ? "justify-start" : "justify-end sm:justify-start"}`}>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
          {isPrev && <span aria-hidden="true">←</span>}
          {isPrev ? "Previous Project" : "Next Project"}
          {!isPrev && <span aria-hidden="true">→</span>}
        </span>
      </div>

      <div className="relative overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-colors duration-300">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <SafeImage
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            fallbackAspect="16 / 10"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {project.type && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground font-medium">
            {project.type}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display font-black uppercase tracking-tight text-xl sm:text-2xl text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {project.title}
          </h3>
          {project.year && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground font-mono">
              {project.year}
            </span>
          )}
        </div>
        {project.subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {project.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}

function ProblemCard({ text }: { text: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between h-full bg-gradient-to-b from-[#E8715A]/[0.06] via-card to-card dark:from-[#E8715A]/[0.10] dark:via-card dark:to-card border border-border border-t-4 border-t-[#E8715A] p-6 sm:p-7 md:p-8 shadow-sm transition-all duration-300">
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 flex items-center justify-center bg-[#E8715A]/15 text-[#C45A44] dark:text-[#E8715A] shrink-0">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#C45A44] dark:text-[#E8715A]">
              The Problem
            </span>
          </div>
          <AdjustmentFrame
            dashedColor="border-[#E8715A]/60 dark:border-[#E8715A]/80"
            handleColor="bg-[#E8715A]"
            handleBorderColor="border-card"
            className="px-2.5 py-0.5 bg-background/80"
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] font-semibold text-[#C45A44] dark:text-[#E8715A]">
              Challenge
            </span>
          </AdjustmentFrame>
        </div>
        <ClampedText lines={6}>{text}</ClampedText>
      </div>
    </div>
  );
}

function SolutionCard({ text }: { text: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between h-full bg-gradient-to-b from-primary/[0.06] via-card to-card dark:from-primary/[0.12] dark:via-card dark:to-card border border-border border-t-4 border-t-primary p-6 sm:p-7 md:p-8 shadow-sm transition-all duration-300">
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 flex items-center justify-center bg-primary/15 text-primary shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
              The Solution
            </span>
          </div>
          <AdjustmentFrame
            dashedColor="border-primary/60 dark:border-primary/80"
            handleColor="bg-primary"
            handleBorderColor="border-card"
            className="px-2.5 py-0.5 bg-background/80"
          >
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] font-semibold text-primary">
              Approach
            </span>
          </AdjustmentFrame>
        </div>
        <ClampedText lines={6}>{text}</ClampedText>
      </div>
    </div>
  );
}

function DashList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2 mt-1 max-w-3xl">
      {items.map((b, i) => (
        <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-2 text-foreground/80 text-base md:text-lg leading-relaxed">
          <span aria-hidden className="text-muted-foreground">•</span>
          <span>{renderRichText(b)}</span>
        </li>
      ))}
    </ul>
  );
}

const OUTLINE_BUTTON =
  "group inline-flex w-max items-center gap-3 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-colors rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Case study hero cover: image, video file, or YouTube / Vimeo / Instagram link.
 * Click to expand; playable covers get play/pause and (where supported) sound.
 */
function CaseStudyCover({ project, onExpand }: { project: Project; onExpand: () => void }) {
  const [errored, setErrored] = useState(false);
  // Use heroImage (case study page only) when set; fall back to coverImage (card thumbnail)
  const heroSrc = project.heroImage?.trim() || project.coverImage;
  const heroMime = project.heroImage?.trim() ? project.heroImageMime : project.coverMime;
  const embed = parseVideoEmbed(heroSrc);
  const video = !embed && isVideo(heroSrc, heroMime);
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
      className="w-full overflow-hidden group relative bg-muted"
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
          src={heroSrc}
          poster={project.coverPoster}
          label={project.title}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
          {...playState}
        />
      ) : (
        <SafeImage
          src={heroSrc}
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
          className="absolute inset-0 bg-black/0 hover:bg-black/20 focus-visible:bg-black/20 transition-colors duration-300 flex items-center justify-center cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {embed && !backgroundEmbed ? (
            <span className="flex items-center gap-2 bg-background/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground">
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              Play video
            </span>
          ) : (
            <span className={EXPAND_HINT}>Expand</span>
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
    return u.protocol === "https:" && (
      u.hostname === "online.pubhtml5.com" ||
      u.hostname.endsWith(".pubhtml5.com") ||
      u.hostname === "player.vimeo.com" ||
      u.hostname === "vimeo.com" ||
      u.hostname === "www.vimeo.com" ||
      u.hostname === "www.youtube-nocookie.com" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "youtu.be"
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
    <div className="w-full flex justify-end">
      <a
        href={raw}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 rounded-none ${OUTLINE_BUTTON}`}
      >
        {label}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
          ↗
        </span>
      </a>
    </div>
  );
}

function CtaSection({ section }: { section: ContentSection }) {
  const floatIn = useFloatIn();
  const raw = section.href?.trim() ?? "";
  if (!raw || !isSafeCtaHref(raw)) return null;
  const label = (section.linkLabel?.trim() || "Try the product").replace(/\s*[→↗›»]+\s*$/, "");
  return (
    <motion.div
      id={`cs-${section.id}`}
      className="w-full flex flex-col gap-3 py-2"
      {...floatIn}
    >
      {section.title && <h2 className={SECTION_TITLE}>{section.title}</h2>}
      <div className="w-full flex justify-end">
        <a
          href={raw}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-none ${OUTLINE_BUTTON}`}
        >
          {label}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            ↗
          </span>
        </a>
      </div>
    </motion.div>
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
  if (section.type === "cta") {
    return <CtaSection section={section} />;
  }
  if (section.type === "image" || section.type === "video") {
    return <ImageSection section={section} expanded={expanded} onImageClick={onImageClick} />;
  }
  if (section.type === "embed") {
    return <EmbedSection section={section} />;
  }
  if (section.type === "mockup") {
    return <MockupSection section={section} onImageClick={onImageClick} />;
  }
  if (
    section.type === "process" ||
    (section.type === "text" &&
      (section.bullets?.length ?? 0) >= 3 &&
      (/^(process|approach|method|loop)$/i.test(section.id) ||
        /\b(process|research approach|four-phase|care loop)\b/i.test(section.title ?? "")))
  ) {
    return <ProcessSection section={section} expanded={expanded} />;
  }
  return <SectionBlockText section={section} expanded={expanded} />;
}

function ProcessSection({ section, expanded }: { section: ContentSection; expanded: boolean }) {
  const floatIn = useFloatIn();
  const title = pickExpanded(expanded, section.title, section.titleDetail);
  const summary = pickExpanded(expanded, section.summary, section.summaryDetail);
  const body = pickExpanded(expanded, section.body, section.bodyDetail);
  const bullets = pickExpanded(expanded, section.bullets, section.bulletsDetail);
  const explicitSteps = (section.steps ?? []).filter((s) => s.title?.trim() || s.body?.trim());
  const steps = explicitSteps.length > 0 ? explicitSteps : parseStepsFromBullets(bullets ?? []);
  if (!steps.length && !title && !body) return null;
  return (
    <motion.div id={`cs-${section.id}`} className="flex flex-col gap-6 border-t border-border pt-4" {...floatIn}>
      {body && (title || summary) && (
        <div className="flex flex-col gap-3">
          {title && <h2 className={SECTION_TITLE}>{renderRichText(title)}</h2>}
          {summary && (
            <p className="max-w-3xl text-foreground text-lg md:text-2xl leading-snug tracking-tight">{renderRichText(summary)}</p>
          )}
          <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">{renderRichText(body)}</p>
        </div>
      )}
      {body && !title && !summary && (
        <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">{renderRichText(body)}</p>
      )}
      {steps.length > 0 && (
        <ProcessStack
          steps={steps}
          layout={section.processLayout ?? "stack"}
          label={stripRichText(title) || "Process steps"}
          header={
            !body && (title || summary) ? (
              <div className="flex flex-col gap-2">
                {title && <h2 className={SECTION_TITLE}>{renderRichText(title)}</h2>}
                {summary && (
                  <p className="max-w-2xl text-foreground text-lg md:text-2xl leading-snug tracking-tight">{renderRichText(summary)}</p>
                )}
              </div>
            ) : undefined
          }
        />
      )}
    </motion.div>
  );
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
        <h2 className={SECTION_TITLE}>
          {renderRichText(section.title)}
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
        alt={stripRichText(section.caption || section.title)}
        onScreenClick={(src) => onImageClick(src, section.caption)}
      />
      {section.caption && (
        <p className={CAPTION}>
          {renderRichText(section.caption)}
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
  const raw = section.src?.trim() ?? "";
  const embed = parseVideoEmbed(raw);
  const src = embed
    ? inlineEmbedUrl(embed)
    : extractIframeSrc(raw);
  const allowed = isAllowedEmbedSrc(src);
  const height =
    typeof section.height === "number" && section.height > 0 ? section.height : undefined;
  const isVideoEmbed = Boolean(embed);
  const externalLink = embed
    ? (embed.provider === "vimeo"
        ? `https://vimeo.com/${embed.id}`
        : embed.provider === "youtube"
        ? `https://www.youtube.com/watch?v=${embed.id}`
        : src)
    : src;

  return (
    <motion.div
      id={`cs-${section.id}`}
      className="flex flex-col gap-3"
      {...floatIn}
    >
      {section.title && (
        <h2 className={SECTION_TITLE}>
          {section.title}
        </h2>
      )}
      {allowed ? (
        <>
          <div
            className={`w-full overflow-hidden bg-muted border border-border ${
              !height && isVideoEmbed ? "aspect-video" : ""
            }`}
            style={{ height: height ?? (isVideoEmbed ? undefined : 500) }}
          >
            <iframe
              src={src}
              title={section.title || section.caption || "Embedded media"}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              sandbox={
                isVideoEmbed
                  ? undefined
                  : "allow-same-origin allow-scripts allow-pointer-lock allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
              }
            />
          </div>
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-max text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
          >
            Open in a new tab ↗
          </a>
        </>
      ) : (
        <p className="text-sm font-sans text-muted-foreground">
          Embed unavailable. Add a valid embed URL.
        </p>
      )}
      {section.caption && (
        <p className={CAPTION}>
          {renderRichText(section.caption)}
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

function ImageSlideshow({
  section,
  slides,
  onImageClick,
}: {
  section: ContentSection;
  slides: string[];
  onImageClick: (src: string, caption?: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentSrc = slides[activeIdx] ?? slides[0];
  const currentCaption =
    section.imageCaptions?.[activeIdx]?.trim() || section.caption?.trim() || "";

  const nextSlide = () => setActiveIdx((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`w-full overflow-hidden group relative flex items-center justify-center cursor-pointer select-none border border-border/60 ${
          section.transparent ? "" : "bg-muted/70"
        }`}
        onClick={nextSlide}
        role="region"
        aria-roledescription="carousel"
        aria-label={section.title || "Image slideshow (click to see next image)"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
            e.preventDefault();
            nextSlide();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prevSlide();
          }
        }}
      >
        {/* Subtle click-to-advance hover hint */}
        <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border/60 pointer-events-none">
          Click for next slide →
        </div>

        {/* Expand in lightbox button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick(currentSrc, currentCaption);
          }}
          aria-label="Expand image"
          className="absolute top-3 right-3 z-10 bg-background/90 hover:bg-background text-foreground backdrop-blur-sm px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border border-border/60 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm cursor-zoom-in"
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Expand</span>
        </button>

        {/* Navigation Arrows */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 hover:bg-background text-foreground shadow-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 focus-visible:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 hover:bg-background text-foreground shadow-sm border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 focus-visible:opacity-100"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Slide Counter & Dots */}
        <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div
            className="pointer-events-auto flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/80 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === activeIdx ? "w-6 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"
                }`}
              />
            ))}
            <span className="text-[10px] font-mono font-medium ml-1.5 text-foreground/80 tabular-nums">
              {activeIdx + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Slide Image with AnimatePresence */}
        <div className="w-full flex items-center justify-center min-h-[260px] md:min-h-[380px] p-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full flex items-center justify-center"
            >
              <SafeImage
                src={currentSrc}
                alt={currentCaption || `Slide ${activeIdx + 1}`}
                className="block max-w-full max-h-[50vh] md:max-h-[65vh] w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                loading="lazy"
                fallbackAspect="16 / 9"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {currentCaption && (
        <p className={CAPTION}>
          {renderRichText(currentCaption)}
        </p>
      )}
    </div>
  );
}

function ImageSection({
  section,
  expanded,
  onImageClick,
}: {
  section: ContentSection;
  expanded?: boolean;
  onImageClick: (src: string, caption?: string) => void;
}) {
  const floatIn = useFloatIn();
  const [errored, setErrored] = useState(false);
  const body = pickExpanded(Boolean(expanded), section.body, section.bodyDetail);
  const bullets = pickExpanded(Boolean(expanded), section.bullets, section.bulletsDetail);
  const videoEmbed = section.src ? parseVideoEmbed(section.src) : null;
  const isVideo =
    section.type === "video" ||
    Boolean(videoEmbed) ||
    (!!section.src &&
      (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(section.src) || section.src.startsWith("data:video")));
  const clickable = !errored && !!section.src && !isVideo;
  const isSlideshow = !isVideo && (!!section.slideshow || (Array.isArray(section.images) && section.images.length > 1));
  const rawSlides = section.images && section.images.length > 0 ? section.images : (section.src ? [section.src] : []);
  const slides = rawSlides.map((s) => s.trim()).filter(Boolean);

  if (isSlideshow && slides.length > 1) {
    return (
      <motion.div
        id={`cs-${section.id}`}
        className="flex flex-col gap-3"
        {...floatIn}
      >
        {section.title && (
          <h2 className={SECTION_TITLE}>
            {section.title}
          </h2>
        )}
        <ImageSlideshow
          section={section}
          slides={slides}
          onImageClick={onImageClick}
        />
        {body && (
          <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
            {renderRichText(body)}
          </p>
        )}
        {bullets && bullets.length > 0 && <DashList items={bullets} />}
        <MediaCta href={section.href} linkLabel={section.linkLabel} />
      </motion.div>
    );
  }

  if (isVideo) {
    return (
      <motion.div
        id={`cs-${section.id}`}
        className="flex flex-col gap-3"
        {...floatIn}
      >
        {section.title && (
          <h2 className={SECTION_TITLE}>
            {section.title}
          </h2>
        )}
        {videoEmbed ? (
          <div className="w-full aspect-video overflow-hidden bg-black border border-border">
            <iframe
              src={inlineEmbedUrl(videoEmbed)}
              title={section.caption || section.title || `${embedProviderLabel(videoEmbed)} video`}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <div className={`w-full overflow-hidden ${section.transparent ? "" : "bg-muted"}`}>
            <SectionVideo src={section.src!} loop={!!section.loop} label={section.caption || section.title} />
          </div>
        )}
        {section.caption && (
          <p className={CAPTION}>
            {renderRichText(section.caption)}
          </p>
        )}
        {body && (
          <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
            {renderRichText(body)}
          </p>
        )}
        {bullets && bullets.length > 0 && <DashList items={bullets} />}
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
        <h2 className={SECTION_TITLE}>
          {section.title}
        </h2>
      )}
      <div
        className={`w-full overflow-hidden group relative flex items-center justify-center ${section.transparent ? "" : "bg-muted"} ${clickable ? "cursor-zoom-in" : ""}`}
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
          <div className={`absolute inset-0 transition-colors duration-300 flex items-center justify-center ${section.transparent ? "" : "bg-black/0 group-hover:bg-black/15"}`}>
            <span className={EXPAND_HINT}>Expand</span>
          </div>
        )}
      </div>
      {section.caption && (
        <p className={CAPTION}>
          {renderRichText(section.caption)}
        </p>
      )}
      {body && (
        <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
          {renderRichText(body)}
        </p>
      )}
      {bullets && bullets.length > 0 && <DashList items={bullets} />}
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
        className="flex flex-col gap-6"
        {...floatIn}
      >
        {title && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h2 className={SECTION_TITLE}>{title}</h2>
          </div>
        )}
        <div className={`grid gap-6 md:gap-8 items-stretch ${problem && solution ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {problem && <ProblemCard text={problem} />}
          {solution && <SolutionCard text={solution} />}
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
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {title && <h2 className={SECTION_TITLE}>{renderRichText(title)}</h2>}
          {summary && (
            <p className="max-w-3xl text-foreground text-lg md:text-2xl leading-snug tracking-tight">
              {renderRichText(summary)}
            </p>
          )}
        </div>
      )}
      {body && (
        <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">
          {renderRichText(body)}
        </p>
      )}
      {bullets && bullets.length > 0 && <DashList items={bullets} />}
      {section.body2 && (
        <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed mt-1 whitespace-pre-line">
          {renderRichText(section.body2)}
        </p>
      )}
      {section.bullets2 && section.bullets2.length > 0 && <DashList items={section.bullets2} />}
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
          <div className="border-t border-border pt-4">
            <h3 className={SECTION_TITLE}>Overview</h3>
          </div>
          <p className="max-w-3xl text-foreground/80 text-base md:text-lg leading-relaxed whitespace-pre-line">{renderRichText(project.description)}</p>
          {project.bullets && project.bullets.length > 0 && <DashList items={project.bullets} />}
        </motion.div>
      )}
      {(project.challenge || project.solution) && (
        <motion.div
          className={`grid gap-6 md:gap-8 items-stretch ${project.challenge && project.solution ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
          {...floatIn}
        >
          {project.challenge && <ProblemCard text={project.challenge} />}
          {project.solution && <SolutionCard text={project.solution} />}
        </motion.div>
      )}
      {project.impact && (
        <motion.div
          className="flex flex-col gap-4 border-t border-border pt-4"
          {...floatIn}
        >
          <Eyebrow>Impact</Eyebrow>
          <p className="max-w-4xl text-foreground text-xl md:text-3xl leading-snug tracking-tight whitespace-pre-line">{renderRichText(project.impact)}</p>
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
  const { project, gate, access, unlock, retry, viewAsVisitor } = useFullProject(
    visibleProjects[currentIdx],
  );
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

  const lenis = useLenis();
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`cs-${id}`);
    if (el) scrollPageTo(lenis, el, { smooth: true });
  }, [lenis]);

  if (!project) {
    return (
      <div className="min-h-[60vh] flex flex-col items-start justify-center gap-4">
        <Eyebrow>404</Eyebrow>
        <p className="font-display font-black uppercase tracking-tight text-3xl text-foreground">Project not found</p>
        <Link href="/work" className={STATE_LINK}>← Back to Work</Link>
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
      <div className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS} animate-pulse`} role="status" aria-label="Loading case study">
        <div className="flex flex-col gap-3">
          <div className="h-3 w-24 bg-muted" />
          <div className="h-3 w-32 bg-muted" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-14 w-3/4 bg-muted" />
          <div className="h-4 w-full bg-muted" />
          <div className="h-4 w-5/6 bg-muted" />
          <div className="w-full bg-muted" style={{ aspectRatio: "16/7" }} />
        </div>
        <span className="sr-only">Loading case study…</span>
      </div>
    );
  }

  if (gate.status === "error") {
    return (
      <div className="min-h-[60vh] flex flex-col items-start justify-center gap-4">
        <Eyebrow>Something went wrong</Eyebrow>
        <p className="max-w-xl text-lg text-foreground">{gate.message}</p>
        <div className="flex gap-6">
          <button type="button" onClick={retry} className={STATE_LINK}>
            Try again
          </button>
          <Link href="/work" className={STATE_LINK}>← Back to Work</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-16 md:gap-24">
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

      {(access === "admin" || access === "unlock") && (
        <ProtectedAccessNotice access={access} onViewAsVisitor={viewAsVisitor} />
      )}

      {/* ── Hero: index + bio on the left, title-led header & specs on the right ── */}
      <section className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}>
        <motion.aside
          className="order-2 md:order-1 flex flex-col gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: BRAND_EASE }}
        >
          <div className="hidden md:flex flex-col gap-2">
            <Link href="/work" className={`w-max ${STATE_LINK}`}>
              ← All work
            </Link>
            {currentIdx >= 0 && (
              <Eyebrow>
                Case study {pad2(currentIdx + 1)} / {pad2(visibleProjects.length)}
              </Eyebrow>
            )}
          </div>

          {(project.tags ?? []).length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              <span className={META_LABEL}>Disciplines</span>
              <div className="flex flex-wrap gap-1.5">
                {(project.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2 py-0.5 text-xs bg-muted border border-border/80 text-foreground/85 font-medium rounded-none"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {`I'm ${(identityData.name || "").trim().split(/\s+/)[0] || "there"}. I help shape ideas into products.`}
            </p>
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {socials.map((s) => (
                  <a
                    key={s.title}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground hover:text-primary transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </motion.aside>

        <motion.div
          className="order-1 md:order-2 flex flex-col gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: BRAND_EASE }}
        >
          <Link href="/work" className={`md:hidden w-max ${STATE_LINK}`}>
            ← All work
          </Link>
          <h1 className="font-display font-black uppercase text-foreground leading-[0.9] tracking-tight break-words [overflow-wrap:anywhere] text-[clamp(2.5rem,6vw,6rem)]">
            {project.title}
          </h1>

          {project.subtitle && (
            <p className="max-w-3xl text-foreground/75 text-lg md:text-2xl leading-snug tracking-tight">
              {renderRichText(project.subtitle)}
            </p>
          )}

          {project.bullets && project.bullets.length > 0 && <DashList items={project.bullets} />}

          {project.liveUrl?.trim() && isSafeCtaHref(project.liveUrl.trim()) && (
            <a
              href={project.liveUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 ${OUTLINE_BUTTON}`}
            >
              View live site
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">↗</span>
            </a>
          )}

          {/* ── Project Specifications Strip across the main column ── */}
          <div className="mt-4 pt-6 border-t border-border flex flex-col gap-5">
            {/* Row 1: Role & Period/Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <span className={META_LABEL}>Role</span>
                <span className={META_VALUE}>{project.type}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className={META_LABEL}>{project.period ? "Period" : "Year"}</span>
                <span className={META_VALUE}>{project.period ?? project.year}</span>
              </div>
            </div>

            {/* Row 2: Users & Methods (50/50 width, giving ample room to prevent vertical elongation) */}
            {(project.users?.trim() || project.methods?.trim()) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/60">
                {project.users?.trim() && (
                  <div className="flex flex-col gap-1">
                    <span className={META_LABEL}>Users</span>
                    <span className={META_VALUE}>{project.users}</span>
                  </div>
                )}
                {project.methods?.trim() && (
                  <div className="flex flex-col gap-1">
                    <span className={META_LABEL}>Methods</span>
                    <span className={META_VALUE}>{project.methods}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {(project.heroImage?.trim() || project.coverImage) && (
        <CaseStudyCover
          key={project.slug}
          project={project}
          onExpand={() => {
            const src = project.heroImage?.trim() || project.coverImage;
            const mime = project.heroImage?.trim() ? project.heroImageMime : project.coverMime;
            setLightbox({ src, caption: project.title, mime });
          }}
        />
      )}

      {/* ── TOC sidebar + content ── */}
      <div className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}>

        {/* Sticky table of contents */}
        <aside
          data-lenis-prevent
          className="flex flex-col gap-6 md:sticky md:top-[calc(var(--chrome-h)+1rem)] md:self-start md:max-h-[calc(100svh-var(--chrome-h)-2rem)] md:overflow-y-auto"
        >
          {tocItems.length > 1 && (
            <nav aria-label="Case study contents" className="flex flex-col">
              <Eyebrow className="mb-2">Contents</Eyebrow>
              {tocItems.map((item, i) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`group/toc grid grid-cols-[1.75rem_1fr] items-baseline gap-2 py-1.5 border-t border-border text-left text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-[11px] tabular-nums">
                      {isActive ? "→" : pad2(i + 1)}
                    </span>
                    <span className="min-w-0 truncate">{stripRichText(item.title)}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex flex-col gap-14 md:gap-20">
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
              className="flex flex-col items-start gap-3 pt-5 border-t border-border"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: BRAND_EASE }}
            >
              <Link
                href={showDetail ? `/work/${project.slug}` : `/work/${project.slug}/full`}
                id="cs-detail-toggle"
                className={OUTLINE_BUTTON}
              >
                {showDetail ? "Show less" : "See more detail"}
                <span aria-hidden="true">{showDetail ? "↑" : "↓"}</span>
              </Link>
              <p className="text-muted-foreground text-xs max-w-md">
                {showDetail
                  ? "Full case study with research, Figma system, and product deep-dive."
                  : "Skim version (~5 min). Expand for research, video, and more detail."}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Prev / Next ── */}
      <nav aria-label="More case studies" className={`grid gap-8 ${SPLIT_COLUMNS} border-t border-border pt-10`}>
        <div className="flex flex-col gap-2">
          <Eyebrow>Keep reading</Eyebrow>
          <p className="text-xs text-muted-foreground">
            Explore more product design & research case studies
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
          {prevProject ? (
            <ProjectNavCard project={prevProject} direction="prev" />
          ) : (
            <div className="hidden sm:block" />
          )}
          {nextProject ? (
            <ProjectNavCard project={nextProject} direction="next" />
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
      </nav>
    </div>
  );
}
