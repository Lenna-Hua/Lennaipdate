import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BRAND } from "@/lib/brand";

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackAspect?: string;
  fallbackCaption?: string;
};

export function SafeImage({
  src,
  alt,
  className,
  style,
  fallbackAspect,
  fallbackCaption,
  onError,
  ...rest
}: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src || errored) {
    return (
      <DinoFallback
        alt={alt}
        className={className}
        style={style}
        aspect={fallbackAspect}
        caption={fallbackCaption}
      />
    );
  }

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={rest.loading ?? "lazy"}
      decoding="async"
      onError={(e) => {
        setErrored(true);
        onError?.(e);
      }}
    />
  );
}

type DinoFallbackProps = {
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  aspect?: string;
  caption?: string;
};

export function DinoFallback({
  alt,
  className,
  style,
  aspect,
  caption,
}: DinoFallbackProps) {
  const reduce = useReducedMotion();
  const label = caption?.trim() ?? "";
  const ariaLabel = alt
    ? `${alt} — image unavailable`
    : "Image unavailable";

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        aspectRatio: aspect ?? "16 / 5",
        background:
          "linear-gradient(135deg, var(--color-card, #1c1a18) 0%, var(--color-background, #0d0c0b) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Soft grid texture */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "min(60%, 220px)",
          maxHeight: "88%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <svg
          viewBox="0 0 240 160"
          width="100%"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", maxHeight: "64px", height: "auto" }}
        >
          {/* Ground line */}
          <line
            x1="10"
            y1="138"
            x2="230"
            y2="138"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Dino — same cartoon style, carrying a picture frame */}
          <motion.g
            initial={{ y: 0 }}
            animate={reduce ? undefined : { y: [0, -2.5, 0] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.2, ease: "easeInOut", repeat: Infinity }
            }
          >
            {/* Body */}
            <path
              d="M40 130 Q35 100 55 92 Q60 75 78 75 Q92 70 100 80 Q108 90 100 102 L100 130 L92 130 L92 116 L72 116 L72 130 Z"
              fill={BRAND.teal}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {/* Belly highlight */}
            <path
              d="M70 116 Q72 104 84 102 Q92 102 94 110 L94 116 Z"
              fill="rgba(255,255,255,0.18)"
            />
            {/* Eye */}
            <circle cx="90" cy="83" r="2.2" fill="#0d0c0b" />
            <circle cx="90.6" cy="82.4" r="0.7" fill="#FFFFFF" />
            {/* Spikes */}
            <path
              d="M52 96 L56 90 L60 96 Z M62 92 L66 86 L70 92 Z M72 90 L76 84 L80 90 Z"
              fill={BRAND.coral}
            />
            {/* Tail */}
            <path
              d="M40 130 Q22 122 14 108 Q12 104 18 104 Q28 110 40 118 Z"
              fill={BRAND.teal}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="1"
              strokeLinejoin="round"
            />

            {/* Picture-frame arm — gentle bob */}
            <motion.g
              initial={{ rotate: -6 }}
              animate={reduce ? undefined : { rotate: [-10, 4, -10] }}
              transition={
                reduce
                  ? undefined
                  : { duration: 1.6, ease: "easeInOut", repeat: Infinity }
              }
              style={{ transformOrigin: "104px 100px" }}
            >
              {/* Arm */}
              <rect
                x="100"
                y="94"
                width="6"
                height="18"
                rx="2"
                fill={BRAND.teal}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="1"
              />
              {/* Frame */}
              <rect
                x="98"
                y="72"
                width="28"
                height="22"
                rx="1.5"
                fill="rgba(255,255,255,0.92)"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.5"
              />
              {/* Inner mat */}
              <rect
                x="102"
                y="76"
                width="20"
                height="14"
                rx="0.5"
                fill={BRAND.blue}
                opacity="0.85"
              />
              {/* Tiny mountain / image mark */}
              <path
                d="M104 88 L110 80 L116 86 L120 82 L122 88 Z"
                fill="rgba(255,255,255,0.9)"
              />
              <circle cx="118" cy="79" r="1.4" fill="rgba(255,255,255,0.95)" />
            </motion.g>
          </motion.g>

          {/* Soft sparkles */}
          {!reduce && (
            <g>
              <motion.circle
                cx="132"
                cy="70"
                r="1.6"
                fill={BRAND.pink}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -8, -14] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.3 }}
              />
              <motion.circle
                cx="138"
                cy="78"
                r="1.2"
                fill={BRAND.coral}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -10, -16] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 0.4,
                  delay: 0.2,
                }}
              />
              <motion.circle
                cx="126"
                cy="82"
                r="1"
                fill={BRAND.blue}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 0.35,
                  delay: 0.5,
                }}
              />
            </g>
          )}
        </svg>

        {label ? (
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default SafeImage;
