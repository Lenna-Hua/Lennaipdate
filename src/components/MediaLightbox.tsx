import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { CoverMedia } from "@/components/CoverMedia";
import { FigmaArrow } from "@/components/layout/FigmaArrow";
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
const CIPHER_GLYPHS = "01X#_/>*+~∆";
const SLIDE_EASE = [0.16, 1, 0.3, 1] as const;

type NavDirection = -1 | 1;

function LightboxNavButton({
  direction,
  onClick,
  targetIndex,
  total,
  pulseSeq,
  reduceMotion,
}: {
  direction: NavDirection;
  onClick: () => void;
  targetIndex: number;
  total: number;
  pulseSeq: number;
  reduceMotion: boolean;
}) {
  const isPrev = direction === -1;
  const baseLabel = isPrev ? "PREV" : "NEXT";
  const [hovered, setHovered] = useState(false);
  const [scrambleText, setScrambleText] = useState(baseLabel);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverOffsetRef = useRef({ x: 0, y: 0 });

  // Magnetic cursor pull + click recoil spring on the inner paddle
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const magX = useSpring(rawX, { stiffness: 360, damping: 20, mass: 0.45 });
  const magY = useSpring(rawY, { stiffness: 360, damping: 20, mass: 0.45 });

  // Directional spring recoil whenever triggered (click or keyboard arrow)
  useEffect(() => {
    if (pulseSeq === 0 || reduceMotion) return;
    rawX.set(hoverOffsetRef.current.x + (isPrev ? -14 : 14));
    const timer = window.setTimeout(() => {
      rawX.set(hoverOffsetRef.current.x);
    }, 95);
    return () => window.clearTimeout(timer);
  }, [pulseSeq, isPrev, reduceMotion, rawX]);

  // Cipher scramble on hover
  useEffect(() => {
    if (!hovered || reduceMotion) {
      setScrambleText(baseLabel);
      return;
    }
    let tick = 0;
    const totalTicks = baseLabel.length * 2 + 2;
    const id = window.setInterval(() => {
      setScrambleText(
        baseLabel
          .split("")
          .map((ch, i) =>
            i < tick / 2
              ? ch
              : CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)],
          )
          .join(""),
      );
      tick += 1;
      if (tick > totalTicks) {
        window.clearInterval(id);
        setScrambleText(baseLabel);
      }
    }, 26);
    return () => window.clearInterval(id);
  }, [hovered, baseLabel, reduceMotion]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduceMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ox = ((e.clientX - cx) / (rect.width / 2)) * 7;
    const oy = ((e.clientY - cy) / (rect.height / 2)) * 7;
    hoverOffsetRef.current = { x: ox, y: oy };
    rawX.set(ox);
    rawY.set(oy);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    hoverOffsetRef.current = { x: 0, y: 0 };
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.button
      ref={btnRef}
      type="button"
      aria-label={isPrev ? "Previous artwork" : "Next artwork"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setHovered(true)}
      onBlur={handleMouseLeave}
      initial={reduceMotion ? false : { opacity: 0, x: isPrev ? -32 : 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: isPrev ? -24 : 24 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={{ duration: 0.45, ease: SLIDE_EASE }}
      className={`hidden md:flex group fixed top-1/2 -translate-y-1/2 z-30 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isPrev ? "left-3 lg:left-7" : "right-3 lg:right-7"
      }`}
    >
      <motion.span
        style={{ x: magX, y: magY }}
        className={`relative flex items-center gap-3.5 px-4 py-3.5 bg-background/75 group-hover:bg-background/95 backdrop-blur-md border border-foreground/15 group-hover:border-primary/60 shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:shadow-[0_0_28px_-4px_rgba(31,103,241,0.38)] transition-[background-color,border-color,box-shadow] duration-300 ${
          isPrev ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {/* Architectural Corner Brackets that expand outward on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-primary opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[1px] -right-[1px] w-2 h-2 border-t-2 border-r-2 border-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b-2 border-l-2 border-primary opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />

        {/* Kinetic Orb with Dual-Arrow Slingshot & Click Shockwave */}
        <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-foreground/[0.04] group-hover:bg-primary/15 border border-foreground/15 group-hover:border-primary transition-colors duration-300 overflow-visible">
          {/* Spinning orbital dashed ring on hover */}
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-1 rounded-full border border-dashed border-primary/60 transition-all duration-500 ${
              hovered
                ? "opacity-100 scale-100 animate-[spin_8s_linear_infinite]"
                : "opacity-0 scale-75"
            }`}
          />

          {/* Click / Keyboard Sonar Shockwave Ring */}
          <AnimatePresence>
            {pulseSeq > 0 && !reduceMotion && (
              <motion.span
                key={pulseSeq}
                aria-hidden
                initial={{ scale: 0.85, opacity: 0.85 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
              />
            )}
          </AnimatePresence>

          {/* Dual-Arrow Relay Track + Click Dart Impulse */}
          <motion.span
            key={pulseSeq}
            initial={
              pulseSeq > 0 && !reduceMotion
                ? { x: isPrev ? 9 : -9, scale: 0.85 }
                : false
            }
            animate={{ x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="relative w-6 h-4 overflow-hidden flex items-center justify-center"
          >
            {/* Primary resting arrow — shoots out in direction of travel on hover */}
            <span
              className={`absolute inset-0 flex items-center justify-center text-foreground group-hover:text-primary transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isPrev
                  ? "group-hover:-translate-x-7 group-hover:opacity-0"
                  : "group-hover:translate-x-7 group-hover:opacity-0"
              }`}
            >
              <FigmaArrow
                color="currentColor"
                width={18}
                height={10}
                strokeWidth={1.8}
                className={isPrev ? "rotate-180" : ""}
              />
            </span>

            {/* Incoming trailing arrow — streaks in from behind on hover */}
            <span
              className={`absolute inset-0 flex items-center justify-center text-primary transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isPrev
                  ? "translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  : "-translate-x-7 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
              }`}
            >
              <FigmaArrow
                color="currentColor"
                width={18}
                height={10}
                strokeWidth={2}
                className={isPrev ? "rotate-180" : ""}
              />
            </span>
          </motion.span>
        </span>

        {/* Label + Target Index Readout */}
        <span
          className={`flex flex-col leading-none ${
            isPrev ? "items-start pr-1" : "items-end pl-1"
          }`}
        >
          <span className="text-[9px] font-mono tabular-nums tracking-[0.22em] text-muted-foreground group-hover:text-primary/85 transition-colors duration-200 mb-1">
            {pad(targetIndex + 1)}/{pad(total)}
          </span>
          <span className="font-mono text-xs font-medium uppercase tracking-[0.24em] text-foreground group-hover:text-primary transition-colors duration-200">
            {scrambleText}
          </span>
        </span>

        {/* Razor-thin Laser Beam Underline */}
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-[1.5px] w-full bg-gradient-to-r from-primary via-primary to-primary/40 shadow-[0_0_8px_rgba(31,103,241,0.65)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isPrev ? "origin-left" : "origin-right"
          } ${hovered ? "scale-x-100" : "scale-x-0"}`}
        />
      </motion.span>
    </motion.button>
  );
}

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
  const [direction, setDirection] = useState<NavDirection | 0>(0);
  const [pulseState, setPulseState] = useState<{ prev: number; next: number }>({
    prev: 0,
    next: 0,
  });
  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      setDirection(0);
    }
  }, [open]);

  const step = (delta: NavDirection) => {
    if (!open || items.length < 2) return;
    setDirection(delta);
    setPulseState((p) => ({
      prev: delta === -1 ? p.prev + 1 : p.prev,
      next: delta === 1 ? p.next + 1 : p.next,
    }));
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
  const prevIndex =
    open && items.length > 1 ? (index - 1 + items.length) % items.length : 0;
  const nextIndex = open && items.length > 1 ? (index + 1) % items.length : 0;

  const slideVariants = {
    enter: (dir: NavDirection | 0) =>
      reduce || dir === 0
        ? { opacity: 0, scale: 0.96, x: 0 }
        : { opacity: 0, x: dir * 72, scale: 0.95, rotateY: dir * -4 },
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: NavDirection | 0) =>
      reduce || dir === 0
        ? { opacity: 0, scale: 0.96, x: 0 }
        : { opacity: 0, x: dir * -72, scale: 0.95, rotateY: dir * 4 },
  };

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
            className="group absolute top-5 right-6 z-30 inline-flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.22em] text-foreground hover:text-primary border border-transparent hover:border-primary/40 bg-background/60 backdrop-blur-sm transition-all duration-300 cursor-pointer"
          >
            <span>Close</span>
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-90 text-muted-foreground group-hover:text-primary"
            >
              ✕
            </span>
          </button>

          {items.length > 1 && (
            <>
              {/* Desktop flanking kinetic navigation buttons */}
              <LightboxNavButton
                direction={-1}
                onClick={() => step(-1)}
                targetIndex={prevIndex}
                total={items.length}
                pulseSeq={pulseState.prev}
                reduceMotion={Boolean(reduce)}
              />
              <LightboxNavButton
                direction={1}
                onClick={() => step(1)}
                targetIndex={nextIndex}
                total={items.length}
                pulseSeq={pulseState.next}
                reduceMotion={Boolean(reduce)}
              />

              {/* Mobile bottom navigation bar (never overlaps image) */}
              <div
                className="md:hidden absolute bottom-5 inset-x-0 z-30 flex items-center justify-between px-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.button
                  type="button"
                  onClick={() => step(-1)}
                  whileTap={reduce ? undefined : { scale: 0.92, x: -5 }}
                  className="group relative overflow-hidden px-4 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground hover:text-primary transition-colors bg-background/90 backdrop-blur-md border border-foreground/20 active:border-primary shadow-sm flex items-center gap-2"
                  aria-label="Previous item"
                >
                  <FigmaArrow
                    color="currentColor"
                    width={15}
                    height={9}
                    strokeWidth={1.8}
                    className="rotate-180 transition-transform duration-300 group-hover:-translate-x-1 text-primary"
                  />
                  <span>Prev</span>
                </motion.button>
                <span className="text-xs font-mono tabular-nums text-muted-foreground bg-background/75 backdrop-blur-sm px-3 py-1.5 border border-border/50">
                  {pad(index + 1)} / {pad(items.length)}
                </span>
                <motion.button
                  type="button"
                  onClick={() => step(1)}
                  whileTap={reduce ? undefined : { scale: 0.92, x: 5 }}
                  className="group relative overflow-hidden px-4 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground hover:text-primary transition-colors bg-background/90 backdrop-blur-md border border-foreground/20 active:border-primary shadow-sm flex items-center gap-2"
                  aria-label="Next item"
                >
                  <span>Next</span>
                  <FigmaArrow
                    color="currentColor"
                    width={15}
                    height={9}
                    strokeWidth={1.8}
                    className="transition-transform duration-300 group-hover:translate-x-1 text-primary"
                  />
                </motion.button>
              </div>
            </>
          )}

          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 md:px-40 lg:px-48 pt-14 pb-24 md:py-16 pointer-events-none"
            style={{ perspective: "1200px" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={item.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0 : 0.38, ease: SLIDE_EASE }}
                className="pointer-events-auto max-w-[min(1100px,100%)] flex flex-col w-full sm:w-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <CoverMedia
                  src={item.src}
                  alt={item.title}
                  mimeHint={item.mime}
                  poster={item.poster}
                  playback="loop"
                  loading="eager"
                  className={
                    embed
                      ? "w-[min(1100px,80vw)]"
                      : "block max-h-[58vh] sm:max-h-[68vh] md:max-h-[72vh] w-auto max-w-full object-contain mx-auto"
                  }
                  style={embed ? { aspectRatio: embedAspect(embed) } : undefined}
                />
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{item.title}</span>
                    {item.meta && (
                      <span className="ml-3 text-muted-foreground">{item.meta}</span>
                    )}
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
                    <span className="hidden md:inline text-xs font-mono tabular-nums text-muted-foreground">
                      {pad(index + 1)} / {pad(items.length)}
                    </span>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-2 max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
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
