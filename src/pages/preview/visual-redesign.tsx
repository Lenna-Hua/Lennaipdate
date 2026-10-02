import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type SpringOptions,
} from "framer-motion";
import { Sparkles, Heart, Zap } from "lucide-react";
import projectsSeed from "@/data/projects.json";
import aboutSeed from "@/data/about.json";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import homepageSeed from "@/data/homepage.json";
import { useContent } from "@/lib/use-content";
import { FloatingDecor } from "@/components/FloatingDecor";
import { PinterestCard } from "@/components/PinterestCard";
import { CoverMedia } from "@/components/CoverMedia";
import { useTheme } from "@/context/ThemeContext";
import { BRAND, BRAND_DECK, BRAND_EASE, BRAND_HOVER } from "@/lib/brand";

const BLUE = BRAND.blue;
const SPRING: SpringOptions = { stiffness: 280, damping: 22 };

type Project = (typeof projectsSeed)[number] & { archived?: boolean };

const STICKERS = [
  { src: "/case-studies/habiganize/corgi.png", label: "Corgi" },
  { src: "/case-studies/habiganize/shiba.png", label: "Shiba" },
  { src: "/case-studies/habiganize/golden.png", label: "Golden" },
];

const FLOAT_BADGES = [
  { Icon: Sparkles, color: BRAND.pink, x: "12%", y: "18%", depth: 28 },
  { Icon: Heart, color: BRAND.coral, x: "86%", y: "22%", depth: 22 },
  { Icon: Zap, color: BRAND.teal, x: "78%", y: "68%", depth: 26 },
  { Icon: Sparkles, color: BRAND.blue, x: "8%", y: "72%", depth: 20 },
];

function splitName(full: string): [string, string] {
  const trimmed = (full || "").trim();
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return [trimmed, ""];
  return [trimmed.slice(0, idx), trimmed.slice(idx + 1)];
}

function buildStats(location: string, yearsExperience = "3+") {
  const years = (yearsExperience || "3+").trim() || "3+";
  const stats = [
    { id: "years", label: years, sub: "Years", pop: "🎯" },
    { id: "projects", label: "20+", sub: "Projects", pop: "✦" },
    { id: "studies", label: "8+", sub: "Studies", pop: "🔬" },
  ];
  const trimmed = (location ?? "").trim();
  if (trimmed) {
    stats.push({ id: "loc", label: trimmed.split(",")[0].trim(), sub: "Based", pop: "📍" });
  }
  return stats;
}

