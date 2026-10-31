import { useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
// Decorative gallery/project thumbnails come straight from bundled JSON
// — these only pick a few preview images and don't need live admin
// updates. Editable copy goes through useContent("homepage", ...) below.
import projectsData from "@/data/projects.json";
import galleryData from "@/data/gallery.json";
import homepageSeed from "@/data/homepage.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { CursorBlockField } from "@/components/CursorBlockField";
import { SafeImage } from "@/components/SafeImage";
import { coverStillSrc } from "@/components/CoverMedia";
import { lockEntryDark, unlockEntryDark } from "@/context/ThemeContext";
import { BRAND, BRAND_EASE, BRAND_HOVER } from "@/lib/brand";

const BLUE = BRAND.blue;

/* The landing/entry page is intentionally locked to a dark presentation
   regardless of the user's theme preference — it's the brand's first
   impression. Other pages still respect the theme toggle. */
const COLORS = {
  bg:                 "hsl(30 10% 4%)",
  cardBorder:         "rgba(255,255,255,0.32)",
  cardActiveBg:       "rgba(31,103,241,0.08)",
  title:              "#FFFFFF",
  titleInverseOnBlue: "#FFFFFF",
  numberIdle:         "rgba(255,255,255,0.6)",
  description:        "rgba(255,255,255,0.7)",
  topbarText:         "rgba(255,255,255,0.6)",
  bottomPrompt:       "rgba(255,255,255,0.5)",
  previewBorder:      "rgba(255,255,255,0.18)",
  pillBorder:         "rgba(31,103,241,0.18)",
} as const;

type EntryColors = typeof COLORS;

const PILLS = [
  { w: 200, h: 46, top: 5,  left: 2,  delay: 0   },
  { w: 140, h: 40, top: 6,  left: 20, delay: 1.2 },
  { w: 190, h: 44, top: 4,  left: 55, delay: 0.6 },
  { w: 130, h: 40, top: 7,  left: 80, delay: 2.0 },
  { w: 160, h: 44, top: 19, left: 10, delay: 0.9 },
  { w: 240, h: 48, top: 20, left: 38, delay: 0.3 },
  { w: 155, h: 42, top: 18, left: 74, delay: 1.8 },
  { w: 130, h: 40, top: 34, left: 1,  delay: 1.4 },
  { w: 175, h: 44, top: 35, left: 84, delay: 0.7 },
  { w: 110, h: 38, top: 33, left: 48, delay: 2.3 },
  { w: 180, h: 44, top: 50, left: 7,  delay: 0.5 },
  { w: 145, h: 40, top: 49, left: 36, delay: 1.6 },
  { w: 205, h: 46, top: 51, left: 66, delay: 1.1 },
  { w: 160, h: 42, top: 65, left: 15, delay: 0.2 },
  { w: 185, h: 44, top: 66, left: 53, delay: 1.9 },
  { w: 120, h: 38, top: 64, left: 86, delay: 0.8 },
  { w: 200, h: 44, top: 80, left: 3,  delay: 1.3 },
  { w: 155, h: 40, top: 81, left: 30, delay: 0.4 },
  { w: 175, h: 44, top: 79, left: 64, delay: 1.7 },
  { w: 130, h: 38, top: 82, left: 89, delay: 2.2 },
];

type PreviewSlot = {
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
};

type PreviewItem = PreviewSlot & {
  key: string;
  src: string;
  alt: string;
};

const DESIGN_PREVIEWS: PreviewItem[] = [
  { key: "ttc-ux-redesign",         dx: -170, dy: -90,  rotate: -8, delay: 0    },
  { key: "kijiji-trust-safety",     dx:  160, dy: -70,  rotate:  7, delay: 0.08 },
  { key: "freshii-moderated-study", dx: -140, dy:  110, rotate:  5, delay: 0.16 },
].map((slot) => {
  const project = projectsData.find((p) => p.slug === slot.key) as
    | { coverImage: string; coverMime?: string; coverPoster?: string; title: string }
    | undefined;
  return {
    ...slot,
    src: project ? coverStillSrc(project.coverImage, project.coverMime, project.coverPoster) : "",
    alt: project?.title ?? slot.key,
  };
});
const ART_SLOTS: PreviewSlot[] = [
  { dx:  155, dy: -80,  rotate:  8, delay: 0    },
  { dx: -160, dy: -60,  rotate: -6, delay: 0.09 },
  { dx:  130, dy:  115, rotate: -4, delay: 0.18 },
];

/* Pick random gallery items (without replacement when possible) to
   serve as the floating preview imagery for the Art & Creative block.
   Drawn fresh on each entry-page mount so revisits feel varied. */
function pickRandomGalleryPreviews(slots: PreviewSlot[]): PreviewItem[] {
  const pool = (galleryData as Array<{ id: string; title: string; coverImage: string }>)
    .filter((g) => !!g.coverImage);
  if (pool.length === 0) return [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return slots.map((slot, i) => {
    const pick = shuffled[i % shuffled.length];
    return {
      ...slot,
      key: `${pick.id}-${i}`,
      src: pick.coverImage,
      alt: pick.title,
    };
  });
}

function FloatingPreviews({
  items,
  visible,
  colors,
}: {
  items: PreviewItem[];
  visible: boolean;
  colors: EntryColors;
}) {
  return (
    <div aria-hidden="true">
      {items.map((item, i) => {
        if (!item.src) return null;
        return (
          <AnimatePresence key={item.key}>
            {visible && (
              <motion.div
                className="absolute pointer-events-none rounded-xl overflow-hidden"
                style={{
                  width: "128px",
                  aspectRatio: "4/3",
                  left: "50%",
                  top: "50%",
                  translateX: "-50%",
                  translateY: "-50%",
                  zIndex: 10 + i,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
                  border: `1.5px solid ${colors.previewBorder}`,
                }}
                initial={{ opacity: 0, x: item.dx * 0.3, y: item.dy * 0.3, rotate: 0, scale: 0.75 }}
                animate={{
                  opacity: 1,
                  x: item.dx,
                  y: item.dy,
                  rotate: item.rotate,
                  scale: 1,
                }}
                exit={{ opacity: 0, x: item.dx * 0.5, y: item.dy * 0.5, scale: 0.8 }}
                transition={{ duration: 0.55, delay: item.delay, ease: BRAND_EASE }}
              >
                <SafeImage
                  src={item.src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
}

type Side = "design" | "art";

/* Per-card idle gradient — gives each block a richer base sheen so the
   cards no longer read as plain transparent rectangles. The active
   (hover) state still uses the unified blue glow. */
function idleCardBg(accent: string) {
  return `radial-gradient(120% 90% at 0% 0%, ${accent}3D 0%, ${accent}14 40%, rgba(255,255,255,0.03) 100%)`;
}

function EntryBlock({
  side,
  number,
  title,
  description,
  href,
  previews,
  hovered,
  setHovered,
  delayBase,
  colors,
  accent,
}: {
  side: Side;
  number: string;
  title: React.ReactNode;
  description: string;
  href: string;
  previews: PreviewItem[];
  hovered: Side | null;
  setHovered: (s: Side | null) => void;
  delayBase: number;
  colors: EntryColors;
  accent: string;
}) {
  const isActive = hovered === side;
  // Hover speeds up the drifting blobs for an energetic reaction.
  const tempo = isActive ? 0.6 : 1;
  return (
    <motion.div
      className="relative flex-1 flex flex-col gap-5 md:gap-6 px-8 md:px-12 py-10 md:py-14 cursor-pointer group rounded-xl transition-[border,background,box-shadow] duration-300 overflow-hidden"
      style={{
        border: isActive
          ? `2px solid ${accent}`
          : `2px solid ${colors.cardBorder}`,
        background: isActive ? `${accent}14` : idleCardBg(accent),
        boxShadow: isActive
          ? `0 0 48px ${accent}40, 0 0 0 1px ${accent} inset`
          : `0 0 28px ${accent}1F, inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 60px ${accent}14`,
      }}
      whileHover={{ y: BRAND_HOVER.lift, rotate: BRAND_HOVER.rotate }}
      transition={{ duration: 0.35, ease: BRAND_EASE }}
      onMouseEnter={() => setHovered(side)}
      onMouseLeave={() => setHovered(null)}
    >
      <Link
        href={href}
        aria-label={typeof title === "string" ? title : `Enter ${side}`}
        className="absolute inset-0 z-30 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ ["--tw-ring-color" as string]: accent }}
      />
      {/* ── Floating accent blobs — three layered, blurred radial blobs
            in the card's single accent hue. Each blob runs its own
            infinite CSS keyframe loop at a *different* duration so
            their phases never re-align, making the color appear to
            drift and float continuously inside the card.
            (Plain CSS animations avoid any framer-motion gating and
            run reliably across browsers.) ── */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          left: "-20%",
          top: "-25%",
          width: "85%",
          height: "85%",
          background: `radial-gradient(circle, ${accent}66 0%, ${accent}1F 40%, transparent 72%)`,
          filter: "blur(50px)",
          willChange: "transform",
          animation: `entry-blob-drift-1 ${4 * tempo}s ease-in-out infinite`,
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          right: "-25%",
          bottom: "-30%",
          width: "95%",
          height: "95%",
          background: `radial-gradient(circle, ${accent}4D 0%, ${accent}14 40%, transparent 70%)`,
          filter: "blur(60px)",
          willChange: "transform",
          animation: `entry-blob-drift-2 ${5.5 * tempo}s ease-in-out infinite`,
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          left: "30%",
          top: "30%",
          width: "55%",
          height: "55%",
          background: `radial-gradient(circle, ${accent}40 0%, ${accent}14 40%, transparent 70%)`,
          filter: "blur(45px)",
          willChange: "transform",
          animation: `entry-blob-drift-3 ${7.5 * tempo}s ease-in-out infinite`,
        }}
      />

      {/* Floating preview cards on hover */}
      <FloatingPreviews items={previews} visible={isActive} colors={colors} />

      {/* Number label — mono for numeric metadata. */}
      <motion.span
        className="text-sm uppercase tracking-[0.48em] font-mono relative z-10"
        animate={{ color: isActive ? accent : colors.numberIdle }}
        transition={{ duration: 0.35 }}
      >
        {number}
      </motion.span>

      {/* Title */}
      <div className="overflow-hidden relative z-10">
        <motion.h2
          className="font-display font-black uppercase leading-[0.85] tracking-tight"
          style={{ fontSize: "clamp(3rem,8vw,7.5rem)" }}
          initial={{ y: 80, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            color: isActive ? accent : colors.title,
          }}
          transition={{
            y: { duration: 0.9, ease: BRAND_EASE, delay: delayBase },
            opacity: { duration: 0.9, delay: delayBase },
            color: { duration: 0.35 },
          }}
        >
          {title}
        </motion.h2>
      </div>

      {/* Description */}
      <motion.p
        className="text-sm font-sans max-w-[240px] leading-relaxed relative z-10"
        style={{ color: colors.description }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delayBase + 0.35, duration: 0.8 }}
      >
        {description}
      </motion.p>

      {/* Enter pill button */}
      <motion.div
        className="relative z-10 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delayBase + 0.5, duration: 0.6 }}
      >
        <motion.span
          className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.32em] font-sans font-bold px-5 py-2.5 rounded-full transition-all duration-300"
          style={{
            border: `1.5px solid ${accent}`,
            color: isActive ? colors.titleInverseOnBlue : accent,
            background: isActive ? accent : "transparent",
          }}
          animate={{ x: isActive ? 8 : 0 }}
          transition={{ duration: 0.35, ease: BRAND_EASE }}
        >
          Enter <span className="text-base leading-none">→</span>
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

/* Per-block accents. Each card stays in a single hue — Product Design
   floats in brand blue, Art & Creative floats in pink. */
const DESIGN_ACCENT = BRAND.blue;
const ART_ACCENT    = BRAND.pink;

export default function Entry() {
  const [hovered, setHovered] = useState<Side | null>(null);
  const homepageData = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const hp = homepageData.entry;
  /* Resolve the Art & Creative block's floating previews from a random
     selection of Studio gallery items, locked in once per mount so the
     imagery is consistent during the visit but varies between visits. */
  const [artPreviews] = useState<PreviewItem[]>(() =>
    pickRandomGalleryPreviews(ART_SLOTS),
  );

  /* The entry page is locked to a dark presentation. While it's
     mounted we forcibly apply the dark CSS variables + `.dark` class
     to <html> so the global root tokens match the entry's hardcoded
     dark palette — this prevents any light-mode "pop" caused by a
     mismatch between the page's painted background and stale root
     tokens left over from an inner light-mode page.

     On unmount we synchronously restore whichever theme the visitor
     has saved in localStorage so the next page paints in the user's
     chosen mode without an intermediate light/dark flash. We never
     write to localStorage from here — the visitor's preference must
     stay untouched.

     useLayoutEffect (not useEffect) runs before the browser paints,
     so both the dark forcing on mount and the saved-theme restore on
     unmount happen ahead of the framer-motion page transition. */
  useLayoutEffect(() => {
    lockEntryDark();
    return unlockEntryDark;
  }, []);

  return (
    <main
      id="main-content"
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        style={{ background: DESIGN_ACCENT, color: "#fff" }}
      >
        Skip to content
      </a>
      {/* Visually hidden h1 for screen readers */}
      <h1 className="sr-only">{hp.wordmarkPrefix}{hp.wordmarkSuffix} — Portfolio</h1>
      {/* ── Floating pill grid ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {PILLS.map((pill, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width:  pill.w,
              height: pill.h,
              top:    `${pill.top}%`,
              left:   `${pill.left}%`,
              border: `1.5px solid ${COLORS.pillBorder}`,
              animation: `pill-float ${10 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${pill.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Cursor-reactive block field (entry is locked to dark) ── */}
      <CursorBlockField />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 md:px-14 py-5 pointer-events-none">
        <span
          aria-label={hp.wordmarkPrefix}
          className="font-display font-black uppercase tracking-tight leading-none select-none text-2xl md:text-3xl"
          style={{ color: "#FFFFFF" }}
        >
          {hp.wordmarkPrefix}<span style={{ color: "var(--brand-blue, #5B8CFF)" }}>{hp.wordmarkSuffix}</span>
        </span>
        <motion.span
          className="hidden md:block text-sm uppercase tracking-[0.38em] font-sans"
          style={{ color: COLORS.topbarText }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {hp.topbarTagline}
        </motion.span>
      </div>

      {/* ── Two card blocks ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-10 pb-28 md:pb-24">
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-6 w-full max-w-6xl">

          {/* Product Design block */}
          <EntryBlock
            side="design"
            number={hp.designCard.number}
            title={<>{hp.designCard.titleLine1}<br />{hp.designCard.titleLine2}</>}
            description={hp.designCard.description}
            href="/work"
            previews={DESIGN_PREVIEWS}
            hovered={hovered}
            setHovered={setHovered}
            delayBase={0.1}
            colors={COLORS}
            accent={DESIGN_ACCENT}
          />

          {/* Art & Creative block — opens as a project case study */}
          <EntryBlock
            side="art"
            number={hp.artCard.number}
            title={<>{hp.artCard.titleLine1}<br />{hp.artCard.titleLine2}</>}
            description={hp.artCard.description}
            href="/studio"
            previews={artPreviews}
            hovered={hovered}
            setHovered={setHovered}
            delayBase={0.22}
            colors={COLORS}
            accent={ART_ACCENT}
          />
        </div>
      </div>

      {/* ── Bottom identity + site links (finished-site chrome for visitors and ad crawlers) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-14 pb-5 pt-4 flex flex-col items-center gap-3">
        <motion.span
          className="text-sm uppercase tracking-[0.45em] font-sans pointer-events-none"
          style={{ color: COLORS.bottomPrompt }}
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 0 : 1 }}
          transition={{ duration: 0.3, delay: hovered ? 0 : 0.9 }}
        >
          {hp.bottomPrompt}
        </motion.span>
        <nav
          aria-label="Site"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.18em] font-sans"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {[
            { href: "/home", label: "Home" },
            { href: "/work", label: "Work" },
            { href: "/studio", label: "Studio" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/privacy", label: "Privacy" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
              style={{ ["--tw-ring-color" as string]: DESIGN_ACCENT }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {(identityData.role || contactData.email) && (
          <p className="text-[11px] font-sans text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
            {identityData.role}
            {identityData.role && contactData.email ? " · " : ""}
            {contactData.email && (
              <a href={`mailto:${contactData.email}`} className="hover:text-white transition-colors">
                {contactData.email}
              </a>
            )}
          </p>
        )}
      </div>
    </main>
  );
}
