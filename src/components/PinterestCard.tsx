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
  description?: string;
  users?: string;
  methods?: string;
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
  showDetails = true,
  showSubtitle = true,
  showDescription = true,
  showMetadataStrip = true,
  detailsPlacement = "below",
}: {
  project: PinterestCardProject;
  i: number;
  isDark: boolean;
  featured?: boolean;
  /** Tailwind aspect/size classes for a single-column card cell. */
  aspectClass?: string;
  /** Whether to show subtitle, description, and metadata strip ("show" vs "not showing"). */
  showDetails?: boolean;
  /** Whether to show subtitle when details are enabled. */
  showSubtitle?: boolean;
  /** Whether to show description when details are enabled. */
  showDescription?: boolean;
  /** Whether to show metadata strip when details are enabled. */
  showMetadataStrip?: boolean;
  /** Placement: "below" (underneath card image) or "overlay" (inside card). */
  detailsPlacement?: "below" | "overlay";
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
  const isBelow = showDetails && detailsPlacement === "below";
  const isOverlay = showDetails && detailsPlacement === "overlay";
  const effectiveDescription = project.cardDescription || project.description || "";

  // The inner media box containing image, video, overlays, and badges
  const mediaInner = (
    <>
      {/* Cover image / video */}
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

      {/* Bottom gradient (only needed when text is overlaid on the cover) */}
      {!isBelow && (
        <>
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
        </>
      )}

      {/* Subtle border — sharp corners following brand guidelines */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-none pointer-events-none transition-all duration-500"
        style={{ border: `1px solid rgba(${rgb}, 0.15)` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-none pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500"
        style={{
          border: `1.5px solid rgba(${glowA}, 0.4)`,
          boxShadow: `0 0 48px rgba(${glowA}, 0.16), 0 0 90px rgba(${glowB}, 0.10)`,
        }}
      />

      {/* Top badges: Protected lock & Play indicator — sharp corner blocks */}
      {(project.protected || playOnHover) ? (
        <div className="absolute top-4 left-4 right-4 flex items-start justify-end gap-2 z-10 pointer-events-none">
          {project.protected ? (
            <span
              className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase tracking-wide font-sans font-bold px-2.5 py-1.5 backdrop-blur-sm whitespace-nowrap leading-none shrink-0 rounded-none border border-foreground/15"
              style={badgeStyle}
            >
              <Lock className="w-2.5 h-2.5" aria-hidden="true" />
              Protected
            </span>
          ) : null}
          {playOnHover ? (
            <span
              className={`hidden [@media(hover:hover)]:flex items-center justify-center w-6 h-6 rounded-none backdrop-blur-sm shrink-0 transition-opacity duration-300 border border-foreground/15 ${
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

      {/* Inside-Card Overlay Mode (when not showing details below) */}
      {!isBelow && (
        <div
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end gap-1.5 px-4 sm:px-5 pb-5 sm:pb-6 pt-24 pointer-events-none w-full ${
            horizontal ? "sm:max-w-[85%]" : ""
          }`}
        >
          <h3 className="w-full font-display font-black uppercase text-sm sm:text-base md:text-lg lg:text-xl leading-[1.15] tracking-[0.02em] text-white line-clamp-2 break-words [overflow-wrap:anywhere]">
            {project.title}
          </h3>

          {isOverlay && (
            <div className="flex flex-col gap-1.5 pt-1">
              {showSubtitle && project.subtitle ? (
                <p className="text-xs font-sans text-white/90 font-medium leading-snug line-clamp-2">
                  {project.subtitle}
                </p>
              ) : null}

              {showDescription && effectiveDescription ? (
                <p className="text-xs font-sans text-white/75 leading-relaxed line-clamp-2">
                  {effectiveDescription}
                </p>
              ) : null}

              {showMetadataStrip && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {project.type ? (
                    <span className="text-[9px] uppercase tracking-wider font-sans font-bold px-2 py-0.5 bg-white/20 text-white backdrop-blur-sm rounded-none border border-white/20">
                      {project.type}
                    </span>
                  ) : null}
                  {project.year ? (
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-white/15 text-white/90 backdrop-blur-sm rounded-none border border-white/15">
                      {project.year}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="group relative flex flex-col h-full">
      {/* Dual-tone feathered ambient glow under card (compositor-friendly radial gradient) */}
      <div
        aria-hidden="true"
        className="card-glow absolute -inset-12 rounded-none pointer-events-none transition-opacity duration-500 opacity-55 group-hover:opacity-100 group-focus-within:opacity-100"
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
        className="group/card relative z-10 flex flex-col cursor-pointer w-full h-full focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          outlineColor: accent,
        }}
        tabIndex={0}
        onMouseEnter={onEnter}
        onMouseLeave={stopVideo}
        onFocus={onEnter}
        onBlur={stopVideo}
      >
        {/* ── Media Card Container (Equal height across horizontal & vertical) ── */}
        {horizontal ? (
          <div className="relative w-full sm:grid sm:grid-cols-2 sm:gap-x-[var(--card-grid-gap,2rem)] shrink-0">
            {/* Phantom column 1 spacer: forces row height to EXACTLY aspectClass of a single column */}
            <div
              aria-hidden="true"
              className={`hidden sm:block col-start-1 row-start-1 ${aspectClass} pointer-events-none opacity-0 invisible`}
            />
            {/* Actual 2-column wide media container spanning both columns and filling row 1 (100% height) */}
            <div
              className={`relative rounded-none overflow-hidden shrink-0 transition-shadow duration-500 sm:col-start-1 sm:col-span-2 sm:row-start-1 w-full h-full max-sm:${aspectClass}`}
              style={{
                boxShadow: isDark
                  ? `0 18px 50px -12px rgba(${glowA},0.26), 0 0 60px -8px rgba(${glowB},0.18)`
                  : `0 16px 44px -12px rgba(${glowA},0.18), 0 0 48px -8px rgba(${glowB},0.12)`,
              }}
            >
              {mediaInner}
            </div>
          </div>
        ) : (
          <div
            className={`relative rounded-none overflow-hidden shrink-0 transition-shadow duration-500 w-full ${aspectClass}`}
            style={{
              boxShadow: isDark
                ? `0 18px 50px -12px rgba(${glowA},0.26), 0 0 60px -8px rgba(${glowB},0.18)`
                : `0 16px 44px -12px rgba(${glowA},0.18), 0 0 48px -8px rgba(${glowB},0.12)`,
            }}
          >
            {mediaInner}
          </div>
        )}

        {/* ── Below the Project Card Details ───────────────────────────── */}
        {isBelow && (
          <div className="mt-3.5 flex flex-col gap-2 min-w-0 flex-1">
            {/* Title & Year */}
            <div className="flex items-baseline justify-between gap-3 min-w-0">
              <h3 className="font-display font-black uppercase text-base sm:text-lg lg:text-xl leading-[1.15] tracking-[0.02em] text-foreground group-hover/card:text-primary transition-colors duration-300 truncate">
                {project.title}
              </h3>
              {project.year ? (
                <span className="text-xs font-mono font-bold text-muted-foreground shrink-0 tabular-nums">
                  {project.year}
                </span>
              ) : null}
            </div>

            {/* Subtitle */}
            {showSubtitle && project.subtitle ? (
              <p className="text-xs sm:text-[13px] font-sans font-medium text-foreground/80 leading-snug line-clamp-2">
                {project.subtitle}
              </p>
            ) : null}

            {/* Description */}
            {showDescription && effectiveDescription ? (
              <p className="text-xs font-sans text-muted-foreground leading-relaxed line-clamp-2">
                {effectiveDescription}
              </p>
            ) : null}

            {/* Metadata strip (Role · Users · Methods / Tags) — Sharp corner blocks following brand guidelines */}
            {showMetadataStrip && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 mt-auto">
                {project.type ? (
                  <span
                    className="text-[9px] uppercase tracking-wider font-sans font-bold px-2.5 py-0.5 rounded-none border shadow-none"
                    style={{
                      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",
                      borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
                    }}
                  >
                    {project.type}
                  </span>
                ) : null}

                {project.users ? (
                  <span className="text-[10px] font-sans text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-none border border-border/60">
                    <span className="text-foreground/75 font-semibold">Users:</span> {project.users}
                  </span>
                ) : null}

                {project.methods ? (
                  <span className="text-[10px] font-sans text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-none border border-border/60">
                    <span className="text-foreground/75 font-semibold">Methods:</span> {project.methods}
                  </span>
                ) : null}

                {!project.users && !project.methods && project.tags && project.tags.length > 0
                  ? project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] uppercase tracking-wider font-sans font-bold px-2 py-0.5 rounded-none border"
                        style={{
                          background: `rgba(${rgb}, 0.12)`,
                          color: `rgba(${rgb}, 0.95)`,
                          borderColor: `rgba(${rgb}, 0.28)`,
                        }}
                      >
                        {tag}
                      </span>
                    ))
                  : null}
              </div>
            )}
          </div>
        )}
      </a>
    </div>
  );
});
