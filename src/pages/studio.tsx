import { useMemo, useState } from "react";
import gallerySeed from "@/data/gallery.json";
import studioSeed from "@/data/studio.json";
import { useContent } from "@/lib/use-content";
import { KernGame } from "@/components/KernGame";
import { mergeStudio } from "@/lib/studio-content";
import { ParallaxMasonry, type MasonryItem } from "@/components/ParallaxMasonry";
import { MediaLightbox, type LightboxItem } from "@/components/MediaLightbox";
import { BigCount, SplitShowcase } from "@/components/layout/SplitShowcase";
import type { GalleryItem, Studio } from "@/components/admin/types";

const joinMeta = (...parts: (string | undefined)[]) =>
  parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" · ");

export default function StudioPage() {
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const studio = mergeStudio(useContent("studio", studioSeed as Studio));
  const [openId, setOpenId] = useState<string | null>(null);

  const defaultCtaLabel = studio.artworksCtaLabel?.trim() || "All images";

  const artworks = useMemo(
    (): LightboxItem[] =>
      galleryData
        .filter((i) => !i.archived && i.kind === "small")
        .map((g) => ({
          id: g.id,
          src: g.coverImage,
          title: g.title,
          meta: joinMeta(g.role, g.year),
          description: g.description,
          href: g.images?.length ? `/studio/${g.slug}` : undefined,
          hrefLabel: g.ctaLabel?.trim() || defaultCtaLabel,
        })),
    [galleryData, defaultCtaLabel],
  );

  const tiles = useMemo(
    (): MasonryItem[] => artworks.map(({ id, src, title, meta }) => ({ id, src, title, meta })),
    [artworks],
  );

  return (
    <div
      className={`w-full flex flex-col gap-28 md:gap-40 ${
        studio.showGrid ? "studio-grid-bg -mx-5 md:-mx-8 px-5 md:px-8" : ""
      }`}
    >
      <MediaLightbox items={artworks} activeId={openId} onChange={setOpenId} />

      <div className="relative">
        <SplitShowcase
        asideTop={
          <>
            {studio.eyebrow && (
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{studio.eyebrow}</span>
            )}
            <h1 className="font-display font-black uppercase leading-[0.88] tracking-tight text-foreground text-[clamp(2.75rem,5vw,4.75rem)]">
              {studio.heading || "Studio"}
            </h1>
            <BigCount value={artworks.length} label={studio.artworksHeading || studio.artworksEyebrow} />
          </>
        }
        asideBottom={
          <>
            {studio.intro && (
              <p className="max-w-sm text-sm md:text-[0.95rem] leading-relaxed text-foreground/80">{studio.intro}</p>
            )}
            {studio.artworksBlurb && (
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{studio.artworksBlurb}</p>
            )}
          </>
        }
      >
        {tiles.length > 0 ? (
          <ParallaxMasonry items={tiles} onOpen={setOpenId} size={studio.artworksCardSize} variant="studio" />
        ) : (
          <p className="text-sm text-muted-foreground">New pieces are on the way.</p>
        )}
      </SplitShowcase>
    </div>

      {studio.showPlay && (
        <section id="play" className="grid gap-8 lg:grid-cols-[minmax(14rem,22%)_1fr] border-t border-border pt-8 scroll-mt-40">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{studio.playEyebrow}</span>
            <h2 className="font-display font-black uppercase tracking-tight leading-[0.9] text-4xl md:text-5xl">
              {studio.playHeading}
            </h2>
            {studio.playBlurb?.trim() && (
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">{studio.playBlurb}</p>
            )}
          </div>
          <div className="min-w-0">
            <KernGame />
          </div>
        </section>
      )}
    </div>
  );
}
