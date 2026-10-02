/** Shared types for the admin panel components. */

import type { GalleryImageColumns, GalleryImageEntry } from "@/lib/gallery-image";

export type {
  GalleryImage,
  GalleryImageColumns,
  GalleryImageEntry,
} from "@/lib/gallery-image";

export type SectionType = "text" | "image" | "video" | "problem-solution" | "embed";

/** Skim vs expanded: "always" shows by default; "detail" only after See more. */
export type SectionVisibility = "always" | "detail";

export type Section = {
  id: string;
  type: SectionType;
  /** Default "always". Detail blocks are hidden until See more. */
  visibility?: SectionVisibility;
  title?: string;
  summary?: string;
  body?: string;
  bullets?: string[];
  body2?: string;
  bullets2?: string[];
  /** Fuller copy shown when See more is on (same block, text swaps). */
  titleDetail?: string;
  summaryDetail?: string;
  bodyDetail?: string;
  bulletsDetail?: string[];
  src?: string;
  caption?: string;
  problem?: string;
  solution?: string;
  problemDetail?: string;
  solutionDetail?: string;
  /** Optional CTA link under image/video (e.g. try the live product). */
  href?: string;
  /** CTA button/link label. Defaults to "Click here to try the product →". */
  linkLabel?: string;
  /** Embed iframe height in px (default 500). PubHTML5 only. */
  height?: number;
};

/**
 * Work/Home grid card shape. "horizontal" spans two columns
 * (two cards + the gap between them) at the same height as a vertical card.
 */
export type CardLayout = "vertical" | "horizontal";

export type Project = {
  id: string;
  slug: string;
  title: string;
  /** Shown under the title on the case study hero. */
  subtitle: string;
  /** Short hover text on Work page cards (falls back to subtitle). */
  cardDescription?: string;
  /** Shown as "Role" in the case study metadata strip. */
  type: string;
  /** Shown as "Users" in the case study metadata strip. */
  users?: string;
  /** Shown as "Methods" in the case study metadata strip. */
  methods?: string;
  tags: string[];
  /** Overview paragraph on the case study page. */
  description: string;
  bullets?: string[];
  /** "Problem" card on the case study page. */
  challenge: string;
  /** "Solution" card on the case study page. */
  solution: string;
  /** "Impact" block on the case study page. */
  impact: string;
  coverImage: string;
  /**
   * Short muted loop shown on Work/Home cards after a long hover.
   * Leave empty to keep the static cover image.
   */
  hoverVideo?: string;
  /** Live product / site URL — powers the rotating VIEW LIVE badge. */
  liveUrl?: string;
  /** Square mark for the studio logo marquee. */
  logo?: string;
  /** Card shape on Work/Home grids. Defaults to "vertical". */
  cardLayout?: CardLayout;
  year: string;
  period?: string;
  featured: boolean;
  archived?: boolean;
  sections: Section[];
  /**
   * @deprecated Prefer sections[].visibility. Kept so older DB rows still load.
   * Admin / case study merge this into the visible expand path when present.
   */
  detailSections?: Section[];
};

export type SkillGroup = {
  category: string;
  items: string[];
};

export type About = {
  bio: string[];
  skills: SkillGroup[];
  /** Portrait / headshot shown on the About page */
  photo?: string;
  /** Display value for years of experience, e.g. "3+" or "4+" */
  yearsExperience?: string;
  /** Intro paragraph for the Community & Volunteer section. */
  community?: string;
  communityItems?: CommunityItem[];
};

export type CommunityItem = {
  id: string;
  title: string;
  organization?: string;
  period?: string;
  description?: string;
  /** Photos shown on the card; the first is the cover. */
  images?: string[];
  linkUrl?: string;
  linkLabel?: string;
};

export type ExperienceItem = {
  id: string;
  role: string;
  company: string;
  location?: string;
  period: string;
  bullets: string[];
};

export type EducationItem = {
  id: string;
  degree: string;
  institution: string;
  year: string;
  summary?: string;
  /** Free text so any scale works, e.g. "3.8 / 4.0" or "Distinction". */
  gpa?: string;
  honors?: string[];
};

