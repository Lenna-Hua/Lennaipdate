/** Recommended dimensions / file sizes per place an uploaded image or video is shown on the site. */
import { maxAssetBytesForFileType, formatMaxMb } from "@/lib/asset-limits";

export type MediaUsage =
  | "general"
  | "hero"
  | "project-cover"
  | "hover-video"
  | "section-image"
  | "section-video"
  | "artwork-cover"
  | "artwork"
  | "logo"
  | "portrait"
  | "photo"
  | "mockup-screen";

type ImageSpec = { width: number; height: number; targetBytes: number; format: string };
type VideoSpec = ImageSpec & { maxSeconds: number };

export type MediaGuideline = {
  label: string;
  /** Shape the site crops this media to; used as the default crop in the editor. */
  aspect?: [number, number];
  image?: ImageSpec;
  video?: VideoSpec;
  note?: string;
};

const KB = 1024;
const MB = 1024 * 1024;

export function formatSize(n: number): string {
  return n >= MB ? `${+(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / KB))} KB`;
}
const PHOTO = "JPG or WebP";
const ALPHA = "PNG or WebP (transparent background)";
const MP4 = "MP4 (H.264), muted";

export const MEDIA_GUIDELINES: Record<MediaUsage, MediaGuideline> = {
  general: {
    label: "Library upload",
    image: { width: 2400, height: 1600, targetBytes: 800 * KB, format: `${PHOTO} (PNG for transparency)` },
    video: { width: 1920, height: 1080, targetBytes: 15 * MB, maxSeconds: 60, format: MP4 },
  },
  hero: {
    label: "Homepage hero",
    aspect: [16, 9],
    image: { width: 2400, height: 1350, targetBytes: 800 * KB, format: PHOTO },
    video: { width: 1920, height: 1080, targetBytes: 8 * MB, maxSeconds: 15, format: MP4 },
    note: "Shown full width at 16:9.",
  },
  "project-cover": {
    label: "Project cover",
    aspect: [4, 5],
    image: { width: 1600, height: 2000, targetBytes: 700 * KB, format: PHOTO },
    video: { width: 1080, height: 1350, targetBytes: 6 * MB, maxSeconds: 10, format: MP4 },
    note: "Work cards are 4:5. The case study hero crops the same image to 16:7, so keep the subject centered.",
  },
  "hover-video": {
    label: "Card hover video",
    aspect: [4, 5],
    video: { width: 1080, height: 1350, targetBytes: 4 * MB, maxSeconds: 6, format: MP4 },
    note: "Plays muted on long hover: short loops load fastest.",
  },
  "section-image": {
    label: "Case study image",
    image: { width: 2400, height: 1600, targetBytes: 1 * MB, format: PHOTO },
    note: "Fills the content column; 2400 px wide stays sharp on retina screens. Keep GIFs under 4 MB or use a looping MP4.",
  },
  "section-video": {
    label: "Case study video",
    aspect: [16, 9],
    video: { width: 1920, height: 1080, targetBytes: 20 * MB, maxSeconds: 60, format: MP4 },
    note: "Loops that play like GIFs should stay under ~15 s and ~6 MB.",
  },
  "artwork-cover": {
    label: "Artwork cover",
    image: { width: 2000, height: 2500, targetBytes: 800 * KB, format: PHOTO },
    note: "Portrait or landscape both work: the slideshow picks the card shape from the image.",
  },
  artwork: {
    label: "Artwork image",
    image: { width: 2400, height: 2400, targetBytes: 1 * MB, format: PHOTO },
    note: "Long edge around 2400 px.",
  },
  logo: {
    label: "Logo",
    aspect: [1, 1],
    image: { width: 512, height: 512, targetBytes: 100 * KB, format: ALPHA },
  },
  portrait: {
    label: "About portrait",
    aspect: [3, 4],
    image: { width: 1200, height: 1600, targetBytes: 400 * KB, format: PHOTO },
  },
  photo: {
    label: "Community photo",
    aspect: [4, 3],
    image: { width: 1600, height: 1200, targetBytes: 500 * KB, format: PHOTO },
  },
  "mockup-screen": {
    label: "Mockup screenshot",
    image: { width: 1179, height: 2556, targetBytes: 1.5 * MB, format: "PNG or WebP" },
    note: "Native screenshots without a device frame: phone ≈ 1179×2556, tablet ≈ 2048×2732, desktop ≈ 2880×1800.",
  },
};

