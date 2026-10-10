import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { galleryImageSrc } from "@/lib/gallery-image";
import { sizedMediaSrc } from "@/lib/media-url";
import type { GalleryItem, Studio } from "@/components/admin/types";

const BLUE = "#1F67F1";

const VP = { once: true, margin: "-60px" };

const POP_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared slide height — portrait and landscape both use this; width follows ratio.
 * Capped by viewport height so phones in landscape still see the whole card.
 */
const SLIDE_HEIGHT = {
  md: "h-[20rem] sm:h-[24rem] md:h-[26rem] lg:h-[28rem] max-h-[68svh]",
  lg: "h-[24rem] sm:h-[28rem] md:h-[32rem] lg:h-[36rem] max-h-[72svh]",
  xl: "h-[26rem] sm:h-[32rem] md:h-[36rem] lg:h-[40rem] max-h-[76svh]",
} as const;

const SLIDE_GAP_PX = 20;

const PORTRAIT_RATIO = 4 / 5;
const LANDSCAPE_RATIO = 16 / 10;

type ArtworkOrientation = "portrait" | "landscape";

function artworkImageSources(
  coverImage: string,
  images?: GalleryItem["images"],
): string[] {
  const all = [coverImage, ...(images ?? []).map(galleryImageSrc)].filter(Boolean);
  const unique: string[] = [];
  for (const src of all) {
    if (!unique.includes(src)) unique.push(src);
  }
  return unique;
}

/** Read width/height query params from CDN URLs (e.g. Framer) when present. */
function ratioFromUrl(src: string): number | null {
  try {
    const u = new URL(src, "https://example.com");
    const w = Number(u.searchParams.get("width"));
    const h = Number(u.searchParams.get("height"));
    if (w > 0 && h > 0) return w / h;
  } catch {
    /* ignore malformed URLs */
  }
  return null;
}

/**
 * Resolves the display width/height ratio for a slide.
 * - portrait → 4/5
 * - landscape → 16/10
 * - auto (undefined) → natural image ratio (fallback portrait)
 */
