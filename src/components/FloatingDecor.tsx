import { motion } from "framer-motion";
import { useLiteMotion } from "@/hooks/use-lite-motion";
import { BRAND } from "@/lib/brand";

const DOTS = [
  { left: "6%",  top: "18%", size: 14, delay: 0,   dur: 3.2 },
  { left: "88%", top: "12%", size: 9,  delay: 0.6, dur: 4.0 },
  { left: "78%", top: "58%", size: 16, delay: 1.1, dur: 3.5 },
  { left: "4%",  top: "72%", size: 10, delay: 1.7, dur: 4.2 },
  { left: "52%", top: "88%", size: 7,  delay: 0.9, dur: 3.8 },
  { left: "92%", top: "42%", size: 12, delay: 0.3, dur: 2.9 },
  { left: "38%", top: "6%",  size: 8,  delay: 1.4, dur: 4.5 },
  { left: "20%", top: "90%", size: 11, delay: 0.5, dur: 3.6 },
];

const STARS = [
  { left: "62%", top: "8%",  size: 20, dur: 18 },
  { left: "14%", top: "45%", size: 16, dur: 24 },
  { left: "82%", top: "80%", size: 14, dur: 20 },
];

const BLUE = BRAND.blue;

export function FloatingDecor({ opacity = 1 }: { opacity?: number }) {
  const lite = useLiteMotion();
  if (lite) return null;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block"
      style={{ opacity }}
    >
      {/* Dashed SVG rings */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ pointerEvents: "none" }}
      >
        <motion.circle
          cx="78%" cy="22%" r="110"
          fill="none" stroke={BLUE} strokeWidth="1.5"
          strokeDasharray="5 9" opacity={0.18}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "78% 22%" }}
        />
        <motion.circle
          cx="18%" cy="78%" r="75"
          fill="none" stroke={BLUE} strokeWidth="1.5"
          strokeDasharray="5 9" opacity={0.14}
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "18% 78%" }}
        />
        <motion.circle
          cx="55%" cy="50%" r="200"
          fill="none" stroke={BLUE} strokeWidth="1"
          strokeDasharray="3 14" opacity={0.08}
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "55% 50%" }}
        />
      </svg>

      {/* Floating dots */}
      {DOTS.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            background: BLUE,
            opacity: 0.45,
          }}
          animate={{ y: [0, -18, 0] }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            delay: d.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Sparkle stars */}
      {STARS.map((s, i) => (
        <motion.div
          key={i}
          className="absolute select-none font-bold"
          style={{
            left: s.left,
            top: s.top,
            fontSize: s.size,
            color: BLUE,
            opacity: 0.5,
            lineHeight: 1,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: s.dur, repeat: Infinity, ease: "linear" }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}
