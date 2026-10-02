import { useId } from "react";
import { Link } from "wouter";

type Props = {
  /** Destination — internal path or absolute URL. */
  href: string;
  /** Circular path copy. Default matches the attached reference. */
  label?: string;
  /** Visual size in px. */
  size?: number;
  /** Fill for the flower petals. */
  fill?: string;
  /** Text color on the circular path. */
  textColor?: string;
  /** Center disc color (flower stamen). */
  centerColor?: string;
  className?: string;
  /** Use when the badge should float over the viewport (case study pages). */
  fixed?: boolean;
};

/**
 * Flower-shaped “VIEW WORK •” sticker — petals and path text spin together.
 */
export function RotatingLiveBadge({
  href,
  label = "VIEW LIVE • VIEW LIVE •",
  size = 168,
  fill = "#FFFFFF",
  textColor = "#1A5BD4",
  centerColor = "#F5D547",
  className = "",
  fixed = false,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const pathId = `rotating-live-curve-${uid}`;
  const isExternal = /^https?:\/\//i.test(href);
  const sharedClass =
    `group inline-flex items-center justify-center transition-transform duration-500 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A5BD4] ${className}`;
  const style = {
    width: size,
    height: size,
    ...(fixed
      ? ({
          position: "fixed" as const,
          right: "max(1.25rem, env(safe-area-inset-right))",
          bottom: "max(1.5rem, env(safe-area-inset-bottom))",
          zIndex: 60,
        } as const)
      : {}),
  };

  const inner = (
    <span className="relative block w-full h-full overflow-visible">
      {/* One SVG so flower + text rotate as a unit; text drawn last (on top) */}
      <svg
        viewBox="0 0 100 100"
        className="rotating-live-text absolute inset-0 w-full h-full origin-center drop-shadow-[0_12px_26px_rgba(26,91,212,0.24)]"
        overflow="visible"
        aria-hidden
      >
        <defs>
          {/* Radius 27 keeps the glyphs inside the petals, even in the gaps between them */}
          <path
            id={pathId}
            d="M 50 50 m -27 0 a 27 27 0 1 1 54 0 a 27 27 0 1 1 -54 0"
            fill="none"
          />
        </defs>

        {/* Petals */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="50"
            cy="24"
            rx="17"
            ry="26"
            fill={fill}
            stroke="rgba(26,91,212,0.12)"
            strokeWidth="0.7"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}

        {/* Center — kept small so it never covers the rim text */}
        <circle
          cx="50"
          cy="50"
          r="9.5"
          fill={centerColor}
          stroke={textColor}
          strokeWidth="1.1"
        />
        <circle cx="50" cy="50" r="3.4" fill={textColor} opacity="0.92" />

        {/* Text on top of petals */}
        <text
          style={{
            fontFamily: "var(--app-font-sans), system-ui, sans-serif",
            fontSize: "6.4px",
            fontWeight: 700,
            fill: textColor,
          }}
        >
          <textPath href={`#${pathId}`} startOffset="0" textLength="164" lengthAdjust="spacing">
            {label}
          </textPath>
        </text>
      </svg>

      <span className="sr-only">{label.replace(/•/g, "").trim()}</span>
    </span>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={sharedClass}
        style={style}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={sharedClass} style={style}>
      {inner}
    </Link>
  );
}
