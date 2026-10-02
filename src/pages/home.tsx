import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import projectsSeed from "@/data/projects.json";
import gallerySeed from "@/data/gallery.json";
import aboutSeed from "@/data/about.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import homepageSeed from "@/data/homepage.json";
import studioSeed from "@/data/studio.json";
import { useContent } from "@/lib/use-content";
import { FloatingDecor } from "@/components/FloatingDecor";
import {
  PinterestCard,
  type PinterestCardProject,
} from "@/components/PinterestCard";
import { RotatingLiveBadge } from "@/components/RotatingLiveBadge";
import { CoverMedia } from "@/components/CoverMedia";
import { ArtworkModal, ArtworksSlideshow } from "@/components/ArtworksSlideshow";
import { useTheme } from "@/context/ThemeContext";
import { mergeStudio } from "@/lib/studio-content";
import type { GalleryItem, Studio } from "@/components/admin/types";

type Project = (typeof projectsSeed)[number] & {
  archived?: boolean;
  hoverVideo?: string;
  liveUrl?: string;
  cardDescription?: string;
};

const BLUE = "#1F67F1";

function splitName(full: string): [string, string] {
  const trimmed = (full || "").trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return [trimmed, ""];
  return [trimmed.slice(0, idx), trimmed.slice(idx + 1)];
}

function buildStats(location: string, yearsExperience = "3+") {
  const years = (yearsExperience || "3+").trim() || "3+";
  const stats = [
    { label: years, sub: "Years", color: BLUE },
    { label: "20+", sub: "Projects", color: BLUE },
    { label: "8+", sub: "Studies", color: BLUE },
  ];
  const trimmed = (location ?? "").trim();
  if (trimmed) {
    const primary = trimmed.split(",")[0].trim();
    stats.push({ label: primary, sub: "Based", color: BLUE });
  }
  return stats;
}

const item = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const VP = { once: true, margin: "-80px" };

