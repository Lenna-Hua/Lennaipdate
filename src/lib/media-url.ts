const FRAMER_SCALES = [512, 1024, 2048] as const;

function pickFramerScale(maxWidth: number): (typeof FRAMER_SCALES)[number] {
  if (maxWidth <= 512) return 512;
  if (maxWidth <= 1024) return 1024;
  return 2048;
}

function isAbsoluteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/** URLs we can ask a CDN to downscale. Local / data / blob stay as-is. */
export function canSizeMedia(src: string | undefined | null): boolean {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return false;
  return (
    src.includes("framerusercontent.com") || src.includes("res.cloudinary.com")
  );
}

function sizeFramerUrl(url: URL, maxWidth: number): string {
  url.searchParams.set("scale-down-to", String(pickFramerScale(maxWidth)));
  return url.href;
}

function sizeCloudinaryUrl(url: URL, maxWidth: number): string {
  const path = url.pathname;
  if (!path.includes("/upload/")) return url.href;
  // Already transformed — don't stack another w_ segment.
  if (/\/upload\/[^/]*\bw_\d+/.test(path)) return url.href;
  url.pathname = path.replace(
    "/upload/",
    `/upload/w_${maxWidth},c_limit,q_auto,f_auto/`,
  );
  return url.href;
}

/** Cap remote CDN images so phones don't download 4–6k px case-study assets. */
export function sizedMediaSrc(
  src: string | undefined | null,
  maxWidth = 1600,
): string {
  if (!src || !canSizeMedia(src)) return src ?? "";
  try {
    const url = new URL(
      src,
      isAbsoluteHttpUrl(src) ? undefined : "https://www.lennahua.ca",
    );
    if (url.hostname.endsWith("framerusercontent.com")) {
      return sizeFramerUrl(url, maxWidth);
    }
    if (url.hostname.endsWith("res.cloudinary.com")) {
      return sizeCloudinaryUrl(url, maxWidth);
    }
  } catch {
    return src;
  }
  return src;
}

export function mediaSrcSet(
  src: string | undefined | null,
  maxWidth = 1600,
): string | undefined {
  if (!src || !canSizeMedia(src)) return undefined;
  const widths = [640, 1024, 1600].filter((width) => width <= Math.max(maxWidth, 640));
  return widths
    .map((width) => `${sizedMediaSrc(src, width)} ${width}w`)
    .join(", ");
}
