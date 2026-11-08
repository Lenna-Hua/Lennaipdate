import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { CoverMedia, type CoverPlayback } from "@/components/CoverMedia";
import { embedAspect, parseVideoEmbed } from "@/lib/video-embed";

export type MasonryItem = {
  id: string;
  src: string;
  title: string;
  shortTitle?: string;
  hoverVideo?: string;
  meta?: string;
  mime?: string;
  poster?: string;
  playback?: CoverPlayback;
  /** Navigates on click. Items without `href` open the lightbox when `onOpen` is given. */
  href?: string;
  subtitle?: string;
  role?: string;
  year?: string;
  protected?: boolean;
};

export type MasonrySize = "md" | "lg" | "xl";

/* Breakpoints, widest first. Tier index 0 = xl screens, 1 = md screens, 2 = mobile. */
const TIER_QUERIES = ["(min-width: 1280px)", "(min-width: 768px)"];

/* Columns per tier for each card size: fewer columns = bigger cards. */
const COLUMNS_BY_SIZE: Record<MasonrySize, [number, number, number]> = {
  md: [3, 2, 1],
  lg: [2, 2, 1],
  xl: [2, 1, 1],
};

function subscribeTier(onChange: () => void) {
  const lists = TIER_QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function readTier() {
  const i = TIER_QUERIES.findIndex((q) => window.matchMedia(q).matches);
  return i === -1 ? TIER_QUERIES.length : i;
}

function useColumnCount(size: string = "md") {
  const tier = useSyncExternalStore(subscribeTier, readTier, () => TIER_QUERIES.length);
  const s = (size in COLUMNS_BY_SIZE ? size : "md") as MasonrySize;
  return COLUMNS_BY_SIZE[s][tier];
}

export type CardCustomProps = {
  cardAspect?: "4/3" | "16/10" | "1/1" | "auto" | (string & {});
  cardRoleTagMode?: "hover" | "hidden" | "always" | (string & {});
  titleDisplayMode?: "always" | "hover" | (string & {});
  titleFont?: string;
  titleSize?: "sm" | "md" | "lg" | "xl" | (string & {});
  titleWeight?: "normal" | "medium" | "bold" | "black" | (string & {});
  titleCase?: "uppercase" | "normal" | (string & {});
};

export function ParallaxMasonry({
  items,
  onOpen,
  size = "md",
  variant = "case-study",
  className = "",
  cardAspect = "4/3",
  cardRoleTagMode = "hidden",
  titleDisplayMode = "always",
  titleFont = "display",
  titleSize = "md",
  titleWeight = "bold",
  titleCase = "uppercase",
}: {
  items: MasonryItem[];
  onOpen?: (id: string) => void;
  size?: MasonrySize | (string & {});
  variant?: "studio" | "case-study";
  className?: string;
} & CardCustomProps) {
  const columnCount = useColumnCount(size as MasonrySize);

  const columns = useMemo(() => {
    const cols: MasonryItem[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, i) => cols[i % columnCount].push(item));
    return cols;
  }, [items, columnCount]);

  return (
    <div className={`flex items-start gap-6 md:gap-8 ${className}`}>
      {columns.map((col, c) => (
        <Column
          key={c}
          colIndex={c}
          items={col}
          onOpen={onOpen}
          variant={variant}
          cardAspect={cardAspect}
          cardRoleTagMode={cardRoleTagMode}
          titleDisplayMode={titleDisplayMode}
          titleFont={titleFont}
          titleSize={titleSize}
          titleWeight={titleWeight}
          titleCase={titleCase}
        />
      ))}
    </div>
  );
}

function Column({
  items,
  onOpen,
  colIndex,
  variant = "case-study",
  cardAspect,
  cardRoleTagMode,
  titleDisplayMode,
  titleFont,
  titleSize,
  titleWeight,
  titleCase,
}: {
  items: MasonryItem[];
  onOpen?: (id: string) => void;
  colIndex: number;
  variant?: "studio" | "case-study";
} & CardCustomProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-6 md:gap-8">
      {items.map((item, i) => (
        <Tile
          key={item.id}
          item={item}
          onOpen={onOpen}
          index={colIndex * 10 + i}
          variant={variant}
          cardAspect={cardAspect}
          cardRoleTagMode={cardRoleTagMode}
          titleDisplayMode={titleDisplayMode}
          titleFont={titleFont}
          titleSize={titleSize}
          titleWeight={titleWeight}
          titleCase={titleCase}
        />
      ))}
    </div>
  );
}

