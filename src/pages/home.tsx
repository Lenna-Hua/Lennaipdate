import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import projectsSeed from "@/data/projects.json";
import aboutSeed from "@/data/about.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import homepageSeed from "@/data/homepage.json";
import { useContent } from "@/lib/use-content";
import { useFloatIn } from "@/lib/motion";
import type { CoverPlayback } from "@/components/CoverMedia";
import { ParallaxMasonry, type MasonryItem } from "@/components/ParallaxMasonry";
import { MediaLightbox, type LightboxItem } from "@/components/MediaLightbox";
import { BigCount, SplitShowcase } from "@/components/layout/SplitShowcase";
import { AdjustmentFrame } from "@/components/AdjustmentFrame";
import { DEFAULT_PROCESS_STEPS, ProcessStack, type ProcessLayout, type ProcessStep } from "@/components/ProcessStack";

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
  selectedWorkCardSize?: "md" | "lg" | "xl";
  selectedWorkCardAspect?: "4/3" | "16/10" | "1/1" | "auto";
  selectedWorkCardRoleTag?: "hover" | "hidden" | "always";
  selectedWorkTitleDisplay?: "always" | "hover";
  selectedWorkTitleFont?: string;
  selectedWorkTitleSize?: "sm" | "md" | "lg" | "xl";
  selectedWorkTitleWeight?: "normal" | "medium" | "bold" | "black";
  selectedWorkTitleCase?: "uppercase" | "normal";
  selectedWorkCardDetailsMode?: "show" | "hide";
  selectedWorkShowSubtitle?: boolean;
  selectedWorkShowDescription?: boolean;
  selectedWorkShowMetadataStrip?: boolean;
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
  const aboutData = useContent("about", aboutSeed) as typeof aboutSeed;
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const homepageData = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const hp = homepageData.home as HomeCopy;
  const heroMedia = hp.heroMedia?.trim() ?? "";
  const [openId, setOpenId] = useState<string | null>(null);

  const featuredWork = useMemo((): MasonryItem[] => {
    return projectsData
      .filter((p) => !p.archived && p.featured)
      .map((p) => ({
        id: p.id,
        src: p.coverImage,
        mime: p.coverMime,
        poster: p.coverPoster,
        playback: p.coverPlayback,
        hoverVideo: (p as { hoverVideo?: string }).hoverVideo,
        title: p.title,
        shortTitle: (p as { shortTitle?: string }).shortTitle,
        subtitle: p.subtitle,
        cardDescription: (p as { cardDescription?: string }).cardDescription,
        description: p.description,
        users: (p as { users?: string }).users,
        methods: (p as { methods?: string }).methods,
        tags: p.tags,
        role: p.type,
        year: p.year,
        protected: (p as { protected?: boolean }).protected,
        meta: joinMeta(p.type, p.year),
        href: `/work/${p.slug}`,
      }));
  }, [projectsData]);

  const heroItem = useMemo(
    (): LightboxItem | null =>
      heroMedia
        ? { id: HERO_MEDIA_ID, src: heroMedia, mime: hp.heroMediaMime, title: hp.heroMediaAlt?.trim() || "Showreel" }
        : null,
    [heroMedia, hp.heroMediaMime, hp.heroMediaAlt],
  );

  const lightboxItems = useMemo(
    () => (heroItem ? [heroItem] : []),
    [heroItem],
  );

  const gridItems = useMemo((): MasonryItem[] => {
    const toTile = ({ id, src, title, meta, mime }: LightboxItem): MasonryItem => ({ id, src, title, meta, mime });
    const hero = heroItem ? [{ ...toTile(heroItem), playback: "loop" as const }] : [];
    return [...hero, ...featuredWork];
  }, [heroItem, featuredWork]);

  const stats = useMemo(
    () => buildStats(contactData.location, aboutData.yearsExperience ?? "3+"),
    [contactData.location, aboutData.yearsExperience],
  );

  return (
    <div className="w-full flex flex-col gap-28 md:gap-40">
      <MediaLightbox items={lightboxItems} activeId={openId} onChange={setOpenId} />

      <div className="relative">
        <SplitShowcase
          asideTop={
            <>
              {hp.heroEyebrow && (
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{hp.heroEyebrow}</span>
              )}
              <h1 className="font-display font-black uppercase leading-[0.88] tracking-tight text-foreground text-[clamp(2.75rem,5vw,4.75rem)] inline-flex my-1">
                <AdjustmentFrame
                  className="px-3 py-1.5 sm:px-4 sm:py-2"
                  dashedColor="border-foreground/50"
                  handleColor="bg-foreground"
                >
                  {identityData.name}
                </AdjustmentFrame>
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
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <ParallaxMasonry
              items={gridItems}
              onOpen={setOpenId}
              variant="case-study"
              size={hp.selectedWorkCardSize ?? "md"}
              cardAspect={hp.selectedWorkCardAspect}
              cardRoleTagMode={hp.selectedWorkCardRoleTag ?? "hidden"}
              titleDisplayMode={hp.selectedWorkTitleDisplay ?? "always"}
              titleFont={hp.selectedWorkTitleFont}
              titleSize={hp.selectedWorkTitleSize}
              titleWeight={hp.selectedWorkTitleWeight}
              titleCase={hp.selectedWorkTitleCase}
              showCardDetails={hp.selectedWorkCardDetailsMode !== "hide"}
              showSubtitle={hp.selectedWorkShowSubtitle ?? true}
              showDescription={hp.selectedWorkShowDescription ?? true}
              showMetadataStrip={hp.selectedWorkShowMetadataStrip ?? true}
            />
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {hp.selectedWorkHeading || "Selected Work"}
              </span>
              <Link
                href={hp.primaryCtaHref || "/work"}
                className="group inline-flex items-center gap-2 border border-foreground/20 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                <span>
                  {hp.selectedWorkLinkLabel && hp.selectedWorkLinkLabel !== "View All →"
                    ? hp.selectedWorkLinkLabel.replace(/\s*→\s*$/, "")
                    : "See more work"}
                </span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </SplitShowcase>
      </div>

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
        <div className="min-w-0 flex flex-col gap-10">
          <div className="max-w-2xl flex flex-col gap-6">
            <p className="text-lg md:text-xl leading-relaxed text-foreground/85">{aboutData.bio[0]}</p>
            <Link
              href="/about"
              className="w-max text-xs uppercase tracking-[0.2em] text-primary underline underline-offset-4"
            >
              {hp.aboutCtaLabel}
            </Link>
          </div>
          <ProcessStack
            steps={
              ((aboutData as { processSteps?: ProcessStep[] }).processSteps?.length
                ? (aboutData as { processSteps?: ProcessStep[] }).processSteps!
                : DEFAULT_PROCESS_STEPS)
            }
            layout={(aboutData as { processLayout?: ProcessLayout }).processLayout ?? "stack"}
            label="Design process"
          />
        </div>
      </motion.section>
    </div>
  );
}
