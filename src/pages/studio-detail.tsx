import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import gallerySeed from "@/data/gallery.json";
import { useContent } from "@/lib/use-content";
import { SafeImage } from "@/components/SafeImage";
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

// `items` is now resolved per-render inside the component via useContent so
// admin edits show up immediately after the hydration fetch completes.

const BLUE = "#1F67F1";

function Lightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 md:backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors text-lg z-10"
      >
        ✕
      </button>
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "92vw", height: "85vh" }}
        className="rounded-xl flex items-center justify-center"
      >
        <SafeImage
          src={src}
          alt={caption || ""}
          maxWidth={2048}
          sizes="100vw"
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
          className="rounded-xl"
          fallbackAspect="16 / 5"
        />
      </motion.div>
      {caption && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-white/50 text-sm font-sans pointer-events-none">
          {caption}
        </p>
      )}
    </motion.div>
  );
}

export default function StudioDetail() {
  const items = (useContent("gallery", gallerySeed) as GalleryItem[]).filter(
    (i) => !i.archived,
  );
  const params = useParams();
  // Only navigate among "big" projects — small artworks use modal on studio page
  const bigItems = items.filter((i) => i.kind === "big");
  const idx = bigItems.findIndex((i) => i.slug === params.slug);
  const item = idx >= 0 ? bigItems[idx] : items.find((i) => i.slug === params.slug);
  const prev = idx > 0 ? bigItems[idx - 1] : null;
  const next = idx >= 0 && idx < bigItems.length - 1 ? bigItems[idx + 1] : null;
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string } | null>(null);
  const [coverErrored, setCoverErrored] = useState(false);
  const [erroredImages, setErroredImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCoverErrored(false);
    setErroredImages({});
  }, [params.slug]);

  if (!item) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-4">
        <p className="text-muted-foreground font-sans">Project not found.</p>
        <Link href="/studio" className="text-primary text-sm font-sans underline">
          Back to Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-16 md:gap-20 pb-24">
      <AnimatePresence>
        {lightbox && (
          <Lightbox
            src={lightbox.src}
            caption={lightbox.caption}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-16 pt-8 md:pt-16 border-b border-border pb-12">
        <motion.div
          className="flex flex-col justify-between gap-10"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-foreground/70 text-sm md:text-base font-sans leading-relaxed">
            From the Studio<br />archive of visual work.
          </p>
          <Link
            href="/studio"
            className="text-muted-foreground hover:text-primary transition-colors text-sm uppercase tracking-widest font-sans w-max"
          >
            ← All Studio
          </Link>
        </motion.div>

        <motion.div
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="text-sm uppercase tracking-[0.5em] font-sans font-bold w-max px-3 py-1 rounded-full"
            style={{
              color: BLUE,
              background: BLUE + "22",
              border: `1px solid ${BLUE}44`,
            }}
          >
            Studio
          </span>
          <h1
            className="font-display font-black leading-tight tracking-tight"
            style={{
              color: BLUE,
              fontSize: "clamp(1.9rem, 4.5vw, 3.5rem)",
            }}
          >
            {item.title}
          </h1>

          {item.description && (
            <p className="text-foreground/85 text-lg md:text-xl font-sans leading-relaxed max-w-2xl">
              {item.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5 pt-6 border-t border-border mt-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-sans">
                Role
              </span>
              <span className="text-foreground font-sans text-base">{item.role}</span>
            </div>
            {item.year && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-sans">
                  Year
                </span>
                <span className="text-foreground font-sans text-base">{item.year}</span>
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-sans">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs uppercase tracking-wider font-sans font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: BLUE + "20",
                        color: BLUE,
                        border: `1px solid ${BLUE}44`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {item.linkUrl && (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-sans font-bold uppercase tracking-widest w-max transition-transform hover:scale-[1.03]"
              style={{ background: BLUE, color: "#FFFFFF" }}
            >
              {item.linkLabel || "View project"} ↗
            </a>
          )}
        </motion.div>
      </section>

      {/* Hero image */}
      <motion.div
        className={`w-full overflow-hidden rounded-xl group relative bg-card ${coverErrored ? "" : "cursor-zoom-in"}`}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => {
          if (coverErrored) return;
          setLightbox({ src: item.coverImage, caption: item.title });
        }}
      >
        <SafeImage
          src={item.coverImage}
          alt={item.title}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          fallbackAspect="16 / 5"
          sizes="(max-width: 768px) 100vw, 90vw"
          maxWidth={1600}
          onError={() => setCoverErrored(true)}
        />
      </motion.div>

      {/* Additional images — width comes from admin (1 = full, 2 = half, 3 = third) */}
      {item.images && item.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {item.images.map((entry, i) => {
            const src = galleryImageSrc(entry);
            if (!src) return null;
            const errored = erroredImages[i];
            const spanClass = galleryImageSpanClass(
              galleryImageColumns(entry, item.imageColumns),
            );
            return (
              <motion.div
                key={i}
                className={`overflow-hidden rounded-xl bg-card ${spanClass} ${errored ? "" : "cursor-zoom-in"}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                onClick={() => {
                  if (errored) return;
                  setLightbox({ src, caption: item.title });
                }}
              >
                <SafeImage
                  src={src}
                  alt={`${item.title} — ${i + 1}`}
                  loading="lazy"
                  className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
                  fallbackAspect="16 / 5"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  maxWidth={1400}
                  onError={() => setErroredImages((prev) => ({ ...prev, [i]: true }))}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Prev / Next */}
      <div className="grid grid-cols-2 gap-6 sm:gap-10 pt-10 border-t border-border">
        {prev ? (
          <Link
            href={`/studio/${prev.slug}`}
            className="flex flex-col gap-1 group min-w-0"
          >
            <span className="text-xs uppercase tracking-[0.3em] font-sans text-muted-foreground">
              ← Previous
            </span>
            <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 break-words">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/studio/${next.slug}`}
            className="flex flex-col gap-1 group text-right min-w-0"
          >
            <span className="text-xs uppercase tracking-[0.3em] font-sans text-muted-foreground">
              Next →
            </span>
            <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 break-words">
              {next.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