export default function Home() {
  const projectsData = useContent("projects", projectsSeed) as Project[];
  const galleryData = useContent("gallery", gallerySeed) as GalleryItem[];
  const aboutData = useContent("about", aboutSeed) as typeof aboutSeed;
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const homepageData = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const studio = mergeStudio(useContent("studio", studioSeed as Studio));
  const artworks = useMemo(
    () => galleryData.filter((g) => !g.archived && g.kind === "small"),
    [galleryData],
  );
  const [modalItem, setModalItem] = useState<GalleryItem | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const hp = homepageData.home;
  const heroMedia = hp.heroMedia?.trim() ?? "";

  const featuredProjects = useMemo((): PinterestCardProject[] => {
    const fromWork: PinterestCardProject[] = projectsData
      .filter((p) => !p.archived && p.featured)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        coverImage: p.coverImage,
        year: p.year,
        tags: p.tags ?? [],
        type: p.type,
        subtitle: p.subtitle,
        cardDescription: p.cardDescription,
        href: `/work/${p.slug}`,
        hoverVideo: p.hoverVideo,
        liveUrl: p.liveUrl,
      }));
    const fromStudio: PinterestCardProject[] = galleryData
      .filter((g) => !g.archived && g.featured)
      .map((g) => ({
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
      }));
    return [...fromWork, ...fromStudio].slice(0, 6);
  }, [projectsData, galleryData]);
  const [firstName, lastName] = useMemo(
    () => splitName(identityData.name),
    [identityData.name],
  );
  const yearsExperience = aboutData.yearsExperience ?? "3+";
  const STATS = useMemo(
    () => buildStats(contactData.location, yearsExperience),
    [contactData.location, yearsExperience],
  );

  return (
    <div className="w-full flex flex-col gap-32 md:gap-48 pt-12 md:pt-24 pb-20">
      {/* ── Hero ── */}
      <section className="relative flex flex-col gap-8 md:gap-10">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <FloatingDecor opacity={0.4} />
        </div>

        <div className="absolute right-0 bottom-0 md:right-4 md:bottom-8 z-20 hidden sm:block">
          <RotatingLiveBadge
            href={hp.primaryCtaHref || "/work"}
            label={hp.badgeLabel?.trim() || "VIEW WORK • VIEW WORK •"}
            size={176}
            fill="#FFFFFF"
            textColor="#1A5BD4"
          />
        </div>

        <motion.span
          className="relative z-10 text-sm uppercase tracking-[0.5em] font-sans"
          style={{ color: BLUE }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {hp.heroEyebrow}
        </motion.span>

        <h1
          className="relative z-10 font-display font-black uppercase leading-[0.9] tracking-tight"
          style={{ fontSize: "clamp(4rem,13vw,12rem)" }}
          aria-label={identityData.name}
        >
          <motion.span
            className="block"
            style={{ color: BLUE }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            {firstName}
          </motion.span>
          {lastName && (
            <motion.span
              className="block text-foreground"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            >
              {lastName}
            </motion.span>
          )}
        </h1>

        <motion.p
          className="relative z-10 max-w-xl text-muted-foreground text-lg md:text-xl leading-relaxed font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
        >
          {hp.heroIntro}
        </motion.p>

        {heroMedia ? (
          <motion.div
            className="relative z-10 w-full max-w-3xl rounded-2xl overflow-hidden border border-border/40 shadow-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <CoverMedia
              src={heroMedia}
              alt={hp.heroMediaAlt?.trim() || "Homepage hero"}
              mimeHint={hp.heroMediaMime}
              className="w-full aspect-video object-cover"
              loading="eager"
            />
          </motion.div>
        ) : null}

        <motion.div
          className="relative z-10 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.8 }}
        >
          {STATS.map(({ label, sub, color }) => (
            <div
              key={sub}
              className="flex flex-col px-4 py-2.5 rounded-xl"
              style={{ background: color + "1a", border: `1.5px solid ${color}50` }}
            >
              <span
                className="font-display font-black uppercase text-lg leading-none"
                style={{ color }}
              >
                {label}
              </span>
              <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans mt-0.5">
                {sub}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="relative z-10 flex flex-wrap gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <Link
            href={hp.primaryCtaHref}
            className="inline-flex items-center justify-center h-11 rounded-full text-sm font-sans font-bold uppercase tracking-[0.18em] leading-none border-2 box-border pl-[calc(1.75rem+0.18em)] pr-7 transition-opacity hover:opacity-85"
            style={{
              background: "#1A5BD4",
              borderColor: "#1A5BD4",
              color: "#FFFFFF",
            }}
          >
            {hp.primaryCtaLabel}
          </Link>
          <Link
            href={hp.secondaryCtaHref}
            className="inline-flex items-center justify-center h-11 rounded-full text-sm font-sans font-bold uppercase tracking-[0.18em] leading-none border-2 box-border pl-[calc(1.75rem+0.18em)] pr-7 transition-opacity hover:opacity-85"
            style={{
              background: "transparent",
              borderColor: BLUE + "55",
              color: BLUE,
            }}
          >
            {hp.secondaryCtaLabel}
          </Link>
        </motion.div>
      </section>

      {/* ── Featured Projects ── */}
      <section className="flex flex-col gap-12">
        <div
          className="flex justify-between items-end pb-6"
          style={{ borderBottom: `2px solid ${BLUE}55` }}
        >
          <h2
            className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight"
            style={{ color: BLUE }}
          >
            {hp.selectedWorkHeading}
          </h2>
          <Link
            href="/work"
            className="text-sm uppercase tracking-widest font-sans hover:opacity-70 transition-opacity"
            style={{ color: BLUE }}
          >
            {hp.selectedWorkLinkLabel}
          </Link>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch"
        >
          {featuredProjects.map((project, i) => (
            <motion.div key={project.id} variants={item} className="h-full">
              <PinterestCard project={project} i={i} isDark={isDark} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Studio slideshow ── */}
      {hp.showStudioBand !== false && artworks.length > 0 && (
        <section className="flex flex-col gap-12">
          <AnimatePresence>
            {modalItem && (
              <ArtworkModal item={modalItem} onClose={() => setModalItem(null)} />
            )}
          </AnimatePresence>
          <div
            className="flex items-end gap-6 pb-6 flex-wrap"
            style={{ borderBottom: `2px solid ${BLUE}55` }}
          >
            <h2
              className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight"
              style={{ color: BLUE }}
            >
              {hp.studioHeading?.trim() || "From the Studio"}
            </h2>
            <Link
              href="/studio"
              className="text-sm uppercase tracking-widest font-sans hover:opacity-70 transition-opacity"
              style={{ color: BLUE }}
            >
              {hp.studioLinkLabel?.trim() || "Visit Studio →"}
            </Link>
          </div>
          <ArtworksSlideshow
            items={artworks}
            onOpen={setModalItem}
            cardSize={studio.artworksCardSize}
          />
        </section>
      )}

      {/* ── Brief About ── */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="p-8 md:p-16 rounded-2xl flex flex-col md:flex-row gap-12 justify-between"
        style={{ background: BLUE + "10", border: `2px solid ${BLUE}35` }}
      >
        <div className="flex flex-col gap-3 shrink-0">
          <span
            className="text-sm uppercase tracking-[0.45em] font-sans font-bold"
            style={{ color: BLUE }}
          >
            {hp.aboutEyebrow}
          </span>
          <h2
            className="font-display font-black uppercase text-4xl md:text-5xl leading-tight"
            style={{ color: BLUE }}
          >
            {hp.aboutHeading}
          </h2>
        </div>
        <div className="max-w-2xl flex flex-col gap-6 text-muted-foreground text-lg leading-relaxed">
          <p>{aboutData.bio[0]}</p>
          <Link
            href="/about"
            className="inline-block w-max pb-1 text-sm uppercase tracking-widest font-sans font-bold transition-opacity hover:opacity-70"
            style={{ color: BLUE, borderBottom: `2px solid ${BLUE}60` }}
          >
            {hp.aboutCtaLabel}
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
