import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Star,
  Heart,
  Flower2,
  Sun,
  Cloud,
  Zap,
  Diamond,
} from "lucide-react";
import projectsSeed from "@/data/projects.json";
import gallerySeed from "@/data/gallery.json";
import studioSeed from "@/data/studio.json";
import { useContent } from "@/lib/use-content";
import { useTheme } from "@/context/ThemeContext";
import {
  PinterestCard,
  cardSpanClass,
  type PinterestCardProject,
} from "@/components/PinterestCard";
import { LogoMarquee } from "@/components/LogoMarquee";
import { collectMarqueeLogos, mergeStudio } from "@/lib/studio-content";
import type {
  GalleryItem,
  Project as ProjectType,
  Studio,
} from "@/components/admin/types";
import {
  BRAND,
  BRAND_DECK,
  BRAND_EASE,
  BRAND_TEXT,
} from "@/lib/brand";

const ACCENTS = BRAND_DECK;
const FILTERS = ["All", "UX Research", "Product Design", "Analysis", "Studio"];

type Project = (typeof projectsSeed)[number] & { archived?: boolean };

function galleryBigToCard(g: GalleryItem): PinterestCardProject {
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    coverImage: g.coverImage,
    year: g.year ?? "",
    tags: g.tags ?? [],
    type: g.role || "Studio",
    subtitle: g.description,
    cardDescription: g.description,
    href: `/studio/${g.slug}`,
    cardLayout: g.cardLayout,
  };
}

function workToCard(p: Project): PinterestCardProject {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    coverImage: p.coverImage,
    year: p.year,
    tags: p.tags ?? [],
    type: p.type,
    subtitle: p.subtitle,
    cardDescription: (p as { cardDescription?: string }).cardDescription,
    href: `/work/${p.slug}`,
    hoverVideo: (p as { hoverVideo?: string }).hoverVideo,
    liveUrl: (p as { liveUrl?: string }).liveUrl,
    cardLayout: (p as { cardLayout?: ProjectType["cardLayout"] }).cardLayout,
  };
}

/* ───────────────────── Cursor-following floating icons ───────────────── */
const FLOAT_ICONS = [
  { Icon: Sparkles, x: "8%", y: "12%", size: 28, depth: 22, color: BRAND.coral },
  { Icon: Star, x: "88%", y: "18%", size: 22, depth: 14, color: BRAND.pink },
  { Icon: Flower2, x: "92%", y: "62%", size: 26, depth: 30, color: BRAND.teal },
  { Icon: Heart, x: "5%", y: "70%", size: 20, depth: 18, color: BRAND.coral },
  { Icon: Sun, x: "78%", y: "88%", size: 24, depth: 26, color: BRAND.pink },
  { Icon: Cloud, x: "12%", y: "92%", size: 30, depth: 12, color: BRAND.blue },
  { Icon: Zap, x: "60%", y: "8%", size: 22, depth: 20, color: BRAND.blue },
  { Icon: Diamond, x: "45%", y: "96%", size: 18, depth: 16, color: BRAND.teal },
];

function CursorFollowIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.06;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.06;
      const cx = currentRef.current.x - 0.5;
      const cy = currentRef.current.y - 0.5;
      const root = containerRef.current;
      if (root) {
        const nodes = root.querySelectorAll<HTMLElement>("[data-float]");
        nodes.forEach((node, idx) => {
          const depth = Number(node.dataset.depth ?? 16);
          const idle = Math.sin(t / 1200 + idx) * 3;
          const tx = cx * depth + idle;
          const ty = cy * depth + Math.cos(t / 1400 + idx) * 3;
          const rot = cx * (depth * 0.4);
          node.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${rot}deg)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {FLOAT_ICONS.map(({ Icon, x, y, size, depth, color }, i) => (
        <div
          key={i}
          data-float
          data-depth={depth}
          className="absolute"
          style={{
            left: x,
            top: y,
            color,
            opacity: 0.55,
            willChange: "transform",
            transition: "opacity 0.4s",
          }}
        >
          <Icon size={size} strokeWidth={1.6} />
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function WorkIndex() {
  const projectsData = useContent("projects", projectsSeed) as Project[];
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const studioRaw = useContent("studio", studioSeed as Studio);
  const studio = useMemo(() => mergeStudio(studioRaw), [studioRaw]);
  const marqueeItems = useMemo(
    () =>
      collectMarqueeLogos(
        studio,
        galleryData.filter((g) => !g.archived),
        projectsData as unknown as ProjectType[],
      ),
    [studio, galleryData, projectsData],
  );
  const [filter, setFilter] = useState("All");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const visible = useMemo((): PinterestCardProject[] => {
    const fromWork = projectsData.filter((p) => !p.archived).map(workToCard);
    const fromStudio = galleryData
      .filter((g) => !g.archived && (g.kind ?? "big") === "big")
      .map(galleryBigToCard);
    return [...fromWork, ...fromStudio];
  }, [projectsData, galleryData]);

  const filtered = useMemo(() => {
    if (filter === "All") return visible;
    if (filter === "Studio") {
      return visible.filter((p) => p.href?.startsWith("/studio/"));
    }
    return visible.filter((p) => p.type === filter || p.tags.includes(filter));
  }, [visible, filter]);

  const projectIndexMap = useMemo(
    () => new Map(visible.map((p, i) => [p.id, i])),
    [visible],
  );

  return (
    <div
      className="relative w-full"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <CursorFollowIcons />
      <motion.div
        className="relative w-full flex flex-col gap-10 pb-28"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: BRAND_EASE }}
      >
        <motion.div
          className="flex items-baseline justify-between gap-6 flex-wrap pb-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: BRAND_EASE }}
        >
          <span className="text-xs uppercase tracking-[0.42em] font-sans text-muted-foreground">
            Lenna Hua · Selected Works
          </span>
          <span className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground/70">
            {visible.length} projects
          </span>
        </motion.div>

        <section
          className="flex flex-col gap-5 pb-8"
          style={{ borderBottom: `2px solid ${BRAND.coral}44` }}
        >
          <motion.h1
            className="font-display font-black uppercase leading-[0.88] tracking-tight"
            style={{ fontSize: "clamp(3.5rem,11vw,11rem)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: BRAND_EASE }}
          >
            <span style={{ color: BRAND_TEXT.coral }}>Selected</span>
            <br />
            <span style={{ color: BRAND_TEXT.blue }}>Works</span>
          </motion.h1>

          <motion.div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter projects by category"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.5 }}
          >
            {FILTERS.map((f, fi) => {
              const isActive = filter === f;
              const color = ACCENTS[fi % ACCENTS.length];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={isActive}
                  className="px-4 py-1.5 text-sm uppercase tracking-widest font-sans rounded-full transition-all duration-300"
                  style={
                    isActive
                      ? { background: color, color: "#0A0908", fontWeight: 700 }
                      : { border: `1.5px solid ${color}55`, color }
                  }
                >
                  {f}
                </button>
              );
            })}
          </motion.div>
        </section>

        <div aria-live="polite" className="sr-only">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""} shown
          {filter !== "All" ? ` in ${filter}` : ""}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 grid-flow-row-dense items-stretch [--card-grid-gap:2rem]">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, gi) => {
              const i = projectIndexMap.get(project.id) ?? 0;
              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.55,
                    delay: (gi % 6) * 0.07,
                    ease: BRAND_EASE,
                  }}
                  className={`h-full ${cardSpanClass(project)}`}
                >
                  <PinterestCard project={project} i={i} isDark={isDark} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="text-muted-foreground text-sm font-sans">
              No projects in this category.
            </p>
          </div>
        )}

        {studio.showLogoMarquee && marqueeItems.length > 0 && (
          <LogoMarquee
            items={marqueeItems}
            speed={studio.logoMarqueeSpeed}
            label={studio.logoMarqueeLabel}
          />
        )}
      </motion.div>
    </div>
  );
}
