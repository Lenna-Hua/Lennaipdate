/** Shared upload size limits for images, GIFs, and videos. */
export const MAX_IMAGE_ASSET_BYTES = 4 * 1024 * 1024;
export const MAX_GIF_ASSET_BYTES = 15 * 1024 * 1024; // GIFs / animated clips allowed up to 15 MB
export const MAX_VIDEO_ASSET_BYTES = 100 * 1024 * 1024;

/**
 * Largest file that can go through a Vercel Function request body (platform cap is ~4.5 MB).
 * Anything bigger must be uploaded straight from the browser to Blob storage.
 */
export const MAX_FUNCTION_UPLOAD_BYTES = 4 * 1024 * 1024;

/** @deprecated Use maxAssetBytesForMime — kept for image-only flows (gallery shrink, etc.). */
export const MAX_ASSET_BYTES = MAX_IMAGE_ASSET_BYTES;

export function maxAssetBytesForMime(mime: string): number {
  if (mime.startsWith("video/")) return MAX_VIDEO_ASSET_BYTES;
  if (mime === "image/gif") return MAX_GIF_ASSET_BYTES;
  return MAX_IMAGE_ASSET_BYTES;
}

export function maxAssetBytesForFileType(type: string): number {
  if (type.startsWith("video/")) return MAX_VIDEO_ASSET_BYTES;
  if (type === "image/gif") return MAX_GIF_ASSET_BYTES;
  return MAX_IMAGE_ASSET_BYTES;
}

export function formatMaxMb(bytes: number): number {
  return Math.floor(bytes / 1024 / 1024);
}
