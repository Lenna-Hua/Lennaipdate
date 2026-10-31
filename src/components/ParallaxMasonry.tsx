import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { CoverMedia, type CoverPlayback } from "@/components/CoverMedia";
import { embedAspect, parseVideoEmbed } from "@/lib/video-embed";
import { useLiteMotion } from "@/lib/motion";

export type MasonryItem = {
  id: string;
  src: string;
  title: string;
  meta?: string;
  mime?: string;
  poster?: string;
  playback?: CoverPlayback;
  /** Navigates on click. Items without `href` open the lightbox when `onOpen` is given. */
  href?: string;
};

/* How far (px) each column drifts upward across the whole grid scroll. */
const COLUMN_DRIFT = [0, -220, -80, -320];

const COLUMN_QUERIES: [string, number][] = [
  ["(min-width: 1280px)", 4],
  ["(min-width: 768px)", 3],
];

function subscribeColumns(onChange: () => void) {
  const lists = COLUMN_QUERIES.map(([q]) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function readColumns() {
  for (const [q, n] of COLUMN_QUERIES) if (window.matchMedia(q).matches) return n;
  return 2;
}

function useColumnCount() {
  return useSyncExternalStore(subscribeColumns, readColumns, () => 2);
}

function useElementHeight(ref: RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}

export function ParallaxMasonry({
  items,
  onOpen,
  className = "",
}: {
  items: MasonryItem[];
  onOpen?: (id: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const columnCount = useColumnCount();
  const lite = useLiteMotion();
  const height = useElementHeight(ref);
  const { scrollY } = useScroll();
  /* Columns start aligned at the top of the page and reach full drift once the
     page has scrolled by the grid's own height. */
  const progress = useTransform(scrollY, [0, Math.max(height, 1)], [0, 1]);

  const columns = useMemo(() => {
    const cols: MasonryItem[][] = Array.from({ length: columnCount }, () => []);
    items.forEach((item, i) => cols[i % columnCount].push(item));
    return cols;
  }, [items, columnCount]);

  return (
    <div ref={ref} className={`flex items-start gap-3 md:gap-4 ${className}`}>
      {columns.map((col, c) => (
        <Column
          key={c}
          items={col}
          progress={progress}
          drift={lite ? 0 : COLUMN_DRIFT[c % COLUMN_DRIFT.length]}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function Column({
  items,
  progress,
  drift,
  onOpen,
}: {
  items: MasonryItem[];
  progress: MotionValue<number>;
  drift: number;
  onOpen?: (id: string) => void;
}) {
  const y = useTransform(progress, [0, 1], [0, drift]);
  return (
    <motion.div style={{ y }} className="flex-1 min-w-0 flex flex-col gap-3 md:gap-4 will-change-transform">
      {items.map((item) => (
        <Tile key={item.id} item={item} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}

function Tile({ item, onOpen }: { item: MasonryItem; onOpen?: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();
  const embed = parseVideoEmbed(item.src);

  const body = (
    <>
      <div className="relative overflow-hidden bg-muted">
        <div className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]">
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
      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs transition-all duration-300 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0">
        <span className="font-medium text-foreground truncate">{item.title}</span>
        {item.meta && <span className="shrink-0 text-muted-foreground">{item.meta}</span>}
      </div>
    </>
  );

  const shared = {
    className:
      "group block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background",
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
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {tile}
    </motion.div>
  );
}
