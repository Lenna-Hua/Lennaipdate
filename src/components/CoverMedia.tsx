import React, { useEffect, useRef } from "react";
import { SafeImage } from "@/components/SafeImage";
import { useLiteMotion } from "@/hooks/use-lite-motion";

/** Detect video URLs — extension, data URI, Cloudinary, or stored mime hint. */
export function isVideo(src: string, mimeHint?: string): boolean {
  if (!src) return false;
  if (mimeHint?.startsWith("video/")) return true;
  if (src.startsWith("data:video")) return true;
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(src)) return true;
  if (/res\.cloudinary\.com/i.test(src) && /\/video\/upload\//i.test(src)) return true;
  return false;
}

interface CoverMediaProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  /** When the URL has no extension (e.g. /api/assets/…), use stored mime from the library. */
  mimeHint?: string;
  sizes?: string;
  maxWidth?: number;
}

export function CoverMedia({
  src,
  alt,
  className,
  style,
  loading = "lazy",
  mimeHint,
  sizes,
  maxWidth,
}: CoverMediaProps) {
  const lite = useLiteMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo(src, mimeHint)) return;
    if (lite) {
      el.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, mimeHint, lite]);

  if (isVideo(src, mimeHint)) {
    return (
      <video
        ref={videoRef}
        src={src}
        autoPlay={!lite}
        loop
        muted
        playsInline
        preload={lite ? "metadata" : "none"}
        aria-label={alt}
        className={className}
        style={style}
      />
    );
  }
  return (
    <SafeImage
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      sizes={sizes}
      maxWidth={maxWidth}
    />
  );
}
