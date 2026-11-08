import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Lock, Play } from "lucide-react";
import { CoverMedia, isPlayableCover, type CoverPlayback } from "@/components/CoverMedia";
import { BRAND_DECK, BRAND_RGB } from "@/lib/brand";
import type { CardLayout } from "@/components/admin/types";

const ACCENTS = BRAND_DECK;
const ACCENT_RGB = BRAND_RGB;
const HOVER_VIDEO_DELAY_MS = 650;

/** Dual-tone glow pairs — assigned per card for variety */
const GLOW_PAIRS: [string, string][] = [
  ["236,72,153", "31,103,241"], // pink + blue
  ["31,103,241", "139,92,246"], // blue + purple
  ["139,92,246", "239,68,68"], // purple + red
  ["236,72,153", "139,92,246"], // pink + purple
];

export type PinterestCardProject = {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  coverMime?: string;
  coverPoster?: string;
  /** Video covers only. Defaults to "loop". */
  coverPlayback?: CoverPlayback;
  year: string;
  tags: string[];
  /** Badge text (Work `type` or Studio `role`). */
  type: string;
  subtitle?: string;
  cardDescription?: string;
  /** Defaults to `/work/${slug}`. Use `/studio/${slug}` for gallery items. */
  href?: string;
  /** Short muted loop after a long hover on the cover. */
  hoverVideo?: string;
  liveUrl?: string;
  /** "horizontal" fills two grid columns plus the gap between them. */
  cardLayout?: CardLayout;
  /** Password-protected case study — shows a lock badge. */
  protected?: boolean;
};

/**
 * Grid item class so a horizontal card spans two columns.
 * `from` must match the breakpoint where the parent grid first has 2 columns.
 */
export function cardSpanClass(
  project: Pick<PinterestCardProject, "cardLayout">,
  from: "sm" | "md" = "sm",
) {
  if (project.cardLayout !== "horizontal") return "";
  return from === "md" ? "md:col-span-2" : "sm:col-span-2";
}

function glowSeed(slug: string, i: number) {
  let h = i * 2654435761;
  for (let c = 0; c < slug.length; c++) {
    h = (h * 31 + slug.charCodeAt(c)) | 0;
  }
  return Math.abs(h);
}

