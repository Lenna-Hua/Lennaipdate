import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { FigmaArrow } from "./FigmaArrow";

export function ThemeToggleCreative({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`Current theme: ${theme}. Click to switch to ${isDark ? "light" : "dark"} mode.`}
      className={`group relative inline-flex items-center gap-2.5 py-2 font-mono text-[12px] lg:text-[12.5px] font-medium uppercase tracking-[0.22em] select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${className}`}
    >
      {/* Sleek Hairline Figma Arrow on hover — absolutely positioned so text stays 100% stationary */}
      <span
        aria-hidden="true"
        className={`absolute -left-5 top-1/2 -translate-y-1/2 inline-flex items-center pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHovered
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-2"
        }`}
      >
        <FigmaArrow color="#1F68F1" width={16} height={9} strokeWidth={1.6} />
      </span>

      {/* Mode Text (Remains completely stationary in position) */}
      <span
        className={`transition-colors duration-200 hidden min-[300px]:block ${
          isDark
            ? "text-primary group-hover:text-primary"
            : "text-foreground/85 group-hover:text-primary"
        }`}
      >
        {isDark ? "DARK" : "LIGHT"}
      </span>

      {/* Minimalist Futuristic Celestial Dial */}
      <div className="relative w-6 h-6 rounded-full flex items-center justify-center bg-foreground/[0.04] group-hover:bg-primary/10 border border-foreground/15 group-hover:border-primary/40 transition-all duration-300">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="dark-celestial"
              initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="relative w-full h-full flex items-center justify-center text-primary"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.2" />
              </svg>
              <span className="absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full bg-primary animate-ping" />
            </motion.div>
          ) : (
            <motion.div
              key="light-celestial"
              initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className="relative w-full h-full flex items-center justify-center text-foreground/80 group-hover:text-primary"
            >
              <motion.svg
                animate={{ rotate: isHovered ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.15" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hairline 1px Laser Beam Underline */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-primary via-primary to-primary/40 shadow-[0_0_6px_rgba(31,103,241,0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-left ${
          isHovered ? "w-full scale-x-100 opacity-100" : "w-full scale-x-0 opacity-0"
        }`}
      />
    </button>
  );
}
