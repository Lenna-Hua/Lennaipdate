import { useParams, Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import gallerySeed from "@/data/gallery.json";
import projectsSeed from "@/data/projects.json";
import { useContent } from "@/lib/use-content";
import { SafeImage } from "@/components/SafeImage";
import { MediaLightbox, type LightboxItem } from "@/components/MediaLightbox";
import { Eyebrow, SPLIT_COLUMNS, TextLink } from "@/components/layout/SplitShowcase";
import {
  galleryImageColumns,
  galleryImageSpanClass,
  galleryImageSrc,
  type GalleryImageEntry,
} from "@/lib/gallery-image";

type GalleryItem = {
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
  imageColumns?: 1 | 2 | 3;
  order?: number;
  linkUrl?: string;
  linkLabel?: string;
  featured?: boolean;
  archived?: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;
const COVER_ID = "cover";
const imageId = (i: number) => `image-${i}`;
const pad2 = (n: number) => String(n).padStart(2, "0");

const PAGER_TITLE =
  "font-display font-black uppercase tracking-tight leading-[0.95] text-foreground group-hover:text-primary transition-colors line-clamp-3 break-words text-[clamp(1.25rem,3vw,2.75rem)]";

export default function StudioDetail() {
  const items = (useContent("gallery", gallerySeed) as GalleryItem[]).filter(
    (i) => !i.archived,
  );
  const projects = useContent("projects", projectsSeed) as { slug: string }[];
  const params = useParams();
  // Only navigate among "big" projects — small artworks use modal on studio page
  const bigItems = items.filter((i) => i.kind === "big");
  const idx = bigItems.findIndex((i) => i.slug === params.slug);
  const item = idx >= 0 ? bigItems[idx] : items.find((i) => i.slug === params.slug);
  const prev = idx > 0 ? bigItems[idx - 1] : null;
  const next = idx >= 0 && idx < bigItems.length - 1 ? bigItems[idx + 1] : null;
  const [openId, setOpenId] = useState<string | null>(null);
  const [coverErrored, setCoverErrored] = useState(false);
  const [erroredImages, setErroredImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCoverErrored(false);
    setErroredImages({});
    setOpenId(null);
  }, [params.slug]);

  const lightboxItems = useMemo((): LightboxItem[] => {
    if (!item) return [];
    const out: LightboxItem[] = [];
    if (item.coverImage && !coverErrored) out.push({ id: COVER_ID, src: item.coverImage, title: item.title });
    (item.images ?? []).forEach((entry, i) => {
      const src = galleryImageSrc(entry);
      if (src && !erroredImages[i]) out.push({ id: imageId(i), src, title: item.title, meta: pad2(i + 1) });
    });
    return out;
  }, [item, coverErrored, erroredImages]);

  const movedToWork = projects.some((p) => p.slug === params.slug);
  if (movedToWork && (!item || (item.kind ?? "big") === "big")) {
    return <Redirect to={`/work/${params.slug}`} replace />;
  }

  if (!item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-start justify-center gap-4">
        <Eyebrow>404</Eyebrow>
        <p className="font-display font-black uppercase tracking-tight text-3xl text-foreground">Project not found</p>
        <TextLink href="/studio">← Back to Studio</TextLink>
      </div>
    );
  }

  const meta = [
    { label: "Role", value: item.role },
    { label: "Year", value: item.year },
  ].filter((m) => m.value?.trim());

  return (
    <div className="w-full flex flex-col gap-16 md:gap-24">
      <MediaLightbox items={lightboxItems} activeId={openId} onChange={setOpenId} />

      {/* Hero */}
      <section className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}>
        <motion.aside
          className="order-2 md:order-1 flex flex-col gap-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="hidden md:flex flex-col gap-2">
            <TextLink href="/studio">← All Studio</TextLink>
            <Eyebrow>From the Studio archive</Eyebrow>
          </div>

          <dl className="flex flex-col">
            {meta.map((m) => (
              <div key={m.label} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-border py-2.5">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{m.label}</dt>
                <dd className="text-sm md:text-[15px] leading-snug text-foreground">{m.value}</dd>
              </div>
            ))}
            {item.tags && item.tags.length > 0 && (
              <div className="grid grid-cols-[6rem_1fr] gap-3 border-t border-b border-border py-2.5">
                <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Tags</dt>
                <dd className="text-sm md:text-[15px] leading-snug text-foreground flex flex-col">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </motion.aside>

        <motion.div
          className="order-1 md:order-2 flex flex-col gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        >
          <div className="md:hidden">
            <TextLink href="/studio">← All Studio</TextLink>
          </div>
          <h1 className="font-display font-black uppercase text-foreground leading-[0.9] tracking-tight break-words [overflow-wrap:anywhere] text-[clamp(2.5rem,6vw,6rem)]">
            {item.title}
          </h1>
          {item.description && (
            <p className="max-w-3xl text-foreground/75 text-lg md:text-2xl leading-snug tracking-tight">
              {item.description}
            </p>
          )}
          {item.linkUrl && (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-2 inline-flex w-max items-center gap-3 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              {item.linkLabel || "View project"}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">↗</span>
            </a>
          )}
        </motion.div>
      </section>

      {/* Hero image */}
      <motion.button
        type="button"
        disabled={coverErrored}
        onClick={() => setOpenId(COVER_ID)}
        aria-label={`Expand image: ${item.title}`}
        className="group block w-full overflow-hidden bg-muted enabled:cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 1, ease: EASE }}
      >
        <SafeImage
          src={item.coverImage}
          alt={item.title}
          className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.015]"
          fallbackAspect="16 / 5"
          onError={() => setCoverErrored(true)}
        />
      </motion.button>

      {/* Additional images — width comes from admin (1 = full, 2 = half, 3 = third) */}
      {item.images && item.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
          {item.images.map((entry, i) => {
            const src = galleryImageSrc(entry);
            if (!src) return null;
            const errored = erroredImages[i];
            const spanClass = galleryImageSpanClass(
              galleryImageColumns(entry, item.imageColumns),
            );
            return (
              <motion.button
                key={i}
                type="button"
                disabled={errored}
                onClick={() => setOpenId(imageId(i))}
                aria-label={`Expand image ${i + 1} of ${item.title}`}
                className={`group block overflow-hidden bg-muted enabled:cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background ${spanClass}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
              >
                <SafeImage
                  src={src}
                  alt={`${item.title}, image ${i + 1}`}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                  fallbackAspect="16 / 5"
                  onError={() => setErroredImages((prev) => ({ ...prev, [i]: true }))}
                />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Prev / Next */}
      <nav aria-label="More studio projects" className={`grid gap-8 ${SPLIT_COLUMNS} border-t border-border pt-8`}>
        <Eyebrow>Keep browsing</Eyebrow>
        <div className="grid grid-cols-2 gap-6 sm:gap-10">
          {prev ? (
            <Link href={`/studio/${prev.slug}`} className="group flex flex-col gap-2 min-w-0">
              <Eyebrow>← Previous</Eyebrow>
              <span className={PAGER_TITLE}>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/studio/${next.slug}`} className="group flex flex-col items-end gap-2 text-right min-w-0">
              <Eyebrow>Next →</Eyebrow>
              <span className={PAGER_TITLE}>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </div>
  );
}