export type GalleryItem = {
  id: string;
  kind?: "big" | "small";
  slug: string;
  title: string;
  role: string;
  year?: string;
  description?: string;
  tags?: string[];
  coverImage: string;
  images?: GalleryImageEntry[];
  /**
   * Default width for additional images that do not set their own columns.
   * 1 = full row, 2 = half, 3 = one third. Defaults to 2.
   */
  imageColumns?: GalleryImageColumns;
  order?: number;
  linkUrl?: string;
  linkLabel?: string;
  /** Slideshow card shape. When omitted, the slideshow detects it from the cover image. */
  orientation?: "portrait" | "landscape";
  /** @deprecated Artworks always render as slideshow cards. */
  cardStyle?: "slideshow" | "tag" | "folder";
  /** Optional stamp image (legacy folder field). */
  stampImage?: string;
  /** Tag accent color behind the clipped image. Hex, e.g. #E07B39. */
  folderColor?: string;
  /** Square mark used in the studio logo marquee. */
  logo?: string;
  /** Big projects only: card shape on Work/Home grids. Defaults to "vertical". */
  cardLayout?: CardLayout;
  /** When true, appears in homepage Selected Work (same as Work case studies). */
  featured?: boolean;
  /** When true, hidden from public studio + homepage (kept in admin). */
  archived?: boolean;
};

export type Identity = {
  name: string;
  role: string;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type Contact = {
  email: string;
  phone: string;
  location: string;
  socials: SocialLink[];
};

export type ResumeMeta = {
  url: string;
  filename: string;
  updatedAt: string;
};

export type Files = {
  resume: ResumeMeta;
};

export type EntryCard = {
  number: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
};

export type Homepage = {
  entry: {
    wordmarkPrefix: string;
    wordmarkSuffix: string;
    topbarTagline: string;
    designCard: EntryCard;
    artCard: EntryCard;
    bottomPrompt: string;
  };
  home: {
    heroEyebrow: string;
    heroIntro: string;
    /** Optional hero image or video (library URL). Empty = no hero media on the live site. */
    heroMedia?: string;
    /** Accessibility label when heroMedia is set. */
    heroMediaAlt?: string;
    /** MIME from library upload/pick — helps render /api/assets URLs without extensions. */
    heroMediaMime?: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    selectedWorkHeading: string;
    selectedWorkLinkLabel: string;
    /** Rotating flower sticker in the hero; links to primaryCtaHref. */
    badgeLabel?: string;
    showStudioBand?: boolean;
    studioHeading?: string;
    studioLinkLabel?: string;
    aboutEyebrow: string;
    aboutHeading: string;
    aboutCtaLabel: string;
  };
};

export type StudioLogo = {
  id: string;
  name: string;
  src?: string;
  href?: string;
};

export type Studio = {
  eyebrow: string;
  heading: string;
  intro: string;
  bigEyebrow: string;
  bigHeading: string;
  bigBlurb: string;
  artworksEyebrow: string;
  artworksHeading: string;
  artworksBlurb: string;
  artworksCardSize: "md" | "lg" | "xl";
  artworksDefaultStyle: "slideshow" | "tag" | "folder";
  /** Kern game section (/play redirects here). */
  showPlay: boolean;
  playEyebrow: string;
  playHeading: string;
  playBlurb: string;
  showGrid: boolean;
  showDecor: boolean;
  showLogoMarquee: boolean;
  /** Seconds for one full loop. */
  logoMarqueeSpeed: number;
  logoMarqueeLabel: string;
  /** Also pick up logos/titles from gallery items and work projects. */
  logoMarqueeAuto: boolean;
  logos: StudioLogo[];
};

export type AppearancePreset =
  | "current"
  | "editorial"
  | "geometric"
  | "scrapbook"
  | "poster"
  | "custom";

export type Appearance = {
  preset: AppearancePreset;
  displayFont: string;
  sansFont: string;
  serifFont: string;
  /** Google Fonts CSS2 family fragments, e.g. "Syne:wght@700;800". */
  googleFamilies: string[];
};

export type ContentData = {
  projects: Project[];
  about: About;
  experience: ExperienceItem[];
  education: EducationItem[];
  gallery: GalleryItem[];
  identity: Identity;
  contact: Contact;
  files: Files;
  homepage: Homepage;
  studio: Studio;
  appearance: Appearance;
};

export type Asset = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type AssetType = "all" | "image" | "gif" | "video";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  ip: string | null;
  userAgent: string | null;
};

export type PreflightInfo = {
  sectionSizes: { name: string; bytes: number; formatted: string }[];
  totalBytes: number;
  totalFormatted: string;
  oversizeSections: string[];
  largestSection: string;
  inlineMedia: { section: string; itemLabel: string; field: string }[];
  storageBackend: string;
  allClear: boolean;
};

export type PickerOpts = { type?: AssetType };
export type AssetPickMeta = { mime?: string };
export type AssetPickerFn = (
  onPick: (url: string, meta?: AssetPickMeta) => void,
  opts?: PickerOpts,
) => void;
export type AssetUploadFn = (file: File) => Promise<string>;
