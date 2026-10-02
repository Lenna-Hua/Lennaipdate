export type HrAction =
  | "summarize"
  | "projects"
  | "skills"
  | "experience"
  | "education"
  | "contact"
  | "resume"
  | "help"
  | "fallback";

export type HrLink = {
  label: string;
  href: string;
};

export type HrResponse = {
  text: string;
  links?: HrLink[];
  /** Simulated "thinking" pause before the reply streams in */
  thinkMs?: number;
};

export type ProjectSummary = {
  slug: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  featured?: boolean;
};

export type ExperienceItem = {
  role: string;
  company: string;
  period: string;
  bullets?: string[];
};

export type EducationItem = {
  degree: string;
  institution: string;
  year: string;
  summary?: string;
};

export type SkillGroup = {
  category: string;
  items: string[];
};

export type HrContext = {
  name: string;
  role: string;
  yearsExperience?: string;
  bio: string[];
  skills: SkillGroup[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectSummary[];
  contact: {
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  resumeUrl?: string;
};

export const HR_QUICK_ACTIONS: { id: HrAction; label: string; prompt: string }[] = [
  {
    id: "summarize",
    label: "Profile summary",
    prompt: "Could you provide a concise overview of Lenna's background for hiring review?",
  },
  {
    id: "projects",
    label: "Key case studies",
    prompt: "Which portfolio projects would you recommend reviewing first?",
  },
  {
    id: "skills",
    label: "Skills & strengths",
    prompt: "What are her primary skills and areas of expertise?",
  },
  {
    id: "experience",
    label: "Work experience",
    prompt: "Please summarize her recent professional experience.",
  },
  {
    id: "resume",
    label: "Resume",
    prompt: "Where can I access her resume?",
  },
  {
    id: "contact",
    label: "Contact details",
    prompt: "What is the best way to reach her regarding a role?",
  },
];

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
}

function featuredProjects(projects: ProjectSummary[]): ProjectSummary[] {
  const featured = projects.filter((p) => p.featured);
  return featured.length > 0 ? featured.slice(0, 4) : projects.slice(0, 4);
}

function thinkFor(text: string): number {
  return Math.min(2400, 750 + text.length * 11);
}

export function buildWelcomeMessage(ctx: HrContext): HrResponse {
  return {
    text: [
      `Hello — I'm the portfolio assistant for **${ctx.name}**. I can help you review her candidacy more efficiently during initial screening.`,
      "",
      "I can provide a background summary, highlight relevant case studies, outline skills and experience, and share resume and contact details — all sourced from this portfolio.",
      "",
      "How may I assist you today?",
    ].join("\n"),
    thinkMs: 650,
  };
}

export function buildHrResponse(action: HrAction, ctx: HrContext): HrResponse {
  const first = ctx.name.split(" ")[0];

  switch (action) {
    case "summarize": {
      const intro = ctx.bio[0] ?? `${ctx.name} is a ${ctx.role}.`;
      const recent = ctx.experience.slice(0, 2);
      const featured = featuredProjects(ctx.projects);

      const recentText = recent.length
        ? recent
            .map(
              (e) =>
                `Most recently, she has served as **${e.role}** at ${e.company} (${e.period}).`,
            )
            .join(" ")
        : "";

      const projectText = featured.length
        ? `For a focused review, I would recommend starting with **${featured[0]?.title}**${
            featured.length > 1
              ? ` and **${featured.slice(1, 3).map((p) => p.title).join("** and **")}**`
              : ""
          } — these case studies demonstrate her range from research through delivery.`
        : "";

      const text = [
        `Certainly. Here is a concise overview of **${ctx.name}** suitable for initial hiring review.`,
        "",
        `${first} is a **${ctx.role}**${ctx.yearsExperience ? ` with **${ctx.yearsExperience} years** of relevant experience` : ""}, based in ${ctx.contact.location ?? "Toronto"}.`,
        "",
        firstSentence(intro),
        "",
        recentText,
        "",
        projectText,
        "",
        "I can expand on any of these areas — projects, skills, experience, or contact information — if that would be helpful.",
      ]
        .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
        .join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: [
          { label: "Full about page", href: "/about" },
          { label: "View all work", href: "/work" },
        ],
      };
    }

    case "projects": {
      const items = featuredProjects(ctx.projects);
      const lines = items.map((p, i) => {
        const tags = p.tags?.slice(0, 3).join(", ");
        return `${i + 1}. **${p.title}**${tags ? ` — ${tags}` : ""}\n   ${p.subtitle ? firstSentence(p.subtitle) : "Full case study with process and outcomes on the site."}`;
      });

      const text = [
        "Based on the portfolio, these case studies would be the most valuable for an initial evaluation:",
        "",
        ...lines,
        "",
        "Each includes the problem statement, research methodology, and measurable outcomes. The Habiganize and TTC projects are particularly strong examples of end-to-end product thinking.",
        "",
        "Would you like a summary of her skills or work history as a follow-up?",
      ].join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: items.map((p) => ({
          label: p.title,
          href: `/work/${p.slug}`,
        })),
      };
    }

    case "skills": {
      const groups = ctx.skills
        .map((g) => `**${g.category}** — ${g.items.slice(0, 6).join(", ")}`)
        .join("\n");

      const text = [
        `Here is a summary of **${first}'s** core competencies based on her portfolio:`,
        "",
        groups,
        "",
        "Her practice centers on research-led product design — from discovery and information architecture through prototyping and production-ready visual execution.",
        "",
        "She is well suited to roles that require both UX rigor and strong visual communication.",
      ].join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: [{ label: "See skills on about page", href: "/about" }],
      };
    }

    case "experience": {
      const blocks = ctx.experience.map((e) => {
        const highlight = e.bullets?.[0] ? firstSentence(e.bullets[0]) : "";
        return `**${e.role}** · ${e.company} (${e.period})\n${highlight}`;
      });

      const text = [
        `Below is a summary of her professional experience, listed in reverse chronological order:`,
        "",
        ...blocks,
        "",
        "Across these roles, she has consistently worked at the intersection of user needs and business outcomes — including service design, conversion-focused information architecture, and internal product optimization.",
        "",
        "I can also provide education details or project-specific context if needed.",
      ].join("\n\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: [{ label: "Full experience section", href: "/about" }],
      };
    }

    case "education": {
      const lines = ctx.education.map(
        (e) => `• **${e.degree}** — ${e.institution} (${e.year})`,
      );

      const text = [
        `Her academic background aligns with her current product design focus:`,
        "",
        ...lines,
        "",
        "Her most recent training at Humber College (UX Design) accounts for much of the research and usability depth reflected in her portfolio work.",
      ].join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: [{ label: "About page", href: "/about" }],
      };
    }

    case "contact": {
      const text = [
        "Of course. Here are her contact details for interview coordination or follow-up:",
        "",
        `**Email:** ${ctx.contact.email}`,
        ctx.contact.phone ? `**Phone:** ${ctx.contact.phone}` : "",
        ctx.contact.location ? `**Location:** ${ctx.contact.location}` : "",
        "",
        "She typically responds within **1–2 business days**. You may also use the contact form on this site to share role details directly.",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: [
          { label: "Open contact form", href: "/about#contact" },
          ...(ctx.contact.linkedin
            ? [{ label: "LinkedIn profile", href: ctx.contact.linkedin }]
            : []),
        ],
      };
    }

    case "resume": {
      const text = ctx.resumeUrl
        ? [
            "Yes — her resume is available as a PDF for download or distribution to your hiring team.",
            "",
            "This is the same document linked from the about page, so you will have the most current version.",
            "",
            "If you would like a brief written summary for ATS notes, feel free to ask for a profile overview.",
          ].join("\n")
        : [
            "Her resume is available on the about page. You may also reach out via the contact form if you require a specific format.",
          ].join("\n");

      return {
        text,
        thinkMs: thinkFor(text),
        links: ctx.resumeUrl
          ? [
              { label: "Download resume (PDF)", href: ctx.resumeUrl },
              { label: "About page", href: "/about" },
            ]
          : [{ label: "About page", href: "/about" }],
      };
    }

    case "fallback": {
      const text = [
        "I may not have understood that request, but I am able to assist with portfolio-related questions for hiring review.",
        "",
        "For example, you might ask:",
        "• \"Provide an overview of her background\"",
        "• \"Which projects should I review?\"",
        "• \"What are her core skills?\"",
        "• \"How can I contact her?\"",
        "",
        "You may also select one of the suggested prompts below.",
      ].join("\n");

      return { text, thinkMs: 900 };
    }

    case "help":
    default: {
      const text = [
        `I can help streamline your review of **${ctx.name}'s** portfolio during initial screening.`,
        "",
        "You may request:",
        "• A background summary for hiring notes",
        "• Recommended case studies to review",
        "• Skills, tools, and recent roles",
        "• Resume and contact information",
        "",
        "What would you like to review first?",
      ].join("\n");

      return { text, thinkMs: 700 };
    }
  }
}

