import { useState } from "react";
import { motion } from "framer-motion";
import aboutSeed from "@/data/about.json";
import experienceSeed from "@/data/experience.json";
import educationSeed from "@/data/education.json";
import filesSeed from "@/data/files.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { useFloatIn, useFloatStagger } from "@/lib/motion";
import { resolveResumeUrl, type ResumeMeta } from "@/lib/resume-url";
import { SafeImage } from "@/components/SafeImage";
import { ContactSection } from "@/components/ContactSection";
import { DEFAULT_PROCESS_STEPS, ProcessStack } from "@/components/ProcessStack";
import { renderRichText } from "@/lib/rich-text";
import { scrollPageTo, useLenis } from "@/lib/smooth-scroll";
import {
  EditorialSection,
  Eyebrow,
  SPLIT_COLUMNS,
  TextLink,
} from "@/components/layout/SplitShowcase";
import type { About as AboutData, CommunityItem, EducationItem } from "@/components/admin/types";

type FilesShape = { resume?: ResumeMeta };
type Experience = (typeof experienceSeed)[number];

const ENTER = { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const };

function Dash({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1rem_1fr] gap-2 text-sm md:text-base leading-relaxed text-foreground/75">
      <span aria-hidden className="text-muted-foreground">•</span>
      <span>{children}</span>
    </li>
  );
}

function ExperienceRow({ exp }: { exp: Experience }) {
  const floatIn = useFloatIn();
  return (
    <motion.li
      {...floatIn}
      className="grid gap-3 md:grid-cols-[11rem_1fr] md:gap-8 border-t border-border py-7 first:border-t-0 first:pt-0"
    >
      <span className="text-[11px] uppercase tracking-[0.2em] tabular-nums text-muted-foreground pt-1.5">
        {exp.period}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-display font-bold uppercase tracking-tight leading-[1.1] text-xl md:text-2xl text-foreground">
          {exp.role}
        </h3>
        <p className="text-sm text-foreground/70">
          {exp.company}
          {exp.location ? <span className="text-muted-foreground"> · {exp.location}</span> : null}
        </p>
        {(exp.bullets ?? []).length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 max-w-3xl">
            {(exp.bullets ?? []).map((b, j) => (
              <Dash key={j}>{b}</Dash>
            ))}
          </ul>
        )}
      </div>
    </motion.li>
  );
}

