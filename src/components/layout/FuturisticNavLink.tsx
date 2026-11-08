import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "framer-motion";
import { FigmaArrow } from "./FigmaArrow";

const CIPHER_GLYPHS = "01X#_/>*+~∆";

interface FuturisticNavLinkProps {
  href: string;
  label: string;
  active: boolean;
}

export function FuturisticNavLink({
  href,
  label,
  active,
}: FuturisticNavLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [scrambleText, setScrambleText] = useState(label);
  const timerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  // Futuristic cipher scramble on hover
  useEffect(() => {
    if (!isHovered || reduceMotion) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setScrambleText(label);
      return;
    }

    let tick = 0;
    const totalTicks = label.length * 2 + 1;
    timerRef.current = window.setInterval(() => {
      setScrambleText(
        label
          .split("")
          .map((char, i) => {
            if (i < tick / 2) return label[i];
            return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
          })
          .join("")
      );

      tick += 1;
      if (tick > totalTicks) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setScrambleText(label);
      }
    }, 28);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isHovered, label, reduceMotion]);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative inline-flex items-center py-2 select-none font-mono text-[16px] lg:text-[17px] tracking-[0.22em] uppercase font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        active ? "text-primary" : "text-foreground/80 hover:text-primary"
      }`}
    >
      {/* Sleek Figma Vector Arrow — absolutely positioned so the text remains 100% stationary */}
      <span
        aria-hidden="true"
        className={`absolute -left-6 lg:-left-[26px] top-1/2 -translate-y-1/2 inline-flex items-center pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          active
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
        }`}
      >
        <FigmaArrow color="#1F68F1" width={16} height={9} strokeWidth={1.6} />
      </span>

      {/* Label text remains strictly stationary in place — zero movement */}
      <span className="block select-none">
        {scrambleText}
      </span>

      {/* Razor-thin 1px Laser Beam Underline */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-primary via-primary to-primary/40 shadow-[0_0_6px_rgba(31,103,241,0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left ${
          active
            ? "w-full scale-x-100 opacity-100"
            : "w-full scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
        }`}
      />
    </Link>
  );
}
