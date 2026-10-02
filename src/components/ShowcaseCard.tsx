import { memo, useCallback, useEffect, useRef, useState } from "react";
import { CoverMedia } from "@/components/CoverMedia";
import { BRAND, BRAND_TEXT } from "@/lib/brand";

/** Delay before cover image swaps to hover preview video (ms). */
const HOVER_VIDEO_DELAY_MS = 650;

export type ShowcaseCardProject = {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  year: string;
  tags: string[];
  type: string;
  subtitle?: string;
  cardDescription?: string;
  href?: string;
  /** Short loop shown after a long hover on the cover. */
  hoverVideo?: string;
  /** External live product URL (opens in a new tab from the card meta). */
  liveUrl?: string;
};

const TILTS = [-2.4, 2.1, -1.6, 2.8, -2.0, 1.8] as const;

type Props = {
  project: ShowcaseCardProject;
  i: number;
  isDark?: boolean;
  /** Landscape case-study frame (image + copy side-by-side). */
  layout?: "landscape" | "portrait";
  className?: string;
};

export const ShowcaseCard = memo(function ShowcaseCard({
  project,
  i,
  isDark = false,
  layout = "landscape",
  className = "",
}: Props) {
  const href = project.href ?? `/work/${project.slug}`;
  const description = project.cardDescription || project.subtitle || "";
  const tilt = TILTS[i % TILTS.length];
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const hasHoverVideo = Boolean(project.hoverVideo?.trim());

  const clearHoverTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVideo = useCallback(() => {
    clearHoverTimer();
    setShowVideo(false);
    const v = videoRef.current;
    if (v) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* ignore seek errors on unloaded media */
      }
    }
  }, [clearHoverTimer]);

  const onEnter = useCallback(() => {
    if (!hasHoverVideo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearHoverTimer();
    timerRef.current = setTimeout(() => {
      setShowVideo(true);
      const v = videoRef.current;
      if (v) {
        void v.play().catch(() => {
          /* autoplay may be blocked — keep poster */
        });
      }
    }, HOVER_VIDEO_DELAY_MS);
  }, [hasHoverVideo, clearHoverTimer]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  const frameBg = isDark ? "rgba(28,24,20,0.96)" : "#FFFEFA";
  const ink = isDark ? "rgba(255,252,245,0.92)" : "#1A1814";
  const mute = isDark ? "rgba(255,252,245,0.55)" : "rgba(26,24,20,0.55)";

  return (
    <a
      href={href}
      className={`showcase-card group relative flex shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 ${className}`}
      style={{
        outlineColor: BRAND.blue,
        transform: `rotate(${tilt}deg)`,
        background: frameBg,
        padding: layout === "landscape" ? "14px 14px 18px" : "12px 12px 16px",
        borderRadius: layout === "landscape" ? 4 : 14,
        boxShadow: isDark
          ? "-10px 14px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)"
          : "-10px 12px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        width: layout === "landscape" ? "min(860px, 88vw)" : "min(320px, 78vw)",
      }}
      onMouseEnter={onEnter}
      onMouseLeave={stopVideo}
      onFocus={onEnter}
      onBlur={stopVideo}
      tabIndex={0}
    >
      <div
        className={
          layout === "landscape"
            ? "flex flex-col sm:flex-row gap-4 sm:gap-5 w-full min-h-0"
            : "flex flex-col gap-3 w-full"
        }
      >
        {/* Media pane — rounded inset, never clipped by outer put-frame */}
        <div
          className="relative overflow-hidden bg-muted/40"
          style={{
            borderRadius: layout === "landscape" ? 2 : 8,
            width: layout === "landscape" ? undefined : "100%",
            flex: layout === "landscape" ? "1 1 62%" : undefined,
            aspectRatio: layout === "landscape" ? "4 / 3" : "16 / 10",
            minHeight: layout === "landscape" ? 220 : undefined,
          }}
          onMouseEnter={onEnter}
          onMouseLeave={stopVideo}
        >
          {project.coverImage ? (
            <CoverMedia
              src={project.coverImage}
              alt={project.title}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                showVideo ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${BRAND.blue}33, ${BRAND.coral}22)`,
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

          {/* Soft sheen on hover */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
            }}
          />
        </div>

        {/* Copy pane */}
        <div
          className={
            layout === "landscape"
              ? "flex flex-col justify-between gap-3 flex-[1_1_38%] min-w-0 py-1 pr-1"
              : "flex flex-col gap-1.5 min-w-0 px-0.5"
          }
        >
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] uppercase tracking-[0.18em] font-sans font-bold"
                style={{ color: BRAND_TEXT.blue }}
              >
                {project.type}
              </span>
              {project.year ? (
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: mute }}
                >
                  {project.year}
                </span>
              ) : null}
            </div>
            <h3
              className="font-display font-black uppercase leading-[1.05] tracking-tight text-xl sm:text-2xl"
              style={{ color: ink }}
            >
              {project.title}
            </h3>
            {description ? (
              <p
                className="text-sm font-sans leading-relaxed line-clamp-3"
                style={{ color: mute }}
              >
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-3 mt-auto">
            <div className="flex flex-wrap gap-1.5">
              {(project.tags ?? []).slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] uppercase tracking-wider font-sans font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color: BRAND_TEXT.blue,
                    background: `${BRAND.blue}14`,
                    border: `1px solid ${BRAND.blue}30`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            {project.liveUrl ? (
              <span
                className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold whitespace-nowrap"
                style={{ color: BRAND_TEXT.coral }}
              >
                Live →
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </a>
  );
});