export function guidelineFor(usage: MediaUsage | undefined): MediaGuideline {
  return MEDIA_GUIDELINES[usage ?? "general"];
}

export function formatAspect(w: number, h: number): string {
  const known: [number, number][] = [
    [1, 1], [4, 5], [5, 4], [3, 4], [4, 3], [2, 3], [3, 2], [9, 16], [16, 9], [16, 10], [10, 16], [16, 7], [21, 9],
  ];
  const r = w / h;
  const hit = known.find(([a, b]) => Math.abs(a / b - r) / r < 0.015);
  return hit ? `${hit[0]}:${hit[1]}` : `${r.toFixed(2)}:1`;
}

/** One-line hint shown under upload buttons. */
export function guidelineSummary(usage: MediaUsage | undefined): string {
  const g = guidelineFor(usage);
  const parts: string[] = [];
  if (g.image) {
    parts.push(`Image ${g.image.width}×${g.image.height} px, under ${formatSize(g.image.targetBytes)}`);
  }
  if (g.video) {
    parts.push(`Video ${g.video.width}×${g.video.height}, ≤ ${g.video.maxSeconds}s, under ${formatSize(g.video.targetBytes)}`);
  }
  return parts.join(" · ");
}

export type MediaCheck = { level: "ok" | "warn" | "error"; text: string };

export function assessMedia(input: {
  usage?: MediaUsage;
  mime: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}): MediaCheck[] {
  const g = guidelineFor(input.usage);
  const isVideo = input.mime.startsWith("video/");
  const spec = isVideo ? g.video : g.image;
  const out: MediaCheck[] = [];
  const hardMax = maxAssetBytesForFileType(input.mime);

  if (input.bytes > hardMax) {
    out.push({
      level: "error",
      text: `${formatSize(input.bytes)} is over the ${formatMaxMb(hardMax)} MB upload limit: ${isVideo ? "compress the video first" : "resize or lower the quality below"}.`,
    });
  } else if (spec && input.bytes > spec.targetBytes) {
    out.push({
      level: "warn",
      text: `${formatSize(input.bytes)} is heavier than the suggested ${formatSize(spec.targetBytes)}: it will load slowly on phones.`,
    });
  }

  const { width, height } = input;
  if (spec && width && height) {
    const long = Math.max(width, height);
    const recLong = Math.max(spec.width, spec.height);
    if (long < recLong * 0.6) {
      out.push({ level: "warn", text: `${width}×${height} is small for this spot (aim for ~${spec.width}×${spec.height}) and may look blurry.` });
    } else if (!isVideo && long > recLong * 1.6) {
      out.push({ level: "warn", text: `${width}×${height} is bigger than needed: resizing to ~${recLong} px saves bandwidth with no visible loss.` });
    }
    if (g.aspect) {
      const want = g.aspect[0] / g.aspect[1];
      const have = width / height;
      if (Math.abs(have - want) / want > 0.03) {
        out.push({
          level: "warn",
          text: `Shape is ${formatAspect(width, height)}; the site shows it at ${g.aspect[0]}:${g.aspect[1]}${isVideo ? " and will crop the edges" : ": crop now to control the framing"}.`,
        });
      }
    }
  }

  if (isVideo && g.video && input.duration && input.duration > g.video.maxSeconds) {
    out.push({ level: "warn", text: `${Math.round(input.duration)}s is long for this spot: trim to ${g.video.maxSeconds}s or less.` });
  }
  if (isVideo && !/mp4|webm/.test(input.mime)) {
    out.push({ level: "warn", text: `${input.mime} may not play in every browser: export as MP4 (H.264).` });
  }

  if (out.length === 0) out.push({ level: "ok", text: "Size and dimensions look good for this spot." });
  return out;
}
