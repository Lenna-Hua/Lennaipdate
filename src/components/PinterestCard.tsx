import { memo, useCallback, useEffect, useRef, useState } from "react";
import { CoverMedia } from "@/components/CoverMedia";
import { BRAND_DECK, BRAND_RGB } from "@/lib/brand";

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

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const BLOB_ANIMS = [
  "entry-blob-drift-1 11s ease-in-out infinite",
  "entry-blob-drift-2 13s ease-in-out infinite",
  "entry-blob-drift-3 10s ease-in-out infinite",
] as const;

export type PinterestCardProject = {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
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
};

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
}: {
  project: PinterestCardProject;
  i: number;
  isDark: boolean;
  featured?: boolean;
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
  const description = project.cardDescription || project.subtitle || "";
  const tags = project.tags ?? [];
  const hasHoverVideo = Boolean(project.hoverVideo?.trim());
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVideo, setShowVideo] = useState(false);

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
        /* ignore */
      }
    }
  }, [clearHoverTimer]);

  const onEnter = useCallback(() => {
    if (!hasHoverVideo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearHoverTimer();
    timerRef.current = setTimeout(() => {
      setShowVideo(true);
      void videoRef.current?.play().catch(() => {});
    }, HOVER_VIDEO_DELAY_MS);
  }, [hasHoverVideo, clearHoverTimer]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  return (
    <div className="group relative">
      {/* Dual-tone floating grain glow — high-feather gradient blur under card */}
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-[2.5rem] pointer-events-none transition-opacity duration-700 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 70% 65% at 30% 55%, rgba(${glowA},0.38) 0%, rgba(${glowA},0.12) 35%, transparent 70%),
               radial-gradient(ellipse 70% 65% at 70% 60%, rgba(${glowB},0.34) 0%, rgba(${glowB},0.10) 35%, transparent 70%)`
            : `radial-gradient(ellipse 70% 65% at 30% 55%, rgba(${glowA},0.24) 0%, rgba(${glowA},0.08) 35%, transparent 70%),
               radial-gradient(ellipse 70% 65% at 70% 60%, rgba(${glowB},0.20) 0%, rgba(${glowB},0.06) 35%, transparent 70%)`,
          filter: "blur(56px)",
          zIndex: 0,
          animation: BLOB_ANIMS[seed % BLOB_ANIMS.length],
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] pointer-events-none mix-blend-overlay transition-opacity duration-700 opacity-25 group-hover:opacity-45 group-focus-within:opacity-45"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 75% 65% at 50% 55%, rgba(255,255,255,0.55) 0%, transparent 70%),
            ${GRAIN_SVG}
          `,
          backgroundSize: "100% 100%, 128px 128px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 55%, black 0%, transparent 75%)",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 55%, black 0%, transparent 75%)",
          filter: "blur(2px)",
          zIndex: 0,
        }}
      />

      <a
        href={href}
        className="group/card relative z-10 flex flex-col rounded-2xl overflow-hidden cursor-pointer aspect-[4/5] focus-visible:outline-2 focus-visible:outline-offset-2"
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
          className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500"
          style={{ border: `1px solid rgba(${rgb}, 0.15)` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500"
          style={{
            border: `1.5px solid rgba(${glowA}, 0.4)`,
            boxShadow: `0 0 48px rgba(${glowA}, 0.16), 0 0 90px rgba(${glowB}, 0.10)`,
          }}
        />

        {/* ── Top badges — inset past rounded corners so pills aren’t clipped ── */}
        <div className="absolute top-4 left-4 right-4 flex items-start gap-2 z-10 pointer-events-none">
          <span
            className="text-[8px] sm:text-[9px] uppercase tracking-wide font-sans font-bold px-2.5 py-1.5 rounded-full backdrop-blur-sm leading-tight min-w-0 max-w-[70%] line-clamp-2"
            style={badgeStyle}
          >
            {project.type}
          </span>
          <span
            className="text-[8px] sm:text-[9px] font-mono font-bold px-2.5 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap leading-none shrink-0 ml-auto"
            style={badgeStyle}
          >
            {project.year}
          </span>
        </div>

        {/* ── Unified type block: title → description → tags ── */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end gap-2 px-4 sm:px-5 pb-5 sm:pb-6 pt-24 pointer-events-none">
          <h3 className="font-display font-black uppercase text-sm sm:text-base md:text-lg leading-[1.15] tracking-[0.03em] text-white line-clamp-3 break-words [overflow-wrap:anywhere]">
            {project.title}
          </h3>

          <div
            className="flex flex-col gap-2 max-h-0 opacity-0 overflow-hidden
            group-hover:max-h-28 group-hover:opacity-100
            group-focus-within:max-h-28 group-focus-within:opacity-100
            transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
            motion-reduce:max-h-28 motion-reduce:opacity-100 motion-reduce:transition-none"
          >
            {description ? (
              <p className="text-xs font-sans text-white/75 leading-relaxed line-clamp-2">
                {description}
              </p>
            ) : null}

            <div className="flex items-center gap-1.5 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] uppercase tracking-wider font-sans font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `rgba(${rgb}, 0.25)`,
                    color: "rgba(255,255,255,0.85)",
                    border: `1px solid rgba(${rgb}, 0.35)`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </a>
    </div>
  );
});
