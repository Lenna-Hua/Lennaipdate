import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ShowcaseCard,
  type ShowcaseCardProject,
} from "@/components/ShowcaseCard";
import { BRAND } from "@/lib/brand";

type Props = {
  projects: ShowcaseCardProject[];
  isDark?: boolean;
  layout?: "landscape" | "portrait";
  /** Optional aria label for the region. */
  label?: string;
};

/**
 * Horizontal case-study slideshow: cards sit on slight diagonals and can
 * overhang the track (overflow visible) so the put-frame never crops them.
 * Drag / wheel / buttons to browse — organized randomness, Aditi-style.
 */
export function ShowcaseCarousel({
  projects,
  isDark = false,
  layout = "landscape",
  label = "Case study slideshow",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    scrollLeft: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [dragging, setDragging] = useState(false);

  const scrollByCard = useCallback((dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.72, 720) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || e.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || !trackRef.current) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) < 8) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      setDragging(true);
      try {
        trackRef.current.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    trackRef.current.scrollLeft = drag.current.scrollLeft - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const wasDrag = drag.current.moved;
    drag.current.active = false;
    drag.current.moved = false;
    setDragging(false);
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (wasDrag) {
      e.preventDefault();
      const blockClick = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        document.removeEventListener("click", blockClick, true);
      };
      document.addEventListener("click", blockClick, true);
      window.setTimeout(
        () => document.removeEventListener("click", blockClick, true),
        0,
      );
    }
  };

  if (projects.length === 0) return null;

  return (
    <section className="relative w-full" aria-label={label}>
      {/* Extra vertical pad so ±2–3° rotates aren’t clipped by put-frame */}
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-10 md:py-14 overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          ref={trackRef}
          className={`showcase-carousel-track flex items-center gap-8 md:gap-12 overflow-x-auto overflow-y-visible snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            dragging ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
          style={{ touchAction: "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="shrink-0 w-2 md:w-6" aria-hidden />
          {projects.map((project, i) => (
            <div
              key={project.id}
              className="snap-center shrink-0 py-4"
              style={{ scrollSnapAlign: "center" }}
            >
              <ShowcaseCard
                project={project}
                i={i}
                isDark={isDark}
                layout={layout}
              />
            </div>
          ))}
          <div className="shrink-0 w-8 md:w-16" aria-hidden />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-[11px] uppercase tracking-[0.28em] font-sans text-muted-foreground">
          Drag or scroll · {projects.length} studies
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous case study"
            className="w-10 h-10 rounded-full border-2 text-sm font-bold transition-opacity hover:opacity-80"
            style={{ borderColor: `${BRAND.blue}55`, color: BRAND.blue }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next case study"
            className="w-10 h-10 rounded-full border-2 text-sm font-bold transition-opacity hover:opacity-80"
            style={{
              borderColor: BRAND.blue,
              background: BRAND.blue,
              color: "#fff",
            }}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