/** Cursor-reactive floating icons — same energy as /work, but hero-scoped. */
function HeroCursorIcons() {
  const rootRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const tick = (t: number) => {
      current.current.x += (target.current.x - current.current.x) * 0.07;
      current.current.y += (target.current.y - current.current.y) * 0.07;
      const cx = current.current.x - 0.5;
      const cy = current.current.y - 0.5;
      const root = rootRef.current;
      if (root) {
        root.querySelectorAll<HTMLElement>("[data-drift]").forEach((node, i) => {
          const depth = Number(node.dataset.depth ?? 16);
          const idle = Math.sin(t / 1100 + i) * 4;
          node.style.transform = `translate3d(${cx * depth + idle}px,${cy * depth + Math.cos(t / 1300 + i) * 4}px,0) rotate(${cx * depth * 0.3}deg)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {FLOAT_BADGES.map(({ Icon, color, x, y, depth }, i) => (
        <div
          key={i}
          data-drift
          data-depth={depth}
          className="absolute"
          style={{ left: x, top: y, color, opacity: 0.7, willChange: "transform" }}
        >
          <Icon size={26} strokeWidth={1.8} />
        </div>
      ))}
    </div>
  );
}

function MagneticLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.22);
    y.set((e.clientY - r.top - r.height / 2) * 0.22);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const isPrimary = variant === "primary";
  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={onMove} onMouseLeave={onLeave} className="inline-block">
      <Link
        href={href}
        className="inline-flex items-center justify-center h-12 rounded-full text-sm font-sans font-bold uppercase tracking-[0.16em] px-8 transition-shadow duration-300"
        style={
          isPrimary
            ? { background: BLUE, color: "#fff", boxShadow: `0 8px 32px ${BLUE}55` }
            : { border: `2px solid ${BLUE}55`, color: BLUE, background: "transparent" }
        }
      >
        {children}
      </Link>
    </motion.div>
  );
}

function PopStatPill({
  label,
  sub,
  pop,
  accent,
}: {
  label: string;
  sub: string;
  pop: string;
  accent: string;
}) {
  const [popped, setPopped] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={() => setPopped((v) => !v)}
      className="relative flex flex-col items-start px-4 py-2.5 rounded-xl text-left cursor-pointer"
      style={{ background: accent + "1a", border: `1.5px solid ${accent}50` }}
      whileHover={{ scale: 1.06, rotate: -1 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
    >
      <AnimatePresence>
        {popped && (
          <motion.span
            className="absolute -top-3 -right-2 text-lg pointer-events-none"
            initial={{ opacity: 0, y: 8, scale: 0.5 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
          >
            {pop}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="font-display font-black uppercase text-lg leading-none" style={{ color: accent }}>
        {label}
      </span>
      <span className="text-muted-foreground text-xs uppercase tracking-widest font-sans mt-0.5">{sub}</span>
    </motion.button>
  );
}

function TiltWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rotateX.set(-py * 10);
    rotateY.set(px * 10);
  };
  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FlagshipSpotlight({ project }: { project: Project }) {
  const [hovered, setHovered] = useState(false);
  const accent = BRAND.pink;

  return (
    <TiltWrap>
      <Link
        href={`/work/${project.slug}`}
        className="group block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <article
          className="relative rounded-2xl overflow-hidden"
          style={{
            border: `2px solid ${hovered ? accent : BLUE + "44"}`,
            boxShadow: hovered
              ? `0 24px 80px -12px ${accent}66, 0 0 0 1px ${accent}33 inset`
              : `0 20px 60px -16px ${BLUE}44`,
            transition: "border-color 0.35s, box-shadow 0.35s",
          }}
        >
          <div className="relative aspect-[21/9] min-h-[240px] md:min-h-[300px]">
            <CoverMedia
              src={project.coverImage}
              alt={project.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                background: hovered
                  ? "linear-gradient(105deg, rgba(8,10,18,0.92) 0%, rgba(236,72,153,0.25) 55%, transparent 100%)"
                  : "linear-gradient(105deg, rgba(8,10,18,0.88) 0%, rgba(31,103,241,0.2) 50%, transparent 100%)",
              }}
            />

            {/* Floating pet stickers on hover — entry-page energy */}
            <div aria-hidden className="absolute inset-0 pointer-events-none">
              {STICKERS.map((s, i) => (
                <AnimatePresence key={s.src}>
                  {hovered && (
                    <motion.div
                      className="absolute w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 shadow-xl"
                      style={{
                        borderColor: "rgba(255,255,255,0.35)",
                        left: "50%",
                        top: "50%",
                        zIndex: 10 + i,
                      }}
                      initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.6 }}
                      animate={{
                        opacity: 1,
                        x: [-20, -120, 130][i],
                        y: [-30, 40, -50][i],
                        rotate: [-12, 8, -6][i],
                        scale: 1,
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.5, delay: i * 0.06, ease: BRAND_EASE }}
                    >
                      <CoverMedia src={s.src} alt="" className="w-full h-full object-cover" />
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 gap-2 z-20">
              <motion.span
                className="text-[10px] uppercase tracking-[0.3em] font-sans font-bold w-max px-3 py-1 rounded-full"
                animate={{
                  background: hovered ? `${accent}44` : `${BLUE}33`,
                  borderColor: hovered ? accent : BLUE,
                }}
                style={{ color: "#fff", border: "1px solid" }}
              >
                ✦ Flagship · Hover me
              </motion.span>
              <h3 className="font-display font-black uppercase text-2xl md:text-5xl text-white leading-[0.95] tracking-tight">
                {project.title.split(":")[0]}
              </h3>
              <p className="text-sm md:text-base text-white/75 font-sans max-w-xl line-clamp-2">
                {project.subtitle}
              </p>
            </div>
          </div>
        </article>
      </Link>
    </TiltWrap>
  );
}

function PreviewBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 -mx-6 md:-mx-12 lg:-mx-16 px-6 md:px-12 lg:px-16 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
      style={{
        background: `linear-gradient(90deg, ${BRAND.blue}18, ${BRAND.pink}14, ${BRAND.teal}12)`,
        borderColor: `${BLUE}33`,
      }}
    >
      <div className="flex items-center gap-2 text-sm font-sans flex-wrap">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.pink})` }}
        >
          Fun preview
        </span>
        <span className="text-muted-foreground">
          More interaction — move your mouse, hover the flagship, click the stat pills ✦
        </span>
      </div>
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.2em] font-sans font-bold hover:opacity-70 transition-opacity"
        style={{ color: BLUE }}
      >
        Live home →
      </Link>
    </motion.div>
  );
}