export function matchHrQuery(input: string): HrAction {
  const q = input.toLowerCase().trim();
  if (!q) return "help";

  if (/summar|overview|who is|tell me about|intro|background|about lenna|about her/.test(q))
    return "summarize";
  if (/project|portfolio|case stud|work sample|highlight|best work|show me/.test(q))
    return "projects";
  if (/skill|tool|expertise|strength|capabilit|good at/.test(q)) return "skills";
  if (/experience|employ|job|role|career|worked|history|where has she/.test(q))
    return "experience";
  if (/educat|degree|school|college|univers|studied/.test(q)) return "education";
  if (/resume|cv|pdf|download/.test(q)) return "resume";
  if (/contact|email|phone|hire|reach|interview|linkedin|get in touch/.test(q))
    return "contact";
  if (/help|what can you|hi|hello|hey/.test(q)) return "help";

  return "fallback";
}

export function parseHrContext(raw: {
  identity?: unknown;
  about?: unknown;
  experience?: unknown;
  education?: unknown;
  projects?: unknown;
  contact?: unknown;
  files?: unknown;
}): HrContext {
  const identity = (raw.identity ?? {}) as { name?: string; role?: string };
  const about = (raw.about ?? {}) as {
    bio?: string[];
    yearsExperience?: string;
    skills?: SkillGroup[];
  };
  const contact = (raw.contact ?? {}) as {
    email?: string;
    phone?: string;
    location?: string;
    socials?: { label?: string; href?: string }[];
  };
  const files = (raw.files ?? {}) as {
    resume?: { url?: string; filename?: string };
  };

  const linkedin = contact.socials?.find((s) =>
    /linkedin/i.test(s.label ?? ""),
  )?.href;

  const resumeFile = files.resume?.filename || files.resume?.url;
  const resumeUrl = resumeFile
    ? resumeFile.startsWith("http")
      ? resumeFile
      : `/api/files/${encodeURIComponent(resumeFile)}`
    : undefined;

  return {
    name: identity.name ?? "Lenna Hua",
    role: identity.role ?? "Product Designer",
    yearsExperience: about.yearsExperience,
    bio: about.bio ?? [],
    skills: about.skills ?? [],
    experience: (raw.experience as ExperienceItem[]) ?? [],
    education: (raw.education as EducationItem[]) ?? [],
    projects: ((raw.projects as ProjectSummary[]) ?? []).map((p) => ({
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      tags: p.tags,
      featured: p.featured,
    })),
    contact: {
      email: contact.email ?? "lenna.huawork@gmail.com",
      phone: contact.phone,
      location: contact.location,
      linkedin,
    },
    resumeUrl,
  };
}