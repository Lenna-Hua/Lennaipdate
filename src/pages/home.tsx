import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import projectsSeed from "@/data/projects.json";
import gallerySeed from "@/data/gallery.json";
import aboutSeed from "@/data/about.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import homepageSeed from "@/data/homepage.json";
import { useContent } from "@/lib/use-content";
import { useFloatIn } from "@/lib/motion";
import type { CoverPlayback } from "@/components/CoverMedia";
import { ParallaxMasonry, type MasonryItem } from "@/components/ParallaxMasonry";
import { MediaLightbox, type LightboxItem } from "@/components/MediaLightbox";
import { BigCount, SplitShowcase, TextLink } from "@/components/layout/SplitShowcase";
import type { GalleryItem } from "@/components/admin/types";

type Project = (typeof projectsSeed)[number] & {
  archived?: boolean;
  coverMime?: string;
  coverPoster?: string;
  coverPlayback?: CoverPlayback;
};

type HomeCopy = (typeof homepageSeed)["home"] & {
  heroMedia?: string;
  heroMediaAlt?: string;
  heroMediaMime?: string;
};

const HERO_MEDIA_ID = "hero-media";

const joinMeta = (...parts: (string | undefined)[]) =>
  parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" · ");

function buildStats(location: string, yearsExperience = "3+") {
  const stats = [
    { value: (yearsExperience || "3+").trim() || "3+", label: "Years" },
    { value: "20+", label: "Projects" },
    { value: "8+", label: "Studies" },
  ];
  const city = (location ?? "").split(",")[0].trim();
  if (city) stats.push({ value: city, label: "Based" });
  return stats;
}

export default function Home() {
  const floatSection = useFloatIn();
  const projectsData = useContent("projects", projectsSeed) as Project[];
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const aboutData = useContent("about", aboutSeed) as typeof aboutSeed;
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const homepageData = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const hp = homepageData.home as HomeCopy;
  const heroMedia = hp.heroMedia?.trim() ?? "";
  const [openId, setOpenId] = useState<string | null>(null);

  const featuredWork = useMemo((): MasonryItem[] => {
    const fromWork = projectsData
      .filter((p) => !p.archived && p.featured)
      .map((p) => ({
        id: p.id,
        src: p.coverImage,
        mime: p.coverMime,
        poster: p.coverPoster,
        playback: p.coverPlayback,
        title: p.title,
        meta: joinMeta(p.type, p.year),
        href: `/work/${p.slug}`,
      }));
    const workSlugs = new Set(projectsData.map((p) => p.slug));
    const fromStudio = galleryData
      .filter((g) => !g.archived && g.featured && !workSlugs.has(g.slug))
      .map((g) => ({
        id: g.id,
        src: g.coverImage,
        title: g.title,
        meta: joinMeta(g.role || "Studio", g.year),
        href: `/studio/${g.slug}`,
      }));
    return [...fromWork, ...fromStudio];
  }, [projectsData, galleryData]);

  const artworks = useMemo((): LightboxItem[] => {
    if (hp.showStudioBand === false) return [];
    return galleryData
      .filter((g) => !g.archived && g.kind === "small")
      .map((g) => ({
        id: g.id,
        src: g.coverImage,
        title: g.title,
        meta: joinMeta(g.role, g.year),
        description: g.description,
        href: g.images?.length ? `/studio/${g.slug}` : undefined,
        hrefLabel: "All images",
      }));
  }, [galleryData, hp.showStudioBand]);

  const heroItem = useMemo(
    (): LightboxItem | null =>
      heroMedia
        ? { id: HERO_MEDIA_ID, src: heroMedia, mime: hp.heroMediaMime, title: hp.heroMediaAlt?.trim() || "Showreel" }
        : null,
    [heroMedia, hp.heroMediaMime, hp.heroMediaAlt],
  );

  const lightboxItems = useMemo(
    () => (heroItem ? [heroItem, ...artworks] : artworks),
    [heroItem, artworks],
  );

  const gridItems = useMemo((): MasonryItem[] => {
    const toTile = ({ id, src, title, meta, mime }: LightboxItem): MasonryItem => ({ id, src, title, meta, mime });
    const hero = heroItem ? [{ ...toTile(heroItem), playback: "loop" as const }] : [];
    return [...hero, ...featuredWork, ...artworks.map(toTile)];
  }, [heroItem, featuredWork, artworks]);

  const stats = useMemo(
    () => buildStats(contactData.location, aboutData.yearsExperience ?? "3+"),
    [contactData.location, aboutData.yearsExperience],
  );

  return (
    <div className="w-full flex flex-col gap-28 md:gap-40">
      <MediaLightbox items={lightboxItems} activeId={openId} onChange={setOpenId} />

      <SplitShowcase
        asideTop={
          <>
            {hp.heroEyebrow && (
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{hp.heroEyebrow}</span>
            )}
            <h1 className="font-display font-black uppercase leading-[0.88] tracking-tight text-foreground text-[clamp(2.75rem,5vw,4.75rem)]">
              {identityData.name}
            </h1>
            <BigCount value={featuredWork.length} label={hp.selectedWorkHeading} />
          </>
        }
        asideBottom={
          <>
            <p className="max-w-sm text-sm md:text-[0.95rem] leading-relaxed text-foreground/80">{hp.heroIntro}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-xs">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-2 border-t border-border pt-1.5">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</dt>
                  <dd className="text-sm text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {hp.primaryCtaHref && <TextLink href={hp.primaryCtaHref}>{hp.primaryCtaLabel}</TextLink>}
              {hp.secondaryCtaHref && <TextLink href={hp.secondaryCtaHref}>{hp.secondaryCtaLabel}</TextLink>}
              <TextLink href="/work">{hp.selectedWorkLinkLabel}</TextLink>
              {artworks.length > 0 && (
                <TextLink href="/studio">{hp.studioLinkLabel?.trim() || "Visit Studio →"}</TextLink>
              )}
            </div>
          </>
        }
      >
        <ParallaxMasonry items={gridItems} onOpen={setOpenId} />
      </SplitShowcase>

      <motion.section
        {...floatSection}
        className="grid gap-8 md:grid-cols-[minmax(15rem,26%)_1fr] md:gap-8 border-t border-border pt-8"
      >
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{hp.aboutEyebrow}</span>
          <h2 className="font-display font-black uppercase tracking-tight leading-[0.9] text-4xl md:text-5xl">
            {hp.aboutHeading}
          </h2>
        </div>
        <div className="max-w-2xl flex flex-col gap-6">
          <p className="text-lg md:text-xl leading-relaxed text-foreground/85">{aboutData.bio[0]}</p>
          <Link
            href="/about"
            className="w-max text-xs uppercase tracking-[0.2em] text-primary underline underline-offset-4"
          >
            {hp.aboutCtaLabel}
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
