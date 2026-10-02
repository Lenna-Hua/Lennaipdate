import type { GalleryItem, Project, Studio, StudioLogo } from "@/components/admin/types";

export const DEFAULT_STUDIO: Studio = {
  eyebrow: "Studio · Archive",
  heading: "Studio",
  intro:
    "A living scrapbook of illustration, photography, motion, and editorial studies — plus a little type game to play.",
  bigEyebrow: "01 · Productions",
  bigHeading: "Big Projects",
  bigBlurb:
    "Full directorial and production projects — click any tile to read the full project page.",
  artworksEyebrow: "02 · Studies",
  artworksHeading: "Artworks",
  artworksBlurb:
    "Smaller pieces, studies, and standalone artworks. Scroll horizontally or click a card to view details.",
  artworksCardSize: "lg",
  artworksDefaultStyle: "slideshow",
  showPlay: true,
  playEyebrow: "Interactive",
  playHeading: "Play",
  playBlurb: "",
  showGrid: true,
  showDecor: true,
  showLogoMarquee: true,
  logoMarqueeSpeed: 32,
  logoMarqueeLabel: "Marks & projects",
  logoMarqueeAuto: true,
  logos: [],
};

export function mergeStudio(live: Partial<Studio> | null | undefined): Studio {
  const next = { ...DEFAULT_STUDIO, ...(live ?? {}) };
  if (!Array.isArray(next.logos)) next.logos = [];
  if (
    next.artworksCardSize !== "md" &&
    next.artworksCardSize !== "lg" &&
    next.artworksCardSize !== "xl"
  ) {
    next.artworksCardSize = "lg";
  }
  if (next.artworksDefaultStyle !== "slideshow") {
    next.artworksDefaultStyle = "slideshow";
  }
  if (typeof next.logoMarqueeSpeed !== "number" || next.logoMarqueeSpeed < 8) {
    next.logoMarqueeSpeed = DEFAULT_STUDIO.logoMarqueeSpeed;
  }
  return next;
}

function asLogo(id: string, name: string, src?: string, href?: string): StudioLogo | null {
  const label = name.trim();
  const image = src?.trim() ?? "";
  if (!label && !image) return null;
  return {
    id,
    name: label || "Untitled",
    src: image || undefined,
    href: href?.trim() || undefined,
  };
}

/**
 * Custom marquee logos, then optional auto logos from gallery + work projects.
 * With auto on and no logos anywhere, falls back to project titles so the strip isn't empty.
 */
export function collectMarqueeLogos(
  studio: Studio,
  gallery: GalleryItem[],
  projects: Project[],
): StudioLogo[] {
  const custom = (studio.logos ?? []).filter((l) => l.name?.trim() || l.src?.trim());
  if (!studio.logoMarqueeAuto) return custom;

  const seen = new Set(
    custom.map((l) => (l.src || l.name).trim().toLowerCase()).filter(Boolean),
  );
  const auto: StudioLogo[] = [];

  const push = (logo: StudioLogo | null) => {
    if (!logo) return;
    const key = (logo.src || logo.name).trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    auto.push(logo);
  };

  for (const item of gallery) {
    if (item.archived) continue;
    if (!item.logo?.trim()) continue;
    push(
      asLogo(
        `g-${item.id}`,
        item.title,
        item.logo,
        item.slug ? `/studio/${item.slug}` : item.linkUrl,
      ),
    );
  }
  for (const proj of projects) {
    if (proj.archived) continue;
    if (!proj.logo?.trim()) continue;
    push(
      asLogo(
        `p-${proj.id}`,
        proj.title,
        proj.logo,
        proj.slug ? `/work/${proj.slug}` : undefined,
      ),
    );
  }

  if (custom.length === 0 && auto.length === 0) {
    for (const proj of projects) {
      if (proj.archived) continue;
      push(asLogo(`p-${proj.id}`, proj.title, undefined, proj.slug ? `/work/${proj.slug}` : undefined));
    }
    for (const item of gallery) {
      if (item.archived || item.kind === "small") continue;
      push(asLogo(`g-${item.id}`, item.title, undefined, item.slug ? `/studio/${item.slug}` : undefined));
    }
  }

  return [...custom, ...auto];
}