export const PinterestCard = memo(function PinterestCard({
  project,
  i,
  isDark,
  aspectClass = "aspect-[4/5]",
}: {
  project: PinterestCardProject;
  i: number;
  isDark: boolean;
  featured?: boolean;
  /** Tailwind aspect/size classes for a single-column card cell. */
  aspectClass?: string;
}) {
  const accent = ACCENTS[i % ACCENTS.length];
  const rgb = ACCENT_RGB[accent] ?? "31,103,241";
  const seed = glowSeed(project.slug, i);
  const pair = GLOW_PAIRS[seed % GLOW_PAIRS.length];
  const [glowA, glowB] = seed % 2 === 0 ? pair : [pair[1], pair[0]];
  const badgeStyle = {
    background: isDark ? "rgba(20,18,15,0.7)" : "rgba(255,252,245,0.8)",
    color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)",
  } as const;
  const href = project.href ?? `/work/${project.slug}`;
  const hasHoverVideo = Boolean(project.hoverVideo?.trim());
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [hovered, setHovered] = useState(false);
  const playOnHover =
    isPlayableCover(project.coverImage, project.coverMime) &&
    project.coverPlayback === "hover" &&
    !hasHoverVideo;

  const clearHoverTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVideo = useCallback(() => {
    clearHoverTimer();
    setHovered(false);
    setShowVideo(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [clearHoverTimer]);

  const onEnter = useCallback(() => {
    setHovered(true);
    if (!hasHoverVideo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearHoverTimer();
    timerRef.current = setTimeout(() => {
      setShowVideo(true);
      void videoRef.current?.play().catch(() => {});
    }, HOVER_VIDEO_DELAY_MS);
  }, [hasHoverVideo, clearHoverTimer]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  const horizontal = project.cardLayout === "horizontal";

  return (
    <div
      className={
        horizontal
          ? "group relative grid grid-cols-2 gap-x-[var(--card-grid-gap,2rem)]"
          : "group relative"
      }
    >
      {horizontal ? (
        <div aria-hidden="true" className={`col-start-1 row-start-1 ${aspectClass}`} />
      ) : null}
      {/* Dual-tone feathered ambient glow under card (compositor-friendly radial gradient without per-frame blur/SVG filter rasterization) */}
      <div
        aria-hidden="true"
        className="card-glow absolute -inset-12 rounded-[1.5rem] pointer-events-none transition-opacity duration-500 opacity-55 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 65% 60% at 32% 55%, rgba(${glowA},0.28) 0%, rgba(${glowA},0.08) 45%, transparent 72%),
               radial-gradient(ellipse 65% 60% at 68% 58%, rgba(${glowB},0.24) 0%, rgba(${glowB},0.07) 45%, transparent 72%)`
            : `radial-gradient(ellipse 65% 60% at 32% 55%, rgba(${glowA},0.18) 0%, rgba(${glowA},0.05) 45%, transparent 72%),
               radial-gradient(ellipse 65% 60% at 68% 58%, rgba(${glowB},0.15) 0%, rgba(${glowB},0.04) 45%, transparent 72%)`,
          zIndex: 0,
        }}
      />

      <a
        href={href}
        className={`group/card relative z-10 flex flex-col rounded-lg overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
          horizontal ? "col-start-1 col-span-2 row-start-1" : aspectClass
        }`}
        style={{
          outlineColor: accent,
          boxShadow: isDark
            ? `0 18px 50px -12px rgba(${glowA},0.26), 0 0 60px -8px rgba(${glowB},0.18)`
            : `0 16px 44px -12px rgba(${glowA},0.18), 0 0 48px -8px rgba(${glowB},0.12)`,
        }}
        tabIndex={0}
        onMouseEnter={onEnter}
        onMouseLeave={stopVideo}
        onFocus={onEnter}
        onBlur={stopVideo}
      >
        {/* ── Full-bleed cover image ───────────────────────────── */}
        <div className="absolute inset-0">
          {project.coverImage ? (
            <CoverMedia
              src={project.coverImage}
              alt={project.title}
              loading="lazy"
              mimeHint={project.coverMime}
              poster={project.coverPoster}
              playback={project.coverPlayback}
              active={hovered && !showVideo}
              className={`w-full h-full object-cover transition-[transform,opacity] duration-700 group-hover:scale-[1.04] group-focus-within:scale-[1.04] ${
                showVideo ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: isDark
                  ? "linear-gradient(160deg, hsl(30 11% 10%), hsl(30 11% 5%))"
                  : "linear-gradient(160deg, hsl(30 12% 92%), hsl(30 12% 85%))",
              }}
            />
          )}
          {hasHoverVideo ? (
            <video
              ref={videoRef}
              src={project.hoverVideo}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden={!showVideo}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                showVideo ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}
        </div>

        {/* ── Bottom gradient — soft, just for type contrast ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 38%, transparent 68%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 42%, transparent 72%)",
          }}
        />

        {/* ── Subtle border ─────────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg pointer-events-none transition-all duration-500"
          style={{ border: `1px solid rgba(${rgb}, 0.15)` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500"
          style={{
            border: `1.5px solid rgba(${glowA}, 0.4)`,
            boxShadow: `0 0 48px rgba(${glowA}, 0.16), 0 0 90px rgba(${glowB}, 0.10)`,
          }}
        />

        {/* ── Top badges: Protected lock & Play indicator only (no role, no year, no number) ── */}
        {(project.protected || playOnHover) ? (
          <div className="absolute top-4 left-4 right-4 flex items-start justify-end gap-2 z-10 pointer-events-none">
            {project.protected ? (
              <span
                className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase tracking-wide font-sans font-bold px-2.5 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap leading-none shrink-0"
                style={badgeStyle}
              >
                <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                Protected
              </span>
            ) : null}
            {playOnHover ? (
              <span
                className={`hidden [@media(hover:hover)]:flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm shrink-0 transition-opacity duration-300 ${
                  hovered ? "opacity-0" : "opacity-100"
                }`}
                style={badgeStyle}
                aria-hidden="true"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
              </span>
            ) : null}
          </div>
        ) : null}

        {/* ── Bottom title block: spread out to 1-2 lines with no role or description ── */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end px-4 sm:px-5 pb-5 sm:pb-6 pt-24 pointer-events-none w-full ${
            horizontal ? "sm:max-w-[85%]" : ""
          }`}
        >
          <h3 className="w-full font-display font-black uppercase text-sm sm:text-base md:text-lg lg:text-xl leading-[1.15] tracking-[0.02em] text-white line-clamp-2 break-words [overflow-wrap:anywhere]">
            {project.title}
          </h3>
        </div>
      </a>
    </div>
  );
});