function Tile({
  item,
  variant = "case-study",
  onOpen,
  cardAspect = "4/3",
  cardRoleTagMode = "hidden",
  titleDisplayMode = "always",
  titleFont = "display",
  titleSize = "md",
  titleWeight = "bold",
  titleCase = "uppercase",
}: {
  item: MasonryItem;
  index?: number;
  variant?: "studio" | "case-study";
  onOpen?: (id: string) => void;
} & CardCustomProps) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const embed = parseVideoEmbed(item.src);
  const isStudio = variant === "studio";
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasHoverVideo = Boolean(item.hoverVideo?.trim());
  const displayTitle = item.shortTitle?.trim() || item.title.split(/[:-]/)[0].trim();

  // Hover video playback (Alex Boland style)
  useEffect(() => {
    if (!hasHoverVideo || !videoRef.current) return;
    if (hover) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [hover, hasHoverVideo]);

  // Dynamic Aspect Ratio
  const aspectClass =
    cardAspect === "16/10"
      ? "aspect-[16/10]"
      : cardAspect === "1/1"
      ? "aspect-square"
      : cardAspect === "auto"
      ? ""
      : "aspect-[4/3]";

  // Dynamic Typeface Styling for Title
  const titleFontClass =
    titleFont === "sans"
      ? "font-sans"
      : titleFont === "serif"
      ? "font-serif"
      : titleFont === "display" || !titleFont
      ? "font-display"
      : "";

  const customTitleFont =
    titleFont && !["display", "sans", "serif"].includes(titleFont)
      ? `'${titleFont}', sans-serif`
      : undefined;

  const titleSizeClass =
    titleSize === "sm"
      ? "text-sm sm:text-base"
      : titleSize === "lg"
      ? "text-lg sm:text-xl"
      : titleSize === "xl"
      ? "text-xl sm:text-2xl"
      : "text-base sm:text-lg";

  const titleWeightClass =
    titleWeight === "normal"
      ? "font-normal"
      : titleWeight === "medium"
      ? "font-medium"
      : titleWeight === "black"
      ? "font-black"
      : "font-bold";

  const titleCaseClass = titleCase === "normal" ? "normal-case" : "uppercase";

  // Role tag class
  const roleTagClass =
    cardRoleTagMode === "hidden"
      ? "hidden"
      : cardRoleTagMode === "hover"
      ? "opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300"
      : "opacity-100";

  const body = isStudio ? (
    <div className="relative overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-colors duration-300">
      <div className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]">
        <CoverMedia
          src={item.src}
          alt={item.title}
          mimeHint={item.mime}
          poster={item.poster}
          playback={item.playback}
          active={hover}
          className="block w-full h-auto"
          style={embed ? { aspectRatio: embedAspect(embed) } : undefined}
        />
      </div>
    </div>
  ) : (
    /* ── Case Study Design (Alex Boland Inspo: Clean media, hover video, short title + year) ── */
    <div className="flex flex-col">
      <div className={`relative overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-colors duration-300 ${aspectClass}`}>
        <div className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025] w-full h-full">
          <CoverMedia
            src={item.src}
            alt={item.title}
            mimeHint={item.mime}
            poster={item.poster}
            playback={item.playback}
            active={hover && !hasHoverVideo}
            className={`block w-full h-full object-cover transition-opacity duration-500 ${
              hover && hasHoverVideo ? "opacity-0" : "opacity-100"
            }`}
            style={embed ? { aspectRatio: embedAspect(embed) } : undefined}
          />
        </div>

        {/* MP4 Hover Video (Alex Boland style loop) */}
        {hasHoverVideo && item.hoverVideo && (
          <video
            ref={videoRef}
            src={item.hoverVideo}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${
              hover ? "opacity-100" : "opacity-0"
            }`}
          />
        )}



        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Role Tag (Visible on hover by default, or hidden/always based on admin) */}
        {item.role && cardRoleTagMode !== "hidden" && (
          <div
            className={`absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground font-medium pointer-events-none border border-border/40 ${roleTagClass}`}
          >
            {item.role}
          </div>
        )}

        {item.protected && (
          <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground font-medium inline-flex items-center gap-1.5 pointer-events-none">
            <Lock className="w-3 h-3 text-muted-foreground" aria-hidden />
            Protected
          </div>
        )}
      </div>

      {/* ── Below card: Clean Short Title + Year (Alex Boland Style - no paragraph description) ── */}
      <div
        className={`mt-3 flex items-baseline justify-between border-t border-border pt-2.5 gap-3 transition-all duration-300 ${
          titleDisplayMode === "hover"
            ? "opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0"
            : "opacity-100"
        }`}
      >
        <h3
          className={`${titleFontClass} ${titleWeightClass} ${titleSizeClass} ${titleCaseClass} tracking-tight leading-[1.1] text-foreground group-hover:text-primary transition-colors truncate`}
          style={customTitleFont ? { fontFamily: customTitleFont } : undefined}
        >
          {displayTitle}
        </h3>
        {item.year ? (
          <span className="text-xs tabular-nums text-muted-foreground font-mono shrink-0">{item.year}</span>
        ) : item.meta ? (
          <span className="text-xs text-muted-foreground shrink-0">{item.meta}</span>
        ) : null}
      </div>
    </div>
  );

  const shared = {
    className:
      "group block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };

  const tile = item.href ? (
    <Link href={item.href} {...shared}>
      {body}
    </Link>
  ) : onOpen ? (
    <button type="button" onClick={() => onOpen(item.id)} aria-label={`Open ${item.title}`} {...shared}>
      {body}
    </button>
  ) : (
    <div className="group">{body}</div>
  );

  return (
    <motion.div
      className="w-full"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {tile}
    </motion.div>
  );
}