function useSlideRatio(
  src: string,
  override?: ArtworkOrientation,
): number {
  const [ratio, setRatio] = useState(() => {
    if (override === "portrait") return PORTRAIT_RATIO;
    if (override === "landscape") return LANDSCAPE_RATIO;
    return ratioFromUrl(src) ?? PORTRAIT_RATIO;
  });

  useEffect(() => {
    if (override === "portrait") {
      setRatio(PORTRAIT_RATIO);
      return;
    }
    if (override === "landscape") {
      setRatio(LANDSCAPE_RATIO);
      return;
    }
    const fromUrl = ratioFromUrl(src);
    if (fromUrl) {
      setRatio(fromUrl);
      return;
    }
    if (!src) {
      setRatio(PORTRAIT_RATIO);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      setRatio(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => {
      if (!cancelled) setRatio(PORTRAIT_RATIO);
    };
    img.src = sizedMediaSrc(src, 512);
    return () => {
      cancelled = true;
    };
  }, [src, override]);

  return ratio;
}

/* ── Modal for small artworks ───────────────────────────── */
export function ArtworkModal({
  item,
  onClose,
}: {
  item: GalleryItem;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageSources = artworkImageSources(item.coverImage, item.images);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
  }, [item.id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && imageSources.length > 1) {
        setActiveIdx((i) => (i + 1) % imageSources.length);
      }
      if (e.key === "ArrowLeft" && imageSources.length > 1) {
        setActiveIdx((i) => (i - 1 + imageSources.length) % imageSources.length);
      }
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
  }, [onClose, imageSources.length]);

  const activeSrc = imageSources[Math.min(activeIdx, imageSources.length - 1)] ?? "";

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      data-fast-scroll-skip
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 bg-black/90 md:bg-black/80 md:backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-background rounded-2xl overflow-hidden shadow-2xl w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 max-h-[90vh]"
        style={{ border: `1px solid ${BLUE}55` }}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors text-base"
        >
          ✕
        </button>

        {/* Left — one image at a time (avoids stacking cover + broken extras) */}
        <div className="bg-muted/30 flex flex-col min-h-[42vh] md:min-h-0 md:max-h-[90vh]">
          <div className="relative flex-1 flex items-center justify-center p-4 md:p-6 min-h-0 overflow-hidden">
            <SafeImage
              key={activeSrc}
              src={activeSrc}
              alt={item.title}
              className="max-w-full max-h-[min(60vh,520px)] w-auto h-auto object-contain rounded-lg"
              fallbackAspect="16 / 10"
              sizes="(max-width: 768px) 92vw, 50vw"
              maxWidth={1600}
              style={{ maxHeight: "min(60vh, 520px)" }}
            />
            {imageSources.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() =>
                    setActiveIdx(
                      (i) => (i - 1 + imageSources.length) % imageSources.length,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() =>
                    setActiveIdx((i) => (i + 1) % imageSources.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center"
                >
                  →
                </button>
              </>
            )}
          </div>
          {imageSources.length > 1 && (
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
              {imageSources.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Image ${i + 1}`}
                  aria-current={i === activeIdx}
                  className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors"
                  style={{
                    borderColor: i === activeIdx ? BLUE : "transparent",
                  }}
                >
                  <SafeImage
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    fallbackAspect="1 / 1"
                    sizes="56px"
                    maxWidth={512}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — info */}
        <div className="flex flex-col gap-5 p-6 md:p-10 overflow-y-auto">
          <span
            className="text-xs uppercase tracking-[0.4em] font-sans font-bold w-max px-3 py-1 rounded-full"
            style={{
              color: BLUE,
              background: BLUE + "22",
              border: `1px solid ${BLUE}44`,
            }}
          >
            Artwork
          </span>
          <h2
            className="font-display font-black leading-tight tracking-tight"
            style={{ color: BLUE, fontSize: "clamp(1.6rem, 3vw, 2.6rem)" }}
          >
            {item.title}
          </h2>

          {item.description && (
            <p className="text-foreground/85 text-base md:text-lg font-sans leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-border mt-auto">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-sans">
                Role
              </span>
              <span className="text-foreground font-sans text-sm">
                {item.role}
              </span>
            </div>
            {item.year && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-sans">
                  Year
                </span>
                <span className="text-foreground font-sans text-sm">
                  {item.year}
                </span>
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-muted-foreground text-xs uppercase tracking-[0.3em] font-sans">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] uppercase tracking-wider font-sans font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: BLUE + "20",
                        color: BLUE,
                        border: `1px solid ${BLUE}44`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {item.linkUrl && (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-sans font-bold uppercase tracking-widest w-max transition-transform hover:scale-[1.03]"
              style={{ background: BLUE, color: "#FFFFFF" }}
            >
              {item.linkLabel || "View project"} ↗
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Single artwork slide — shared height, width from ratio ───── */
function ArtworkSlide({
  item,
  idx,
  total,
  onOpen,
  heightClass,
  shouldIgnoreClick,
}: {
  item: GalleryItem;
  idx: number;
  total: number;
  onOpen: (item: GalleryItem) => void;
  heightClass: string;
  shouldIgnoreClick: () => boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const ratio = useSlideRatio(item.coverImage, item.orientation);
  const meta = [item.role, item.year].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      data-slide
      onClick={() => {
        if (!shouldIgnoreClick()) onOpen(item);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`group relative flex-shrink-0 snap-start ${heightClass} cursor-pointer text-left bg-transparent border-0 p-0 focus-visible:outline-none`}
      style={{
        aspectRatio: String(ratio),
        width: "auto",
        // cqw = the scroller's own width, so a full card always fits with a peek of the next one.
        maxWidth: "min(calc(100cqw - 1.5rem), 56rem)",
        zIndex: hovered ? 20 : 1,
      }}
      aria-label={`${item.title} — open artwork ${idx + 1} of ${total}`}
    >
      <div
        className="relative w-full h-full overflow-hidden rounded-[1.75rem] bg-muted transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-fine:group-hover:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background"
        style={{
          boxShadow: hovered
            ? "0 28px 50px -18px rgba(15, 20, 40, 0.5)"
            : "0 14px 30px -16px rgba(15, 20, 40, 0.4)",
        }}
      >
        <SafeImage
          src={item.coverImage}
          alt={item.title}
          loading="lazy"
          draggable={false}
          sizes="(max-width: 768px) 85vw, 40vw"
          maxWidth={1200}
          className="w-full h-full object-cover select-none transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-fine:group-hover:scale-[1.04]"
          fallbackAspect={`${ratio}`}
        />
        <div
          className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-black shadow-sm"
          style={{ background: BLUE, color: "#FFFFFF" }}
        >
          {String(idx + 1).padStart(2, "0")}
        </div>

        {/* Touch screens have no hover, so the title is always visible there. */}
        <div className="pointer-fine:hidden absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none">
          <h3 className="font-display font-black uppercase text-base leading-tight text-white line-clamp-2">
            {item.title}
          </h3>
          {meta && (
            <p className="text-[10px] uppercase tracking-[0.22em] font-sans font-semibold text-white/70 truncate mt-1">
              {meta}
            </p>
          )}
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              key="popup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: POP_EASE }}
              className="hidden pointer-fine:block absolute inset-x-4 bottom-4 z-10 pointer-events-none"
            >
              <div className="relative">
                {/* Soft glow behind the glass */}
                <div
                  className="absolute -inset-2 rounded-2xl opacity-50 blur-xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 80%, rgba(31,103,241,0.28), transparent 65%)",
                  }}
                  aria-hidden
                />
                <div
                  className="relative overflow-hidden rounded-2xl rounded-tr-sm px-4 pt-3.5 pb-3.5 backdrop-blur-md"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(255,255,255,0.42) 0%, rgba(255,252,245,0.24) 48%, rgba(31,103,241,0.08) 100%)",
                    border: "1px solid rgba(255,255,255,0.45)",
                    boxShadow:
                      "0 12px 32px rgba(20, 30, 60, 0.1), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(31,103,241,0.06)",
                  }}
                >
                  {/* Film-grain / paper texture */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-soft-light"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    }}
                    aria-hidden
                  />
                  {/* Tiny tab accent */}
                  <span
                    className="absolute top-0 right-3 h-1 w-8 rounded-b-full"
                    style={{ background: BLUE }}
                    aria-hidden
                  />
                  <div className="relative z-[1] flex flex-col gap-1">
                    <h3
                      className="font-display font-black uppercase text-[1.15rem] leading-tight tracking-tight line-clamp-2"
                      style={{ color: "#1A2744" }}
                    >
                      {item.title}
                    </h3>
                    {meta && (
                      <p
                        className="text-[10px] uppercase tracking-[0.22em] font-sans font-semibold truncate"
                        style={{ color: "rgba(26, 39, 68, 0.58)" }}
                      >
                        {meta}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** scrollLeft value that aligns each slide with the scroller's snap edge. */
function slideOrigins(el: HTMLElement): number[] {
  const inset = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
  return Array.from(el.querySelectorAll<HTMLElement>("[data-slide]")).map(
    (s) => s.offsetLeft - inset,
  );
}

/* ── Horizontal slideshow row ─────────────────────────── */
export function ArtworksSlideshow({
  items,
  onOpen,
  cardSize,
}: {
  items: GalleryItem[];
  onOpen: (item: GalleryItem) => void;
  cardSize: Studio["artworksCardSize"];
}) {
  const reduce = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [edges, setEdges] = useState({ start: true, end: false });
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const heightClass = SLIDE_HEIGHT[cardSize] ?? SLIDE_HEIGHT.lg;

  // Float position is tracked separately because scrollLeft rounds to whole
  // pixels on some displays, which would stall the easing loop.
  const anim = useRef({ raf: 0, pos: 0, target: 0 });
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0, lastX: 0, lastT: 0, v: 0 });
  const ignoreClickUntil = useRef(0);

  const stopAnim = useCallback(() => {
    cancelAnimationFrame(anim.current.raf);
    anim.current.raf = 0;
  }, []);

  const animateTo = useCallback(
    (left: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const target = Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
      if (reduce) {
        stopAnim();
        el.scrollLeft = target;
        return;
      }
      // Touch screens keep CSS snap on, which fights per-frame scrollLeft writes.
      if (!window.matchMedia("(pointer: fine)").matches) {
        el.scrollTo({ left: target, behavior: "smooth" });
        return;
      }
      anim.current.target = target;
      if (anim.current.raf) return;
      anim.current.pos = el.scrollLeft;
      const step = () => {
        const a = anim.current;
        const diff = a.target - a.pos;
        if (Math.abs(diff) < 0.5) {
          el.scrollLeft = a.target;
          a.raf = 0;
          return;
        }
        a.pos += diff * 0.14;
        el.scrollLeft = a.pos;
        a.raf = requestAnimationFrame(step);
      };
      anim.current.raf = requestAnimationFrame(step);
    },
    [reduce, stopAnim],
  );

  useEffect(() => stopAnim, [stopAnim]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      setProgress(max > 0 ? left / max : 0);
      setEdges({ start: left <= 2, end: left >= max - 2 });
      const origins = slideOrigins(el);
      let idx = 0;
      if (max > 0 && left >= max - 2) {
        idx = origins.length - 1;
      } else {
        let best = Infinity;
        origins.forEach((o, i) => {
          const d = Math.abs(o - left);
          if (d < best) {
            best = d;
            idx = i;
          }
        });
      }
      setActive(idx);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      // Horizontal trackpad swipes are already smooth natively.
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
        stopAnim();
        return;
      }
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      const delta = e.deltaY * unit;
      const base = anim.current.raf ? anim.current.target : el.scrollLeft;
      const max = el.scrollWidth - el.clientWidth;
      // At either end, hand the wheel back to the page.
      if ((delta > 0 && base >= max - 1) || (delta < 0 && base <= 1)) return;
      e.preventDefault();
      animateTo(base + delta * 1.2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [animateTo, stopAnim]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    stopAnim();
    const now = performance.now();
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      lastX: e.clientX,
      lastT: now,
      v: 0,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    el.scrollLeft = d.startLeft - dx;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v;
    d.lastX = e.clientX;
    d.lastT = now;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d.active || !el) return;
    d.active = false;
    if (!d.moved) return;
    ignoreClickUntil.current = performance.now() + 80;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    setDragging(false);
    // Short flick keeps gliding; velocity is px/ms.
    animateTo(el.scrollLeft - d.v * 320);
  };

  const step = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = anim.current.raf ? anim.current.target : el.scrollLeft;
    const origins = slideOrigins(el);
    const next =
      dir === 1
        ? origins.find((o) => o > left + 4)
        : [...origins].reverse().find((o) => o < left - 4);
    animateTo(next ?? (dir === 1 ? el.scrollWidth : 0));
  };

  const mask = `linear-gradient(to right, ${edges.start ? "#000" : "transparent"} 0, #000 40px, #000 calc(100% - 56px), ${edges.end ? "#000" : "transparent"} 100%)`;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={{ duration: 0.7, ease: POP_EASE }}
    >
      <div
        ref={scrollerRef}
        data-fast-scroll-skip
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
        className={`relative flex items-end overflow-x-auto overscroll-x-contain pt-3 pb-10 -mx-6 px-6 scroll-pl-6 md:mx-0 md:px-0 md:scroll-pl-0 snap-x snap-mandatory pointer-fine:snap-none scrollbar-none select-none ${
          dragging ? "cursor-grabbing [&_[data-slide]]:pointer-events-none" : "pointer-fine:cursor-grab"
        }`}
        style={{
          containerType: "inline-size",
          gap: SLIDE_GAP_PX,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        {items.map((item, idx) => (
          <ArtworkSlide
            key={item.id}
            item={item}
            idx={idx}
            total={items.length}
            onOpen={onOpen}
            heightClass={heightClass}
            shouldIgnoreClick={() => performance.now() < ignoreClickUntil.current}
          />
        ))}
        <div className="flex-shrink-0 w-1 md:w-4" aria-hidden />
      </div>

      <div className="flex items-center gap-4">
        <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0" aria-live="polite">
          <span className="text-foreground font-bold">{pad2(active + 1)}</span> / {pad2(items.length)}
        </span>
        <div
          className="relative flex-1 h-[3px] rounded-full overflow-hidden"
          style={{ background: "rgba(127,127,127,0.2)" }}
          aria-hidden
        >
          <div
            className="absolute inset-0 rounded-full origin-left"
            style={{
              background: BLUE,
              transform: `scaleX(${Math.max(0.06, progress)})`,
              transition: "transform 120ms linear",
            }}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={edges.start}
            aria-label="Previous artwork"
            className="w-11 h-11 rounded-full border border-border bg-background/60 backdrop-blur-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-foreground disabled:opacity-35 disabled:pointer-events-none"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={edges.end}
            aria-label="Next artwork"
            className="w-11 h-11 rounded-full border border-border bg-background/60 backdrop-blur-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-foreground disabled:opacity-35 disabled:pointer-events-none"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs font-sans mt-3">
        <span className="pointer-fine:hidden">Swipe for more · tap to open.</span>
        <span className="hidden pointer-fine:inline">Scroll or drag for more · click to open.</span>
      </p>
    </motion.div>
  );
}
