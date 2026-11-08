import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { BRAND_EASE } from "@/lib/brand";
import { renderRichText, stripRichText } from "@/lib/rich-text";

export type ProcessStep = {
  title: string;
  body?: string;
  /** Optional custom hex color set in Admin (e.g. "#EBE0FF"). */
  color?: string;
};

export type ProcessLayout = "stack" | "flow";

export const DEFAULT_STEP_COLORS = [
  "#EBE0FF",
  "#FAEBC8",
  "#DEF8F3",
  "#FCE2D1",
  "#DCEBFF",
  "#FCDCE8",
] as const;

export const STEP_COLOR_SWATCHES: { label: string; hex: string }[] = [
  { label: "Lavender", hex: "#EBE0FF" },
  { label: "Sand", hex: "#FAEBC8" },
  { label: "Mint", hex: "#DEF8F3" },
  { label: "Peach", hex: "#FCE2D1" },
  { label: "Sky", hex: "#DCEBFF" },
  { label: "Rose", hex: "#FCDCE8" },
  { label: "Coral", hex: "#FAD6CE" },
  { label: "Sage", hex: "#DCF2E4" },
];

export const DEFAULT_PROCESS_STEPS: ProcessStep[] = [
  {
    title: "Discover & Audit",
    body: "Uncover real friction through moderated usability testing, think-aloud protocols, UX audits, and stakeholder interviews.",
    color: "#EBE0FF",
  },
  {
    title: "Define & Map",
    body: "Synthesize findings into personas, journey maps, service blueprints, and decision matrices to isolate key opportunities.",
    color: "#FAEBC8",
  },
  {
    title: "Design & Prototype",
    body: "Translate IA and user flows into scalable Figma design systems, tokens, and interactive prototypes.",
    color: "#DEF8F3",
  },
  {
    title: "Validate & Iterate",
    body: "Test flows with real users, measure task speed and comprehension, and iterate with engineering to ship.",
    color: "#FCE2D1",
  },
];

type Props = {
  steps: ProcessStep[];
  /** "stack" = overlapping sliding cards (default); "flow" = Box → Arrow → Box user flow diagram. */
  layout?: ProcessLayout;
  /** Optional header content rendered on the left of the controls. */
  header?: ReactNode;
  /** Accessible name for the region. */
  label?: string;
  className?: string;
};

const GAP = 12;

const pad2 = (n: number) => String(n).padStart(2, "0");

function resolveStepColors(step: ProcessStep, index: number, isDark: boolean) {
  const raw = step.color?.trim();
  const baseHex =
    raw && /^#[0-9a-fA-F]{3,8}$/.test(raw)
      ? raw
      : DEFAULT_STEP_COLORS[index % DEFAULT_STEP_COLORS.length]!;
  return {
    baseHex,
    bg: isDark
      ? `color-mix(in srgb, ${baseHex} 26%, hsl(var(--card)))`
      : baseHex,
    accent: isDark
      ? `color-mix(in srgb, ${baseHex} 75%, #ffffff)`
      : `color-mix(in srgb, ${baseHex} 55%, #1D1A17)`,
    border: isDark
      ? `color-mix(in srgb, ${baseHex} 38%, hsl(var(--border)))`
      : `color-mix(in srgb, ${baseHex} 70%, #1D1A17)`,
  };
}

/** Converts "01 · Title — body" or "Title: body" strings into structured { title, body } steps. */
export function parseStepsFromBullets(bullets: string[]): ProcessStep[] {
  return bullets
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((b, i) => {
      const clean = b.replace(/^\s*\d+\s*[·.)\-:]\s*/, "").trim();
      const color = DEFAULT_STEP_COLORS[i % DEFAULT_STEP_COLORS.length];
      const dashMatch = clean.match(/^(.+?)\s+(?:[—–]|-\s)\s*(.+)$/s);
      if (dashMatch) {
        return { title: dashMatch[1]!.trim(), body: dashMatch[2]!.trim(), color };
      }
      const colonMatch = clean.match(/^([^:]{3,48}):\s+(.+)$/s);
      if (colonMatch) {
        return { title: colonMatch[1]!.trim(), body: colonMatch[2]!.trim(), color };
      }
      return { title: clean, body: "", color };
    });
}

/** Hand-drawn spiral circle around the step number. */
function StepBadge({ n }: { n: number }) {
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center text-foreground">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <path
          d="M28.5 7.2C19.2 4.8 9.2 9.8 6.8 19.2c-2.5 9.6 3.5 19.6 13.4 21.8 9.8 2.2 19.8-3.6 21.6-13.4 1.6-8.8-3.8-17.2-12.6-19.1-5.8-1.2-12 .8-15.4 5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="relative font-mono text-xs font-bold tabular-nums">{n}</span>
    </span>
  );
}

