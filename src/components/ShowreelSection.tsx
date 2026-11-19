import { isVideo } from "@/components/CoverMedia";
import { SafeImage } from "@/components/SafeImage";
import { EditorialSection } from "@/components/layout/SplitShowcase";
import {
  embedProviderLabel,
  inlineEmbedUrl,
  parseVideoEmbed,
} from "@/lib/video-embed";

export type ShowreelProps = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  src: string;
  mime?: string;
  poster?: string;
  alt?: string;
};

/** Homepage showreel band: uploaded MP4/WebM or YouTube / Vimeo link. */
export function ShowreelSection({
  eyebrow = "Reel",
  heading = "Showreel",
  description,
  src,
  mime,
  poster,
  alt,
}: ShowreelProps) {
  const media = src.trim();
  if (!media) return null;

  const embed = parseVideoEmbed(media);
  const fileVideo = !embed && isVideo(media, mime);
  const label = alt?.trim() || heading || "Showreel";

  return (
    <EditorialSection
      id="showreel"
      eyebrow={eyebrow}
      heading={heading}
      aside={
        description?.trim() ? (
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/75">{description.trim()}</p>
        ) : undefined
      }
    >
      <div className="overflow-hidden border border-border bg-black aspect-video">
        {embed ? (
          <iframe
            src={inlineEmbedUrl(embed)}
            title={label || `${embedProviderLabel(embed)} showreel`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : fileVideo ? (
          <video
            src={media}
            poster={poster?.trim() || undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={label}
            className="h-full w-full object-contain bg-black"
          />
        ) : (
          <SafeImage
            src={media}
            alt={label}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </EditorialSection>
  );
}
