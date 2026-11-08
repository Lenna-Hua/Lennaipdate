import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CoverMedia } from "@/components/CoverMedia";
import { embedAspect, parseVideoEmbed } from "@/lib/video-embed";
import { useScrollLock } from "@/lib/smooth-scroll";

export type LightboxItem = {
  id: string;
  src: string;
  title: string;
  meta?: string;
  description?: string;
  mime?: string;
  poster?: string;
  href?: string;
  hrefLabel?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Full-screen viewer that steps through a list of items with Previous / Next. */
export function MediaLightbox({
  items,
  activeId,
  onChange,
}: {
  items: LightboxItem[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const index = activeId ? items.findIndex((i) => i.id === activeId) : -1;
  const open = index >= 0;
  const item = open ? items[index] : null;
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  useScrollLock(open);

  const step = (delta: number) => {
    if (!open || items.length < 2) return;
    onChange(items[(index + delta + items.length) % items.length].id);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) > 40) {
      step(deltaX > 0 ? -1 : 1);
    }
  };

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => returnFocus.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const embed = item ? parseVideoEmbed(item.src) : null;
  const navClass =
    "absolute top-1/2 -translate-y-1/2 z-10 px-4 py-6 text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors";

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
          className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
          onClick={() => onChange(null)}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-5 right-6 z-30 text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors"
          >
            Close
          </button>

          {items.length > 1 && (
            <>
              {/* Desktop flanking navigation buttons (hidden on mobile to prevent overlapping) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className={`hidden md:block ${navClass} left-2 md:left-4`}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className={`hidden md:block ${navClass} right-2 md:right-4`}
              >
                Next
              </button>

              {/* Mobile bottom navigation bar (never overlaps image) */}
              <div
                className="md:hidden absolute bottom-5 inset-x-0 z-30 flex items-center justify-between px-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="px-3.5 py-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-primary active:scale-95 transition-all bg-background/90 backdrop-blur-md rounded-full border border-border shadow-sm flex items-center gap-1.5"
                  aria-label="Previous item"
                >
                  <span aria-hidden>←</span> Prev
                </button>
                <span className="text-xs font-mono tabular-nums text-muted-foreground bg-background/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/40">
                  {pad(index + 1)} / {pad(items.length)}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="px-3.5 py-2 text-xs uppercase tracking-[0.16em] text-foreground hover:text-primary active:scale-95 transition-all bg-background/90 backdrop-blur-md rounded-full border border-border shadow-sm flex items-center gap-1.5"
                  aria-label="Next item"
                >
                  Next <span aria-hidden>→</span>
                </button>
              </div>
            </>
          )}

          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 md:px-28 pt-14 pb-24 md:py-16 pointer-events-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={item.id}
                className="pointer-events-auto max-w-[min(1100px,100%)] flex flex-col w-full sm:w-auto"
                initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <CoverMedia
                  src={item.src}
                  alt={item.title}
                  mimeHint={item.mime}
                  poster={item.poster}
                  playback="loop"
                  loading="eager"
                  className={embed ? "w-[min(1100px,80vw)]" : "block max-h-[58vh] sm:max-h-[68vh] md:max-h-[72vh] w-auto max-w-full object-contain mx-auto"}
                  style={embed ? { aspectRatio: embedAspect(embed) } : undefined}
                />
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.meta && <span className="ml-3 text-muted-foreground">{item.meta}</span>}
                  </div>
                  <div className="flex items-baseline gap-5">
                    {item.href && (
                      <Link
                        href={item.href}
                        className="text-xs uppercase tracking-[0.2em] text-primary underline underline-offset-4"
                      >
                        {item.hrefLabel ?? "View project"} →
                      </Link>
                    )}
                    <span className="hidden md:inline text-xs tabular-nums text-muted-foreground">
                      {pad(index + 1)} / {pad(items.length)}
                    </span>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-2 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
