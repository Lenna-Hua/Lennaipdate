import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Columns3,
  Columns2,
  Square,
} from "lucide-react";
import projectsSeed from "@/data/projects.json";
import gallerySeed from "@/data/gallery.json";
import studioSeed from "@/data/studio.json";
import appearanceSeed from "@/data/appearance.json";
import { useContent } from "@/lib/use-content";
import { floatInProps, useMotionProfile, SOFT_EASE } from "@/lib/motion";
import { useTheme } from "@/context/ThemeContext";
import {
  PinterestCard,
  cardSpanClass,
  type PinterestCardProject,
} from "@/components/PinterestCard";
import { LogoMarquee } from "@/components/LogoMarquee";
import { collectMarqueeLogos, mergeStudio } from "@/lib/studio-content";
import { isBigGalleryItem, STUDIO_TAG } from "@/lib/gallery-migration";
import type {
  GalleryItem,
  Project as ProjectType,
  Studio,
  Appearance,
} from "@/components/admin/types";
import {
  BRAND,
  BRAND_DECK,
  BRAND_TEXT,
} from "@/lib/brand";

const ACCENTS = BRAND_DECK;
const FILTERS = ["All", "UX Research", "Product Design", "Analysis", "Studio"];

type ColumnCount = 1 | 2 | 3;
const COLUMNS_STORAGE_KEY = "work-columns";

/* Each choice is a maximum: narrower screens step down automatically.
   Class strings stay literal so Tailwind can see them. */
const COLUMN_LAYOUTS: Record<
  ColumnCount,
  { grid: string; aspect: string; label: string; Icon: typeof Square }
> = {
  3: {
    grid: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    aspect: "aspect-[4/5]",
    label: "3 columns",
    Icon: Columns3,
  },
  2: {
    grid: "grid-cols-1 sm:grid-cols-2",
    aspect: "aspect-[4/5] lg:aspect-square 2xl:aspect-[5/4]",
    label: "2 columns",
    Icon: Columns2,
  },
  1: {
    grid: "grid-cols-1",
    aspect: "aspect-[4/5] sm:aspect-auto sm:h-[min(80vh,56vw)]",
    label: "1 column",
    Icon: Square,
  },
};

function readStoredColumns(): ColumnCount {
  if (typeof window === "undefined") return 3;
  const n = Number(window.localStorage.getItem(COLUMNS_STORAGE_KEY));
  return n === 1 || n === 2 || n === 3 ? n : 3;
}

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
    coverMime: (p as { coverMime?: string }).coverMime,
    coverPoster: (p as { coverPoster?: string }).coverPoster,
    coverPlayback: (p as { coverPlayback?: ProjectType["coverPlayback"] }).coverPlayback,
    year: p.year,
    tags: p.tags ?? [],
    type: p.type,
    subtitle: p.subtitle,
    cardDescription: (p as { cardDescription?: string }).cardDescription,
    href: `/work/${p.slug}`,
    hoverVideo: (p as { hoverVideo?: string }).hoverVideo,
    liveUrl: (p as { liveUrl?: string }).liveUrl,
    cardLayout: (p as { cardLayout?: ProjectType["cardLayout"] }).cardLayout,
    protected: (p as { protected?: boolean }).protected,
  };
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function WorkIndex() {
  const projectsData = useContent("projects", projectsSeed) as Project[];
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const studioRaw = useContent("studio", studioSeed as Studio);
  const appearanceData = useContent("appearance", appearanceSeed as Appearance);
  const titleLine1Color = appearanceData?.workTitleLine1Color?.trim() || BRAND_TEXT.coral;
  const titleLine2Color = appearanceData?.workTitleLine2Color?.trim() || BRAND_TEXT.blue;
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
  const [columns, setColumns] = useState<ColumnCount>(readStoredColumns);
  const layout = COLUMN_LAYOUTS[columns];
  const motionProfile = useMotionProfile();

  const chooseColumns = (n: ColumnCount) => {
    setColumns(n);
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, String(n));
    } catch {
      /* storage unavailable */
    }
  };
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const visible = useMemo((): PinterestCardProject[] => {
    const fromWork = projectsData.filter((p) => !p.archived).map(workToCard);
    // Gallery "big projects" not yet moved into Projects (until Admin saves the migration).
    const workSlugs = new Set(projectsData.map((p) => p.slug));
    const fromStudio = galleryData
      .filter((g) => !g.archived && isBigGalleryItem(g) && !workSlugs.has(g.slug))
      .map(galleryBigToCard);
    return [...fromWork, ...fromStudio];
  }, [projectsData, galleryData]);

  const filtered = useMemo(() => {
    if (filter === "All") return visible;
    if (filter === "Studio") {
      return visible.filter(
        (p) => p.href?.startsWith("/studio/") || p.tags.includes(STUDIO_TAG),
      );
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
      <motion.div
        className="relative w-full flex flex-col gap-10 pb-28"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: SOFT_EASE }}
      >
        <motion.div
          className="flex items-baseline justify-between gap-6 flex-wrap pb-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: SOFT_EASE }}
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
          style={{ borderBottom: `2px solid ${titleLine1Color}44` }}
        >
          <motion.h1
            className="font-display font-black uppercase leading-[0.88] tracking-tight"
            style={{ fontSize: "clamp(3.5rem,11vw,11rem)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: SOFT_EASE }}
          >
            <span style={{ color: titleLine1Color }}>Selected</span>
            <br />
            <span style={{ color: titleLine2Color }}>Works</span>
          </motion.h1>

          <motion.div
            className="flex flex-wrap items-center justify-between gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.6, ease: SOFT_EASE }}
          >
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter projects by category"
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
            </div>

            <div
              className="hidden sm:inline-flex items-center gap-1 p-1 rounded-md border border-foreground/15"
              role="group"
              aria-label="Cards per row"
            >
              {([3, 2, 1] as const).map((n) => {
                const { Icon, label } = COLUMN_LAYOUTS[n];
                const isActive = columns === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => chooseColumns(n)}
                    aria-pressed={isActive}
                    aria-label={label}
                    title={label}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors duration-300 ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.8} aria-hidden />
                    {n}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </section>

        <div aria-live="polite" className="sr-only">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""} shown
          {filter !== "All" ? ` in ${filter}` : ""}
        </div>
        <div
          className={`grid ${layout.grid} gap-[var(--card-grid-gap)] grid-flow-row-dense items-stretch [--card-grid-gap:1.5rem] lg:[--card-grid-gap:2rem]`}
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((project, gi) => {
              const i = projectIndexMap.get(project.id) ?? 0;
              const card = columns === 1 ? { ...project, cardLayout: undefined } : project;
              const enter = floatInProps(motionProfile, { delay: (gi % columns) * 0.08 });
              return (
                <motion.div
                  key={project.id}
                  layout={motionProfile.lite ? false : "position"}
                  {...enter}
                  transition={{
                    ...("transition" in enter ? enter.transition : {}),
                    layout: { duration: 0.55, ease: SOFT_EASE },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.25, ease: SOFT_EASE } }}
                  className={`h-full ${cardSpanClass(card)}`}
                >
                  <PinterestCard
                    project={card}
                    i={i}
                    isDark={isDark}
                    aspectClass={layout.aspect}
                  />
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
