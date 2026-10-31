import type { GalleryItem, Project, Section } from "@/components/admin/types";
import { galleryImageColumns, galleryImageSrc } from "@/lib/gallery-image";

/** Tag added to former gallery "big projects" so the Work page Studio filter still finds them. */
export const STUDIO_TAG = "Studio";

export function isBigGalleryItem(item: GalleryItem): boolean {
  return (item.kind ?? "big") === "big";
}

function looksLikeUrl(value: string): boolean {
  return /^(https?:)?\/\//i.test(value.trim());
}

function bigItemToProject(item: GalleryItem, id: string, slug: string): Project {
  const description = item.description?.trim() ?? "";
  const sections: Section[] = (item.images ?? [])
    .filter((entry) => galleryImageSrc(entry))
    .map((entry, i) => {
      const columns = galleryImageColumns(entry, item.imageColumns);
      return {
        id: `${id}-img-${i + 1}`,
        type: "image",
        visibility: "always",
        src: galleryImageSrc(entry),
        ...(columns === 1 ? {} : { columns }),
      };
    });

  const linkUrl = item.linkUrl?.trim() ?? "";
  if (linkUrl) {
    const rawLabel = item.linkLabel?.trim() ?? "";
    const linkLabel = rawLabel && !looksLikeUrl(rawLabel) ? rawLabel : "View project";
    if (sections.length === 0 && item.coverImage) {
      sections.push({ id: `${id}-img-1`, type: "image", visibility: "always", src: item.coverImage });
    }
    const last = sections[sections.length - 1];
    if (last) {
      last.href = linkUrl;
      last.linkLabel = linkLabel;
    }
  }

  const tags = item.tags ?? [];
  return {
    id,
    slug,
    title: item.title.trim(),
    subtitle: description,
    cardDescription: description || undefined,
    type: item.role ?? "",
    tags: tags.includes(STUDIO_TAG) ? tags : [...tags, STUDIO_TAG],
    description,
    challenge: "",
    solution: "",
    impact: "",
    coverImage: item.coverImage ?? "",
    logo: item.logo || undefined,
    cardLayout: item.cardLayout,
    year: item.year ?? "",
    featured: Boolean(item.featured),
    archived: Boolean(item.archived),
    sections,
  };
}

/**
 * Moves gallery "big projects" into regular case studies. Idempotent: an item
 * whose id already exists in projects is treated as migrated and just dropped
 * from the gallery.
 */
export function migrateBigGalleryToProjects(
  projects: Project[],
  gallery: GalleryItem[],
): { projects: Project[]; gallery: GalleryItem[]; migrated: number } {
  const big = gallery
    .filter(isBigGalleryItem)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  if (big.length === 0) return { projects, gallery, migrated: 0 };

  const ids = new Set(projects.map((p) => p.id));
  const slugs = new Set(projects.map((p) => p.slug));
  const added: Project[] = [];

  for (const item of big) {
    if (ids.has(item.id)) continue;
    let slug = item.slug || item.id;
    for (let n = 2; slugs.has(slug); n += 1) slug = `${item.slug || item.id}-${n}`;
    ids.add(item.id);
    slugs.add(slug);
    added.push(bigItemToProject(item, item.id, slug));
  }

  return {
    projects: [...projects, ...added],
    gallery: gallery.filter((g) => !isBigGalleryItem(g)),
    migrated: added.length,
  };
}