export default function VisualRedesignPreview() {
  const projectsData = useContent("projects", projectsSeed) as Project[];
  const aboutData = useContent("about", aboutSeed) as typeof aboutSeed;
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const homepageData = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const hp = homepageData.home;

  const [firstName, lastName] = useMemo(() => splitName(identityData.name), [identityData.name]);
  const stats = useMemo(
    () => buildStats(contactData.location, aboutData.yearsExperience),
    [contactData.location, aboutData.yearsExperience],
  );

  const flagship = useMemo(
    () => projectsData.find((p) => p.slug === "habiganize" && !p.archived),
    [projectsData],
  );
  const gridProjects = useMemo(
    () => projectsData.filter((p) => !p.archived && p.featured && p.slug !== "habiganize").slice(0, 3),
    [projectsData],
  );
  const projectIndexMap = useMemo(
    () => new Map(projectsData.map((p, i) => [p.id, i])),
    [projectsData],
  );

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const onHeroMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  }, [mouseX, mouseY]);

  const nameShiftX = useSpring(useTransform(mouseX, (v) => v * 14), SPRING);
  const nameShiftY = useSpring(useTransform(mouseY, (v) => v * 10), SPRING);

  return (
    <div className="w-full flex flex-col gap-28 md:gap-40 pt-4 pb-20">
      <PreviewBanner />

      {/* ── Interactive hero ── */}
      <section
        className="relative flex flex-col gap-8 md:gap-10"
        onMouseMove={onHeroMove}
      >
        <FloatingDecor opacity={0.55} />
        <HeroCursorIcons />

        <motion.span
          className="relative z-10 text-sm uppercase tracking-[0.5em] font-sans"
          style={{ color: BRAND.pink }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {hp.heroEyebrow}
        </motion.span>

        <motion.h1
          className="relative z-10 font-display font-black uppercase leading-[0.9] tracking-tight"
          style={{ fontSize: "clamp(4rem,13vw,12rem)", x: nameShiftX, y: nameShiftY }}
          aria-label={identityData.name}
        >
          <motion.span className="block" style={{ color: BLUE }}>
            {firstName.split("").map((ch, i) => (
              <motion.span
                key={`f-${i}`}
                className="inline-block"
                whileHover={{ y: -12, color: BRAND.pink, rotate: [-4, 4, 0][i % 3] }}
                transition={{ type: "spring", stiffness: 400, damping: 14 }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.span>
          {lastName && (
            <span className="block text-foreground">
              {lastName.split("").map((ch, i) => (
                <motion.span
                  key={`l-${i}`}
                  className="inline-block"
                  whileHover={{ y: -10, color: BRAND.teal }}
                  transition={{ type: "spring", stiffness: 400, damping: 14 }}
                >
                  {ch === " " ? "\u00a0" : ch}
                </motion.span>
              ))}
            </span>
          )}
        </motion.h1>

        <motion.p
          className="relative z-10 max-w-xl text-muted-foreground text-lg md:text-xl leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {hp.heroIntro}
        </motion.p>

        <div className="relative z-10 flex flex-wrap gap-3">
          {stats.map((s, i) => (
            <PopStatPill
              key={s.id}
              label={s.label}
              sub={s.sub}
              pop={s.pop}
              accent={BRAND_DECK[i % BRAND_DECK.length]}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-wrap gap-4">
          <MagneticLink href={hp.primaryCtaHref}>{hp.primaryCtaLabel}</MagneticLink>
          <MagneticLink href={hp.secondaryCtaHref} variant="ghost">
            {hp.secondaryCtaLabel}
          </MagneticLink>
        </div>
      </section>

      {/* ── Flagship spotlight ── */}
      {flagship && (
        <section className="flex flex-col gap-6">
          <div className="flex justify-between items-end pb-4" style={{ borderBottom: `2px solid ${BRAND.coral}44` }}>
            <h2 className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight" style={{ color: BRAND.coral }}>
              Spotlight
            </h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-sans hidden sm:inline">
              Hover for pups →
            </span>
          </div>
          <FlagshipSpotlight project={flagship} />
        </section>
      )}

      {/* ── Selected work grid (keep glow cards) ── */}
      <section className="flex flex-col gap-12">
        <div className="flex justify-between items-end pb-6" style={{ borderBottom: `2px solid ${BLUE}55` }}>
          <h2 className="font-display font-black uppercase text-3xl md:text-4xl tracking-tight" style={{ color: BLUE }}>
            {hp.selectedWorkHeading}
          </h2>
          <Link href="/work" className="text-sm uppercase tracking-widest font-sans hover:opacity-70" style={{ color: BLUE }}>
            {hp.selectedWorkLinkLabel}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {gridProjects.map((project, gi) => {
            const i = projectIndexMap.get(project.id) ?? gi;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: gi * 0.08, duration: 0.65, ease: BRAND_EASE }}
                whileHover={{ y: BRAND_HOVER.lift, rotate: BRAND_HOVER.rotate }}
              >
                <PinterestCard project={project} i={i} isDark={isDark} />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── About — playful hover blob ── */}
      <motion.section
        className="relative p-8 md:p-16 rounded-2xl overflow-hidden flex flex-col md:flex-row gap-12 justify-between"
        style={{ border: `2px solid ${BRAND.teal}40`, background: `${BRAND.teal}0c` }}
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        <motion.div
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 320,
            height: 320,
            right: "-10%",
            top: "-20%",
            background: `radial-gradient(circle, ${BRAND.pink}44, transparent 70%)`,
            filter: "blur(40px)",
          }}
          animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative z-10 flex flex-col gap-3 shrink-0">
          <span className="text-sm uppercase tracking-[0.45em] font-sans font-bold" style={{ color: BRAND.teal }}>
            {hp.aboutEyebrow}
          </span>
          <h2 className="font-display font-black uppercase text-4xl md:text-5xl leading-tight" style={{ color: BRAND.teal }}>
            {hp.aboutHeading}
          </h2>
        </div>
        <div className="relative z-10 max-w-2xl flex flex-col gap-6 text-muted-foreground text-lg leading-relaxed">
          <p>{aboutData.bio[0]}</p>
          <MagneticLink href="/about">{hp.aboutCtaLabel}</MagneticLink>
        </div>
      </motion.section>

      <p className="text-center text-xs text-muted-foreground font-sans uppercase tracking-[0.2em]">
        Preview only — not on live /home yet
      </p>
    </div>
  );
}
