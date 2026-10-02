import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gallerySeed from "@/data/gallery.json";
import studioSeed from "@/data/studio.json";
import { useContent } from "@/lib/use-content";
import { FloatingDecor } from "@/components/FloatingDecor";
import { StudioDecor } from "@/components/StudioDecor";
import { ArtworkModal, ArtworksSlideshow } from "@/components/ArtworksSlideshow";
import { KernGame } from "@/components/KernGame";
import { mergeStudio } from "@/lib/studio-content";
import type { GalleryItem, Studio } from "@/components/admin/types";

const BLUE = "#1F67F1";

/* Studio is a long-scroll page; we boost wheel scrolling so the page
   feels notably snappier than the default browser rate (~2.5x). We
   attach a single passive wheel listener while the page is mounted.
   Trackpad pinch-zoom (ctrlKey) and any element opted-out via
   [data-fast-scroll-skip] are left untouched. */
function useFastScroll(multiplier = 2.5) {
  useEffect(() => {
    let lastTime = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-fast-scroll-skip]")) return;
      if (e.deltaY === 0) return;
      // Throttle to avoid excessive scroll jumps
      const now = performance.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      window.scrollBy({ top: e.deltaY * (multiplier - 1), behavior: "auto" });
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [multiplier]);
}

function SectionHeader({
  eyebrow,
  heading,
  blurb,
}: {
  eyebrow: string;
  heading: string;
  blurb?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="flex flex-col gap-2">
        <span
          className="text-xs uppercase tracking-[0.4em] font-sans font-bold w-max"
          style={{ color: BLUE }}
        >
          {eyebrow}
        </span>
        <h2 className="font-display font-black uppercase tracking-tight text-3xl md:text-5xl">
          {heading}
        </h2>
      </div>
      {blurb ? (
        <p className="text-muted-foreground font-sans text-sm md:text-base max-w-md">
          {blurb}
        </p>
      ) : null}
    </div>
  );
}

/* ── Page ───────────────────────────────────────── */
export default function StudioPage() {
  useFastScroll(1);
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const studio = mergeStudio(useContent("studio", studioSeed as Studio));

  const artworks = useMemo(
    () => galleryData.filter((i) => !i.archived && i.kind === "small"),
    [galleryData],
  );

  const [modalItem, setModalItem] = useState<GalleryItem | null>(null);

  const heading = studio.heading || "Studio";
  const headingMid = Math.ceil(heading.length / 2);

  return (
    <div
      className={`w-full flex flex-col gap-16 md:gap-20 pt-12 md:pt-24 pb-24 ${
        studio.showGrid ? "studio-grid-bg -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16" : ""
      }`}
    >
      <AnimatePresence>
        {modalItem && (
          <ArtworkModal item={modalItem} onClose={() => setModalItem(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <section className="relative overflow-x-clip min-h-[18rem] md:min-h-[22rem]">
        <FloatingDecor opacity={0.28} />
        {studio.showDecor && <StudioDecor />}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6 max-w-3xl relative z-10"
        >
          <span
            className="text-sm uppercase tracking-[0.5em] font-sans font-bold w-max px-3 py-1 rounded-full"
            style={{
              color: BLUE,
              background: BLUE + "22",
              border: `1px solid ${BLUE}44`,
            }}
          >
            {studio.eyebrow}
          </span>
          <h1
            className="font-display font-black uppercase leading-[0.88] tracking-tight"
            style={{ fontSize: "clamp(3.5rem,10vw,9rem)" }}
          >
            <span style={{ color: BLUE }}>{heading.slice(0, headingMid)}</span>
            <span style={{ color: BLUE }}>{heading.slice(headingMid)}</span>
          </h1>
          <p className="text-muted-foreground text-xl leading-relaxed font-light font-sans max-w-xl">
            {studio.intro}
          </p>
        </motion.div>
      </section>

      {/* ── Small Artworks (horizontal slideshow) ── */}
      {artworks.length > 0 && (
        <section className="flex flex-col gap-6 pt-4">
          <SectionHeader
            eyebrow={studio.artworksEyebrow}
            heading={studio.artworksHeading}
            blurb={studio.artworksBlurb}
          />
          <ArtworksSlideshow
            items={artworks}
            onOpen={setModalItem}
            cardSize={studio.artworksCardSize}
          />
        </section>
      )}

      {/* ── Play ── */}
      {studio.showPlay && (
        <section id="play" className="flex flex-col gap-10 scroll-mt-28">
          <SectionHeader
            eyebrow={studio.playEyebrow}
            heading={studio.playHeading}
            blurb={studio.playBlurb?.trim() || undefined}
          />
          <KernGame />
        </section>
      )}
    </div>
  );
}