/** Compact square-cornered line-art illustration in the bottom-right of each step card. */
function StepIllustration({ index, color }: { index: number; color: string }) {
  const kind = index % 4;
  return (
    <svg
      viewBox="0 0 88 72"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-2.5 right-3 h-11 w-14 select-none"
      style={{ color, opacity: 0.48 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {kind === 0 && (
        <>
          <rect x="20" y="8" width="46" height="56" fill="currentColor" fillOpacity="0.12" />
          <circle cx="43" cy="25" r="8" fill="currentColor" fillOpacity="0.2" />
          <path d="M35 28c1.8-3 4.6-4.5 8-4.5s6.2 1.5 8 4.5" />
          <line x1="30" y1="42" x2="56" y2="42" />
          <line x1="30" y1="49" x2="50" y2="49" />
          <line x1="12" y1="64" x2="74" y2="64" />
        </>
      )}
      {kind === 1 && (
        <>
          <rect
            x="16"
            y="14"
            width="38"
            height="38"
            transform="rotate(-4 35 33)"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <rect x="34" y="24" width="36" height="34" fill="currentColor" fillOpacity="0.1" />
          <rect x="32" y="9" width="6" height="6" fill="currentColor" />
          <path d="M24 28h18M24 35h14M42 38h18M42 45h12" />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x="12" y="14" width="44" height="22" fill="currentColor" fillOpacity="0.14" />
          <rect x="28" y="42" width="46" height="20" fill="currentColor" fillOpacity="0.1" />
          <path d="M20 25h26M36 52h28" />
          <path d="M58 22l12 5-5 3.5 3.5 5.5-2.5 1.5-3.5-5.5-3.5 3.5z" fill="currentColor" />
        </>
      )}
      {kind === 3 && (
        <>
          <rect x="16" y="12" width="56" height="38" fill="currentColor" fillOpacity="0.12" />
          <path d="M10 54h68l-5 7H15z" fill="currentColor" fillOpacity="0.18" />
          <line x1="26" y1="24" x2="46" y2="24" />
          <line x1="26" y1="31" x2="62" y2="31" />
          <line x1="26" y1="38" x2="54" y2="38" />
        </>
      )}
    </svg>
  );
}

/**
 * Style 2 — User Flow Diagram:
 * Showcases process steps as sharp 0px boxes connected by arrows (Box ──► Box ──► Box).
 */
export function UserFlowDiagram({
  steps,
  header,
  label = "User flow",
  className = "",
}: Omit<Props, "layout">) {
  const items = steps.filter((s) => s.title?.trim() || s.body?.trim());
  const [active, setActive] = useState<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-col gap-5 ${className}`} role="region" aria-label={label}>
      {header && <div className="flex items-end justify-between gap-4">{header}</div>}

      <ol className="flex flex-col md:flex-row md:flex-wrap items-stretch gap-y-4">
        {items.map((step, i) => {
          const colors = resolveStepColors(step, i, isDark);
          const isLast = i === items.length - 1;
          const isSelected = active === i;

          return (
            <li key={i} className="flex flex-col md:flex-row items-stretch md:items-center flex-1 min-w-[11.5rem]">
              {/* Step Box (0px square corners) */}
              <div
                onClick={() => setActive(isSelected ? null : i)}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className="group relative flex-1 h-full flex flex-col justify-between rounded-none border p-4 transition-transform duration-200 cursor-pointer"
                style={{
                  background: colors.bg,
                  borderColor: isSelected ? "hsl(var(--foreground))" : "hsl(var(--border))",
                  borderTopWidth: "3px",
                  borderTopColor: colors.border,
                  transform: isSelected ? "translateY(-2px)" : undefined,
                }}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 border-b border-foreground/10 pb-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center bg-foreground text-background text-[10px] font-mono font-bold tabular-nums"
                      >
                        {pad2(i + 1)}
                      </span>
                      <span>Step {pad2(i + 1)}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                      {i === 0 ? "Start" : isLast ? "End" : "Flow"}
                    </span>
                  </div>

                  {step.title && (
                    <h3 className="font-sans font-bold tracking-tight leading-snug text-sm md:text-[15px] text-foreground">
                      {renderRichText(step.title)}
                    </h3>
                  )}

                  {step.body && (
                    <p className="text-xs leading-relaxed text-foreground/75 whitespace-pre-line">
                      {renderRichText(step.body)}
                    </p>
                  )}
                </div>
              </div>

              {/* Connecting Arrow to Next Box */}
              {!isLast && (
                <>
                  {/* Desktop horizontal arrow connector */}
                  <div
                    aria-hidden="true"
                    className="hidden md:flex items-center justify-center px-2 shrink-0 text-foreground/75"
                  >
                    <div className="w-5 border-t-2 border-dashed border-foreground/55" />
                    <ArrowRight className="h-4 w-4 -ml-1 text-foreground" strokeWidth={2.2} />
                  </div>
                  {/* Mobile vertical arrow connector */}
                  <div
                    aria-hidden="true"
                    className="flex md:hidden flex-col items-center justify-center py-1 text-foreground/75"
                  >
                    <div className="h-3 border-l-2 border-dashed border-foreground/55" />
                    <ArrowDown className="h-4 w-4 -mt-1 text-foreground" strokeWidth={2.2} />
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Style 1 (or unified switcher) — Compact, square-cornered horizontal overlapping Process card stack.
 * Moving forward slides the next card over the current one, leaving a narrow strip
 * of every passed step stacked on the left. When `layout="flow"`, renders `UserFlowDiagram`.
 */
export function ProcessStack({
  steps,
  layout = "stack",
  header,
  label = "Process steps",
  className = "",
}: Props) {
  const items = steps.filter((s) => s.title?.trim() || s.body?.trim());
  const count = items.length;
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useLayoutEffect(() => {
    if (layout === "flow") return;
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

  useEffect(() => {
    if (active > count - 1) setActive(Math.max(0, count - 1));
  }, [active, count]);

  const go = useCallback(
    (to: number) => setActive(Math.min(count - 1, Math.max(0, to))),
    [count],
  );

  if (count === 0) return null;

  if (layout === "flow") {
    return <UserFlowDiagram steps={items} header={header} label={label} className={className} />;
  }

  const mobile = width > 0 && width < 640;
  // Compact square cards (~250–300px on desktop)
  const idealCardW = mobile
    ? Math.max(200, width - Math.max(1, count - 1) * 38)
    : Math.max(235, Math.min(Math.round(width * 0.31), 300));
  const peek = mobile
    ? 38
    : Math.min(96, Math.max(74, Math.round(idealCardW * 0.31)));
  const maxCard = Math.max(190, width - Math.max(0, count - 1) * peek);
  const cardW = width ? Math.min(maxCard, idealCardW) : 0;

  const xFor = (i: number) => {
    if (i <= active) return i * peek;
    return active * peek + cardW + GAP + (i - active - 1) * (cardW + GAP);
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 40 || Math.abs(info.offset.x) < Math.abs(info.offset.y)) return;
    go(active + (info.offset.x < 0 ? 1 : -1));
  };

  const arrowClass =
    "inline-flex h-9 w-12 items-center justify-center rounded-none bg-foreground text-background border border-foreground transition-all duration-200 hover:opacity-85 active:scale-95 disabled:opacity-25 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer";

  return (
    <div
      className={`flex flex-col gap-4 ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(active + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(active - 1);
        }
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header ? (
          <div className="flex-1 min-w-[14rem]">{header}</div>
        ) : (
          <span
            className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            Step {pad2(active + 1)} / {pad2(count)}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {header && (
            <span
              className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground tabular-nums mr-1"
              aria-live="polite"
            >
              {pad2(active + 1)} / {pad2(count)}
            </span>
          )}
          <button
            type="button"
            className={arrowClass}
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous step"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={arrowClass}
            onClick={() => go(active + 1)}
            disabled={active === count - 1}
            aria-label="Next step"
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <motion.div
        ref={trackRef}
        className="relative grid overflow-hidden touch-pan-y py-0.5"
        onPanEnd={onPanEnd}
      >
        {width > 0 &&
          items.map((step, i) => {
            const colors = resolveStepColors(step, i, isDark);
            const isActive = i === active;
            const overlapped = i > 0 && i <= active;
            return (
              <motion.article
                key={i}
                aria-roledescription="slide"
                aria-label={`Step ${i + 1} of ${count}${step.title ? `: ${stripRichText(step.title)}` : ""}`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => !isActive && go(i)}
                className={`relative flex flex-col gap-2.5 overflow-hidden rounded-none border p-4 md:p-5 pb-14 min-h-[190px] [grid-area:1/1] transition-shadow duration-300 ${
                  isActive ? "" : "cursor-pointer"
                }`}
                style={{
                  width: cardW,
                  zIndex: i + 1,
                  background: colors.bg,
                  borderColor: isDark ? "hsl(var(--border))" : "rgba(25, 22, 18, 0.14)",
                  boxShadow: overlapped
                    ? "-10px 0 22px -14px rgba(0, 0, 0, 0.28)"
                    : undefined,
                }}
                initial={false}
                animate={{ x: xFor(i) }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: BRAND_EASE }}
              >
                <StepBadge n={i + 1} />
                {step.title && (
                  <h3 className="font-sans font-bold tracking-tight leading-snug text-sm md:text-base text-foreground mt-0.5">
                    {renderRichText(step.title)}
                  </h3>
                )}
                {step.body && (
                  <p className="text-xs md:text-[13px] leading-relaxed text-foreground/80 whitespace-pre-line max-w-[32ch]">
                    {renderRichText(step.body)}
                  </p>
                )}
                <StepIllustration index={i} color={colors.accent} />
              </motion.article>
            );
          })}
      </motion.div>
    </div>
  );
}
