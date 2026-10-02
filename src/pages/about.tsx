import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Award } from "lucide-react";
import aboutSeed from "@/data/about.json";
import experienceSeed from "@/data/experience.json";
import educationSeed from "@/data/education.json";
import filesSeed from "@/data/files.json";
import { useContent } from "@/lib/use-content";

type ResumeMeta = { url?: string; filename?: string; updatedAt?: string };
type FilesShape = { resume?: ResumeMeta };

function resumeHref(resume: ResumeMeta | undefined): string {
  const fallback = `${import.meta.env.BASE_URL}Lenna_Hua_Resume.pdf`;
  const raw = (resume?.url ?? "").trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return import.meta.env.BASE_URL + raw.replace(/^\/+/, "");
}

import { FloatingDecor } from "@/components/FloatingDecor";
import { SafeImage } from "@/components/SafeImage";
import { ContactSection } from "@/components/ContactSection";
import type { About as AboutData, CommunityItem, EducationItem } from "@/components/admin/types";

const BLUE = "#1F67F1";
const ACCENTS = [BLUE];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
};
const fadeRight = {
  hidden: { opacity: 0, x: 28 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const VP = { once: true, margin: "-80px" };

function StackedExpCard({
  exp,
  index,
  total,
}: {
  exp: (typeof experienceSeed)[0];
  index: number;
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const accent = ACCENTS[index % ACCENTS.length];

  const topOffset = 100 + index * 20;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0.6, 1], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0.7]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }}
      style={{
        position: "sticky",
        top: topOffset,
        scale,
        opacity,
        zIndex: index + 1,
        transformOrigin: "top center",
      }}
      className="rounded-2xl overflow-hidden bg-background"
    >
      <div
        className="p-7 md:p-8 flex flex-col gap-4 relative bg-card"
        style={{
          backgroundImage: `linear-gradient(135deg, ${accent}1F 0%, ${accent}0A 100%)`,
          border: `1.5px solid ${accent}55`,
          boxShadow: `0 10px 32px -12px ${accent}40`,
        }}
      >
        {/* Timeline dot + line connector */}
        <div className="flex items-start gap-5">
          <div className="flex flex-col items-center shrink-0 pt-1">
            <div
              className="w-4 h-4 rounded-full shrink-0 ring-4 ring-background"
              style={{ background: accent }}
            />
            {index < total - 1 && (
              <div
                className="w-px flex-1 mt-2"
                style={{ background: `linear-gradient(to bottom, ${accent}60, transparent)`, minHeight: 40 }}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span
              className="self-start font-mono text-sm px-2.5 py-1 rounded-full uppercase tracking-widest font-bold"
              style={{ background: accent + "25", color: accent }}
            >
              {exp.period}
            </span>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-foreground text-lg font-sans font-semibold leading-snug">
                {exp.role}
              </h3>
            </div>

            <h4
              className="text-sm font-sans uppercase tracking-wider font-bold"
              style={{ color: accent }}
            >
              {exp.company}
              {exp.location ? <span className="text-muted-foreground font-normal normal-case tracking-normal"> · {exp.location}</span> : null}
            </h4>

            <ul className="flex flex-col gap-2 mt-1">
              {exp.bullets.map((b, j) => (
                <li
                  key={j}
                  className="text-muted-foreground text-sm leading-relaxed font-sans flex gap-2"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                    style={{ background: accent }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <span
          className="absolute bottom-4 right-6 font-display font-black text-6xl leading-none select-none pointer-events-none"
          style={{ color: accent + "18" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </motion.div>
  );
}

function CommunityCard({ item }: { item: CommunityItem }) {
  const images = (item.images ?? []).filter((src) => src?.trim());
  const [active, setActive] = useState(0);
  const cover = images[Math.min(active, images.length - 1)];

  return (
    <motion.article
      variants={fadeUp}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: BLUE + "12", border: `1.5px solid ${BLUE}35` }}
    >
      {cover ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <SafeImage
            key={cover}
            src={cover}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover"
            fallbackAspect="4 / 3"
          />
        </div>
      ) : null}
      {images.length > 1 && (
        <div className="flex gap-2 px-5 pt-4 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${item.title}`}
              aria-current={i === active}
              className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors"
              style={{ borderColor: i === active ? BLUE : "transparent" }}
            >
              <SafeImage src={src} alt="" className="w-full h-full object-cover" fallbackAspect="1 / 1" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 p-5">
        {item.period ? (
          <span
            className="self-start font-mono text-xs px-2 py-0.5 rounded-full uppercase tracking-widest"
            style={{ background: BLUE + "25", color: BLUE }}
          >
            {item.period}
          </span>
        ) : null}
        <h3 className="text-foreground text-base font-sans font-semibold leading-snug">{item.title}</h3>
        {item.organization ? (
          <h4 className="text-sm font-sans" style={{ color: BLUE }}>{item.organization}</h4>
        ) : null}
        {item.description ? (
          <p className="text-muted-foreground text-sm font-sans leading-relaxed">{item.description}</p>
        ) : null}
        {item.linkUrl ? (
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs uppercase tracking-widest font-sans font-bold w-max hover:opacity-70 transition-opacity"
            style={{ color: BLUE }}
          >
            {item.linkLabel || "Learn more"} ↗
          </a>
        ) : null}
      </div>
    </motion.article>
  );
}

export default function About() {
  const aboutData = useContent("about", aboutSeed) as AboutData;
  const yearsLabel = `${(aboutData.yearsExperience ?? "3+").trim() || "3+"} Years`;
  const experienceData = useContent("experience", experienceSeed) as typeof experienceSeed;
  const educationData = useContent("education", educationSeed) as EducationItem[];
  const communityItems = (aboutData.communityItems ?? []).filter((c) => c.title?.trim());
  const filesContent = useContent("files", filesSeed) as FilesShape;
  return (
    <div className="w-full flex flex-col gap-24 md:gap-32 pt-12 md:pt-24 pb-24">

      {/* ── Intro ── */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 overflow-hidden">
        <FloatingDecor opacity={0.45} />
        <div className="lg:col-span-5 flex flex-col gap-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-black uppercase leading-[0.88] tracking-tight"
            style={{ fontSize: "clamp(4rem,13vw,13rem)" }}
            aria-label="About"
          >
            <span aria-hidden="true" style={{ color: BLUE }}>A</span>
            <span aria-hidden="true" style={{ color: BLUE }}>B</span>
            <span aria-hidden="true" style={{ color: BLUE }}>O</span>
            <span aria-hidden="true" style={{ color: BLUE }}>U</span>
            <span aria-hidden="true" style={{ color: BLUE }}>T</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl"
            style={{ border: `2px solid ${BLUE}` }}
          >
            <SafeImage
              src={aboutData.photo}
              alt="Lenna Hua Portrait"
              className="w-full h-full object-cover opacity-90"
              fallbackAspect="16 / 5"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 flex flex-col gap-6 lg:pt-24"
        >
          {aboutData.bio.map((paragraph, i) => (
            <p key={i} className="text-muted-foreground text-xl leading-relaxed font-light font-sans">
              {paragraph}
            </p>
          ))}

          {/* stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="flex flex-wrap gap-3 mt-4"
          >
            {[
              { label: yearsLabel,   sub: "UX Design" },
              { label: "20+ Projects", sub: "Shipped" },
              { label: "Toronto",    sub: "Based" },
            ].map(({ label, sub }) => (
              <div
                key={label}
                className="flex flex-col px-5 py-3 rounded-xl"
                style={{ background: BLUE + "22", border: `1.5px solid ${BLUE}55` }}
              >
                <span className="font-display font-black uppercase text-xl leading-none" style={{ color: BLUE }}>{label}</span>
                <span className="text-muted-foreground text-sm uppercase tracking-widest font-sans mt-1">{sub}</span>
              </div>
            ))}
          </motion.div>

          {/* Resume download */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="flex flex-wrap gap-3 mt-2"
          >
            <a
              href={resumeHref(filesContent.resume)}
              target="_blank"
              rel="noopener noreferrer"
              download={filesContent.resume?.filename?.trim() || "Lenna_Hua_Resume.pdf"}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-sans font-semibold text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: BLUE, color: "#FFFFFF" }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 1v9m0 0L4 7m3.5 3L11 7M1 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download Resume
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Skills ── */}
      <section className="flex flex-col gap-12 pt-12" style={{ borderTop: `2px solid ${BLUE}` }}>
        <motion.h2
          variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
          className="font-display font-black uppercase text-3xl md:text-5xl tracking-tight"
          style={{ color: BLUE }}
        >
          Capabilities
        </motion.h2>

        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={VP}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {aboutData.skills.map((group, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <motion.div
                key={group.category}
                variants={fadeUp}
                className="flex flex-col gap-5 p-6 rounded-xl"
                style={{ background: accent + "14", border: `1.5px solid ${accent}40` }}
              >
                <h3
                  className="uppercase tracking-widest text-sm font-sans font-bold pb-2"
                  style={{ color: accent, borderBottom: `1px solid ${accent}40` }}
                >
                  {group.category}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-muted-foreground font-sans text-sm flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Experience ── */}
      <section className="pt-12" style={{ borderTop: `2px solid ${BLUE}` }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16">

          <div className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
            <motion.h2
              variants={fadeLeft} initial="hidden" whileInView="show" viewport={VP}
              className="font-display font-black uppercase text-3xl md:text-5xl tracking-tight"
              style={{ color: BLUE }}
            >
              Experience
            </motion.h2>
            <motion.p
              variants={fadeLeft} initial="hidden" whileInView="show" viewport={VP}
              className="text-muted-foreground text-sm font-sans leading-relaxed"
            >
              Scroll to explore my journey — each card stacks as you move through the timeline.
            </motion.p>

            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={VP}
              className="flex flex-col gap-3 mt-4"
            >
              {experienceData.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  variants={fadeLeft}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: ACCENTS[i % ACCENTS.length] }}
                  />
                  <span className="text-sm font-sans text-muted-foreground truncate">{exp.company}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="flex flex-col gap-4 pb-24">
            {experienceData.map((exp, i) => (
              <StackedExpCard
                key={exp.id}
                exp={exp}
                index={i}
                total={experienceData.length}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Community & Volunteer ── */}
      {aboutData.community || communityItems.length > 0 ? (
        <section className="flex flex-col gap-8 pt-12" style={{ borderTop: `2px solid ${BLUE}` }}>
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
            className="font-display font-black uppercase text-3xl md:text-5xl tracking-tight"
            style={{ color: BLUE }}
          >
            Community & Volunteer
          </motion.h2>
          {aboutData.community ? (
            <motion.p
              variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
              className="text-muted-foreground text-lg leading-relaxed font-light font-sans max-w-3xl"
            >
              {aboutData.community}
            </motion.p>
          ) : null}
          {communityItems.length > 0 && (
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={VP}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {communityItems.map((item) => (
                <CommunityCard key={item.id} item={item} />
              ))}
            </motion.div>
          )}
        </section>
      ) : null}

      {/* ── Education ── */}
      <section className="flex flex-col gap-12 pt-12" style={{ borderTop: `2px solid ${BLUE}` }}>
        <motion.h2
          variants={fadeRight} initial="hidden" whileInView="show" viewport={VP}
          className="font-display font-black uppercase text-3xl md:text-5xl tracking-tight"
          style={{ color: BLUE }}
        >
          Education
        </motion.h2>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {educationData.map((edu, i) => {
            const accent = ACCENTS[(i + 2) % ACCENTS.length];
            const honors = (edu.honors ?? []).filter((h) => h.trim());
            return (
              <motion.div
                key={edu.id}
                variants={fadeRight}
                className="flex flex-col gap-2 p-5 rounded-xl"
                style={{ background: accent + "12", border: `1.5px solid ${accent}35` }}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-foreground text-base font-sans font-medium">{edu.degree}</h3>
                  <span
                    className="font-mono text-sm px-2 py-0.5 rounded-full shrink-0 ml-3"
                    style={{ background: accent + "30", color: accent }}
                  >
                    {edu.year}
                  </span>
                </div>
                <h4 className="text-sm font-sans" style={{ color: accent }}>{edu.institution}</h4>
                {edu.summary?.trim() ? (
                  <p className="text-muted-foreground text-sm font-sans leading-relaxed mt-1">{edu.summary}</p>
                ) : null}
                {edu.gpa?.trim() || honors.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-2 pt-3" style={{ borderTop: `1px solid ${accent}30` }}>
                    {edu.gpa?.trim() ? (
                      <span
                        className="self-start text-xs uppercase tracking-widest font-sans font-bold px-2.5 py-1 rounded-full"
                        style={{ background: accent + "25", color: accent }}
                      >
                        GPA {edu.gpa}
                      </span>
                    ) : null}
                    {honors.length > 0 && (
                      <ul className="flex flex-col gap-1.5" aria-label="Honors and awards">
                        {honors.map((h) => (
                          <li key={h} className="text-muted-foreground text-sm font-sans flex items-start gap-2">
                            <Award size={14} className="shrink-0 mt-0.5" style={{ color: accent }} aria-hidden />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <ContactSection />
    </div>
  );
}