function CommunityCard({ item }: { item: CommunityItem }) {
  const images = (item.images ?? []).filter((src) => src?.trim());
  const [active, setActive] = useState(0);
  const cover = images[Math.min(active, images.length - 1)];
  const { item: fadeUp } = useFloatStagger();

  return (
    <motion.article variants={fadeUp} className="flex flex-col gap-3">
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
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1} of ${item.title}`}
              aria-current={i === active}
              className={`flex-shrink-0 w-12 h-12 overflow-hidden border transition-opacity ${
                i === active ? "border-foreground opacity-100" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <SafeImage src={src} alt="" className="w-full h-full object-cover" fallbackAspect="1 / 1" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1 border-t border-border pt-2">
        {item.period ? <Eyebrow>{item.period}</Eyebrow> : null}
        <h3 className="font-display font-bold uppercase tracking-tight leading-[1.1] text-lg text-foreground">
          {item.title}
        </h3>
        {item.organization ? <p className="text-sm text-foreground/70">{item.organization}</p> : null}
        {item.description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        ) : null}
        {item.linkUrl ? (
          <div className="mt-2">
            <TextLink href={item.linkUrl} external>
              {item.linkLabel || "Learn more"} ↗
            </TextLink>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

export default function About() {
  const aboutData = useContent("about", aboutSeed) as AboutData;
  const experienceData = useContent("experience", experienceSeed) as typeof experienceSeed;
  const educationData = useContent("education", educationSeed) as EducationItem[];
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const filesContent = useContent("files", filesSeed) as FilesShape;
  const communityItems = (aboutData.communityItems ?? []).filter((c) => c.title?.trim());
  const { container: stagger, item: fadeUp, viewport: VP } = useFloatStagger();
  const lenis = useLenis();
  const [lead, ...restBio] = aboutData.bio ?? [];
  const city = (contactData.location ?? "").split(",")[0].trim() || "Toronto";
  const stats = [
    { label: "Years", value: `${(aboutData.yearsExperience ?? "3+").trim() || "3+"}` },
    { label: "Projects", value: "20+" },
    { label: "Based", value: city },
  ];

  return (
    <div className="w-full flex flex-col gap-24 md:gap-32">
      {/* ── Intro ── */}
      <section className={`relative grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}>
        <motion.div
          className="flex flex-col gap-6 md:sticky md:top-[var(--chrome-h)] md:self-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ENTER}
        >
          <Eyebrow>Profile</Eyebrow>
          <h1 className="font-display font-black uppercase leading-[0.88] tracking-tight text-foreground text-[clamp(2.75rem,5vw,4.75rem)]">
            About
          </h1>
          <div className="aspect-[3/4] w-full max-w-[20rem] overflow-hidden bg-muted">
            <SafeImage
              src={aboutData.photo}
              alt="Lenna Hua Portrait"
              className="w-full h-full object-cover"
              fallbackAspect="3 / 4"
            />
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-10 md:pt-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: 0.15 }}
        >
          {lead && (
            <p className="max-w-4xl text-foreground leading-[1.2] tracking-tight text-[clamp(1.5rem,2.6vw,2.4rem)]">
              {renderRichText(lead)}
            </p>
          )}
          {restBio.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
              {restBio.map((paragraph, i) => (
                <p key={i} className="text-base md:text-lg leading-relaxed text-foreground/75">
                  {renderRichText(paragraph)}
                </p>
              ))}
            </div>
          )}
          <dl className="grid grid-cols-3 gap-x-6 max-w-xl">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 border-t border-border pt-2">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{s.label}</dt>
                <dd className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl text-foreground">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <a
              href={resolveResumeUrl(filesContent.resume)}
              target="_blank"
              rel="noopener noreferrer"
              download={filesContent.resume?.filename?.trim() || "Lenna_Hua_Resume.pdf"}
              className="group inline-flex items-center gap-3 rounded-none border-2 border-primary bg-primary px-6 py-3 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-sm hover:bg-foreground hover:border-foreground hover:text-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>Download resume</span>
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-y-0.5">
                ↓
              </span>
            </a>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("contact");
                if (el) scrollPageTo(lenis, el, { smooth: true });
              }}
              className="group inline-flex items-center gap-3 rounded-none border-2 border-foreground bg-transparent px-6 py-3 text-xs font-mono font-semibold uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>Get in touch</span>
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Capabilities ── */}
      <EditorialSection eyebrow="What I do" heading="Capabilities">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VP}
          className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4"
        >
          {(aboutData.skills ?? []).map((group) => (
            <motion.div key={group.category} variants={fadeUp} className="flex flex-col gap-3 border-t border-border pt-2">
              <Eyebrow>{group.category}</Eyebrow>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item} className="text-base text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </EditorialSection>

      {/* ── Process ── */}
      <EditorialSection eyebrow="How I work" heading="Process">
        <ProcessStack
          steps={aboutData.processSteps?.length ? aboutData.processSteps : DEFAULT_PROCESS_STEPS}
          layout={aboutData.processLayout ?? "stack"}
          label="Design process"
        />
      </EditorialSection>

      {/* ── Experience ── */}
      <EditorialSection
        eyebrow={`${String(experienceData.length).padStart(2, "0")} roles`}
        heading="Experience"
        stickyAside
      >
        <ol className="flex flex-col">
          {experienceData.map((exp) => (
            <ExperienceRow key={exp.id} exp={exp} />
          ))}
        </ol>
      </EditorialSection>

      {/* ── Community & Volunteer ── */}
      {aboutData.community || communityItems.length > 0 ? (
        <EditorialSection eyebrow="Giving back" heading="Community & Volunteer">
          <div className="flex flex-col gap-10">
            {aboutData.community ? (
              <p className="max-w-3xl text-lg md:text-xl leading-relaxed text-foreground/85">{aboutData.community}</p>
            ) : null}
            {communityItems.length > 0 && (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={VP}
                className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3"
              >
                {communityItems.map((item) => (
                  <CommunityCard key={item.id} item={item} />
                ))}
              </motion.div>
            )}
          </div>
        </EditorialSection>
      ) : null}

      {/* ── Education ── */}
      <EditorialSection eyebrow="Studies" heading="Education">
        <motion.ol variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="flex flex-col">
          {educationData.map((edu) => {
            const honors = (edu.honors ?? []).filter((h) => h.trim());
            return (
              <motion.li
                key={edu.id}
                variants={fadeUp}
                className="grid gap-3 md:grid-cols-[11rem_1fr] md:gap-8 border-t border-border py-7 first:border-t-0 first:pt-0"
              >
                <span className="text-[11px] uppercase tracking-[0.2em] tabular-nums text-muted-foreground pt-1.5">
                  {edu.year}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display font-bold uppercase tracking-tight leading-[1.1] text-xl md:text-2xl text-foreground">
                    {edu.degree}
                  </h3>
                  <p className="text-sm text-foreground/70">
                    {edu.institution}
                    {edu.gpa?.trim() ? <span className="text-muted-foreground"> · GPA {edu.gpa}</span> : null}
                  </p>
                  {edu.summary?.trim() ? (
                    <p className="mt-2 max-w-3xl text-sm md:text-base leading-relaxed text-foreground/75">{edu.summary}</p>
                  ) : null}
                  {honors.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1.5" aria-label="Honors and awards">
                      {honors.map((h) => (
                        <Dash key={h}>{h}</Dash>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </EditorialSection>

      <ContactSection />
    </div>
  );
}
