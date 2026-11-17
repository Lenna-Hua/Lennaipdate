import { useState, useEffect } from "react";

/**
 * Detect whether an HTMLImageElement contains any pixels with transparency (alpha < 250).
 */
export function detectImageTransparency(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    const w = Math.min(img.naturalWidth || 64, 64);
    const h = Math.min(img.naturalHeight || 64, 64);
    if (!w || !h) return false;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! < 250) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect whether a File or Blob image has transparency.
 */
export async function detectFileTransparency(file: File | Blob): Promise<boolean> {
  if (file.type === "image/svg+xml") return true;
  if (!file.type.startsWith("image/") || file.type === "image/jpeg") return false;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(detectImageTransparency(img));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Detect whether an image URL has transparency.
 */
export async function detectUrlTransparency(url: string): Promise<boolean> {
  if (!url) return false;
  if (/\.svg(\?|$)/i.test(url)) return true;
  if (/\.(jpg|jpeg)(\?|$)/i.test(url)) return false;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(detectImageTransparency(img));
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * React hook that returns true if explicitly marked transparent or if transparency
 * is detected from the image source URL.
 */
export function useIsImageTransparent(src?: string, explicitTransparent?: boolean): boolean {
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (explicitTransparent) return;
    if (!src) {
      setDetected(false);
      return;
    }
    let live = true;
    detectUrlTransparency(src).then((isTrans) => {
      if (live && isTrans) setDetected(true);
    });
    return () => {
      live = false;
    };
  }, [src, explicitTransparent]);

  return Boolean(explicitTransparent || detected);
}
