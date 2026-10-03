import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useLiteMotion } from "@/hooks/use-lite-motion";
import { BRAND } from "@/lib/brand";

type Orb = {
  top: string;
  left: string;
  size: number;
  from: string;
  to: string;
  blur: number;
  drift: [number, number];
  duration: number;
  delay: number;
};

type Sparkle = {
  top: string;
  left: string;
  size: number;
  color: string;
  rotate: number;
  duration: number;
  delay: number;
  shape: SparkleShape;
};

type SparkleShape =
  | "star" | "asterisk" | "plus" | "ring" | "diamond" | "squiggle"
  | "heart" | "flower" | "butterfly" | "lightning" | "smiley" | "eye"
  | "cd" | "spiral" | "wireframe";

type Tile = {
  top: string;
  left: string;
  size: number;
  rotate: number;
  color: string;
  drift: number;
  duration: number;
  delay: number;
};

type Floater = {
  top: string;
  left: string;
  size: number;
  color: string;
  shape: SparkleShape;
  driftX: number;
  driftY: number;
  rotateBy: number;
  duration: number;
  delay: number;
  opacity: number;
};

/* Light-mode orbs: warmer, more saturated pastels with bigger drift so
   the gradient is clearly recognizable on the cream page and visibly
   floats around. */
const ORBS_LIGHT: Orb[] = [
  { top: "4%",   left: "75%", size: 420, from: "#FF8FA8", to: "#FFB37A", blur: 65, drift: [-140,  90], duration: 11, delay: 0   },
  { top: "28%",  left: "-8%", size: 480, from: "#7AC3FF", to: "#B59CFF", blur: 75, drift: [ 130, 130], duration: 13, delay: 0.4 },
  { top: "55%",  left: "82%", size: 380, from: "#7FE9B5", to: "#7AC3FF", blur: 60, drift: [-120, -120], duration: 12, delay: 0.8 },
  { top: "76%",  left: "10%", size: 440, from: "#FFB37A", to: "#FF8FA8", blur: 70, drift: [150, -90], duration: 14, delay: 1.2 },
  { top: "108%", left: "62%", size: 520, from: "#B59CFF", to: "#7FE9B5", blur: 85, drift: [-140, 120], duration: 15, delay: 0.6 },
  { top: "144%", left: "4%",  size: 420, from: "#FF8FA8", to: "#7AC3FF", blur: 70, drift: [110, -130], duration: 12, delay: 1.6 },
  { top: "172%", left: "70%", size: 460, from: "#FFB37A", to: "#B59CFF", blur: 75, drift: [-130, 110], duration: 14, delay: 0.2 },
];

/* Dark-mode orbs: saturated neon jewel tones (violet / magenta / cyan /
   amber / lime) bright enough to glow visibly when blended with "screen"
   over the near-black background, but still under the card layer so they
   never tint the cards themselves. */
const ORBS_DARK: Orb[] = [
  { top: "4%",   left: "75%", size: 420, from: "#7C3AED", to: "#DB2777", blur: 90, drift: [-140,  90], duration: 11, delay: 0   },
  { top: "28%",  left: "-8%", size: 480, from: "#2563EB", to: "#7C3AED", blur: 100, drift: [ 130, 130], duration: 13, delay: 0.4 },
  { top: "55%",  left: "82%", size: 380, from: "#059669", to: "#0891B2", blur: 85, drift: [-120, -120], duration: 12, delay: 0.8 },
  { top: "76%",  left: "10%", size: 440, from: "#EA580C", to: "#DB2777", blur: 95, drift: [150, -90], duration: 14, delay: 1.2 },
  { top: "108%", left: "62%", size: 520, from: "#7C3AED", to: "#0891B2", blur: 110, drift: [-140, 120], duration: 15, delay: 0.6 },
  { top: "144%", left: "4%",  size: 420, from: "#DB2777", to: "#2563EB", blur: 95, drift: [110, -130], duration: 12, delay: 1.6 },
  { top: "172%", left: "70%", size: 460, from: "#EA580C", to: "#7C3AED", blur: 100, drift: [-130, 110], duration: 14, delay: 0.2 },
];

const TILES: Tile[] = [
  { top: "20%",  left: "68%", size: 100, rotate: 14,  color: BRAND.blue, drift: 30, duration: 10, delay: 0   },
  { top: "64%",  left: "4%",  size: 120, rotate: -22, color: "#EC4899", drift: 36, duration: 12, delay: 0.6 },
  { top: "104%", left: "56%", size: 90,  rotate: 32,  color: "#F59E0B", drift: 28, duration: 9,  delay: 1.0 },
  { top: "146%", left: "78%", size: 110, rotate: -10, color: "#10B981", drift: 32, duration: 11, delay: 1.5 },
  { top: "180%", left: "22%", size: 100, rotate: 24,  color: "#8B5CF6", drift: 30, duration: 10, delay: 0.3 },
];

const SPARKLES: Sparkle[] = [
  { top: "5%",   left: "10%", size: 22, color: BRAND.blue, rotate:  0,  duration: 4.2, delay: 0,   shape: "star" },
  { top: "10%",  left: "44%", size: 18, color: "#EC4899", rotate: 22,  duration: 3.6, delay: 0.5, shape: "asterisk" },
  { top: "16%",  left: "88%", size: 16, color: "#F59E0B", rotate: 0,   duration: 5.0, delay: 1.0, shape: "plus" },
  { top: "26%",  left: "30%", size: 24, color: BRAND.blue, rotate: -12, duration: 4.4, delay: 0.3, shape: "ring" },
  { top: "34%",  left: "58%", size: 16, color: "#10B981", rotate: 30,  duration: 3.8, delay: 0.9, shape: "diamond" },
  { top: "40%",  left: "12%", size: 26, color: "#EC4899", rotate: -8,  duration: 4.6, delay: 0.6, shape: "asterisk" },
  { top: "48%",  left: "82%", size: 22, color: "#F59E0B", rotate: 18,  duration: 4.0, delay: 1.4, shape: "star" },
  { top: "58%",  left: "38%", size: 28, color: BRAND.blue, rotate: 0,   duration: 5.2, delay: 0.4, shape: "squiggle" },
  { top: "68%",  left: "72%", size: 18, color: "#10B981", rotate: 12,  duration: 4.0, delay: 0.2, shape: "plus" },
  { top: "78%",  left: "22%", size: 22, color: "#EC4899", rotate: -22, duration: 4.6, delay: 1.1, shape: "star" },
  { top: "86%",  left: "54%", size: 20, color: "#8B5CF6", rotate: 0,   duration: 4.4, delay: 0.7, shape: "spiral" },
  { top: "96%",  left: "86%", size: 16, color: "#F59E0B", rotate: 18,  duration: 3.8, delay: 1.3, shape: "asterisk" },
  { top: "106%", left: "16%", size: 22, color: "#EC4899", rotate: 0,   duration: 4.8, delay: 0.4, shape: "squiggle" },
  { top: "118%", left: "44%", size: 24, color: BRAND.blue, rotate: 0,   duration: 5.4, delay: 0.9, shape: "ring" },
  { top: "128%", left: "76%", size: 18, color: "#10B981", rotate: 12,  duration: 4.2, delay: 0.5, shape: "diamond" },
  { top: "140%", left: "12%", size: 22, color: "#F59E0B", rotate: 0,   duration: 4.6, delay: 1.0, shape: "star" },
  { top: "152%", left: "60%", size: 20, color: "#EC4899", rotate: 0,   duration: 5.0, delay: 0.6, shape: "asterisk" },
  { top: "164%", left: "30%", size: 26, color: "#8B5CF6", rotate: 0,   duration: 4.8, delay: 0.2, shape: "spiral" },
  { top: "176%", left: "84%", size: 22, color: BRAND.blue, rotate: 0,   duration: 5.2, delay: 1.4, shape: "ring" },
  { top: "188%", left: "48%", size: 18, color: "#F59E0B", rotate: 18,  duration: 4.4, delay: 0.8, shape: "plus" },
];

const FLOATERS: Floater[] = [
  { top: "12%",  left: "20%", size: 56, color: "#EC4899", shape: "heart",     driftX:  60, driftY: -40, rotateBy:  20, duration: 14, delay: 0,   opacity: 0.55 },
  { top: "22%",  left: "78%", size: 64, color: BRAND.blue, shape: "flower",    driftX: -70, driftY:  50, rotateBy: 360, duration: 16, delay: 0.5, opacity: 0.5  },
  { top: "44%",  left: "62%", size: 60, color: "#F59E0B", shape: "butterfly", driftX:  80, driftY: -60, rotateBy:  -15, duration: 13, delay: 1.2, opacity: 0.55 },
  { top: "60%",  left: "16%", size: 52, color: "#8B5CF6", shape: "lightning", driftX: -40, driftY:  60, rotateBy:  10, duration: 12, delay: 0.3, opacity: 0.6  },
  { top: "82%",  left: "78%", size: 70, color: "#10B981", shape: "smiley",    driftX:  50, driftY: -70, rotateBy: 360, duration: 18, delay: 0.8, opacity: 0.55 },
  { top: "100%", left: "32%", size: 60, color: BRAND.blue, shape: "wireframe", driftX: -60, driftY: -50, rotateBy: 360, duration: 20, delay: 0,   opacity: 0.4  },
  { top: "120%", left: "70%", size: 64, color: "#EC4899", shape: "cd",        driftX:  60, driftY:  60, rotateBy: 360, duration: 17, delay: 0.6, opacity: 0.5  },
  { top: "142%", left: "12%", size: 56, color: "#F59E0B", shape: "eye",       driftX:  50, driftY: -50, rotateBy:  20, duration: 14, delay: 1.0, opacity: 0.55 },
  { top: "162%", left: "58%", size: 60, color: "#8B5CF6", shape: "heart",     driftX: -70, driftY:  50, rotateBy: -20, duration: 15, delay: 0.4, opacity: 0.55 },
  { top: "184%", left: "82%", size: 64, color: BRAND.blue, shape: "butterfly", driftX: -60, driftY: -60, rotateBy:  15, duration: 16, delay: 0.9, opacity: 0.5  },
];

function ShapeSVG({ shape, size, color }: { shape: SparkleShape; size: number; color: string }) {
  const s = size;
  switch (shape) {
    case "star":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 1 L13.5 9.5 L22 11 L13.5 12.5 L12 22 L10.5 12.5 L2 11 L10.5 9.5 Z" fill={color}/>
        </svg>
      );
    case "asterisk":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="3"  x2="12" y2="21"/>
          <line x1="3"  y1="12" x2="21" y2="12"/>
          <line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/>
          <line x1="5.6" y1="18.4" x2="18.4" y2="5.6"/>
        </svg>
      );
    case "plus":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="4" x2="12" y2="20"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
        </svg>
      );
    case "ring":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
          <circle cx="12" cy="12" r="9"/>
        </svg>
      );
    case "diamond":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill={color}/>
        </svg>
      );
    case "squiggle":
      return (
        <svg width={s * 1.6} height={s * 0.7} viewBox="0 0 40 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
          <path d="M2 8 Q 7 1, 12 8 T 22 8 T 32 8 T 38 8" />
        </svg>
      );
    case "heart":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
          <path d="M12 21s-7-4.5-9.5-9C0.7 8.4 2.6 4 6.5 4c2 0 3.6 1.1 4.5 2.7C11.9 5.1 13.5 4 15.5 4c3.9 0 5.8 4.4 4 8C19 16.5 12 21 12 21z"/>
        </svg>
      );
    case "flower":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <g fill={color}>
            <ellipse cx="20" cy="9"  rx="6" ry="9"/>
            <ellipse cx="20" cy="31" rx="6" ry="9"/>
            <ellipse cx="9"  cy="20" rx="9" ry="6"/>
            <ellipse cx="31" cy="20" rx="9" ry="6"/>
          </g>
          <circle cx="20" cy="20" r="5" fill="#FDE047"/>
        </svg>
      );
    case "butterfly":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill={color}>
          <path d="M20 20 C 14 8, 4 8, 4 18 C 4 26, 12 28, 20 22 Z"/>
          <path d="M20 20 C 26 8, 36 8, 36 18 C 36 26, 28 28, 20 22 Z"/>
          <path d="M20 22 C 14 32, 6 30, 6 24 C 8 28, 14 28, 20 24 Z"/>
          <path d="M20 22 C 26 32, 34 30, 34 24 C 32 28, 26 28, 20 24 Z"/>
          <ellipse cx="20" cy="22" rx="1.4" ry="6" fill="#1A1A1A"/>
        </svg>
      );
    case "lightning":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
          <path d="M14 2 L4 14 L11 14 L9 22 L20 9 L13 9 Z"/>
        </svg>
      );
    case "smiley":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill={color}/>
          <circle cx="14" cy="16" r="2.4" fill="#1A1A1A"/>
          <circle cx="26" cy="16" r="2.4" fill="#1A1A1A"/>
          <path d="M12 24 Q 20 32, 28 24" fill="none" stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round"/>
        </svg>
      );
    case "eye":
      return (
        <svg width={s} height={s * 0.6} viewBox="0 0 40 24">
          <path d="M2 12 Q 20 -4, 38 12 Q 20 28, 2 12 Z" fill="#FFFFFF" stroke={color} strokeWidth="2"/>
          <circle cx="20" cy="12" r="6" fill={color}/>
          <circle cx="20" cy="12" r="2.5" fill="#1A1A1A"/>
        </svg>
      );
    case "cd":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <defs>
            <linearGradient id={`cd-${color}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#9FD8FF"/>
              <stop offset="33%"  stopColor="#FFB7C5"/>
              <stop offset="66%"  stopColor="#C7B8FF"/>
              <stop offset="100%" stopColor="#A7F0C9"/>
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="18" fill={`url(#cd-${color})`} stroke={color} strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="11" fill="none" stroke="#FFFFFF66" strokeWidth="1"/>
          <circle cx="20" cy="20" r="6"  fill="#F7F1DC" stroke={color} strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="2"  fill="#1A1A1A"/>
        </svg>
      );
    case "spiral":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
          <path d="M12 12 m -6 0 a 6 6 0 1 1 12 0 a 4 4 0 1 1 -8 0 a 2 2 0 1 1 4 0"/>
        </svg>
      );
    case "wireframe":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.4">
          <circle cx="20" cy="20" r="18"/>
          <ellipse cx="20" cy="20" rx="18" ry="7"/>
          <ellipse cx="20" cy="20" rx="7"  ry="18"/>
          <ellipse cx="20" cy="20" rx="14" ry="18"/>
          <ellipse cx="20" cy="20" rx="18" ry="14"/>
        </svg>
      );
  }
}

export function Y2KBackdrop() {
  const lite = useLiteMotion();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Orb palette + blend per theme. Light uses warm pastels with
  // "multiply" so they tint the cream page in a recognizable way.
  // Dark uses saturated neon colours with "lighten" so they glow
  // softly against the near-black background while still blending
  // into it instead of looking like hard discs.
  const ORBS = isDark ? ORBS_DARK : ORBS_LIGHT;
  const orbOpacity = isDark ? 0.55 : 0.7;
  const orbBlend: "screen" | "multiply" | "normal" | "lighten" = isDark
    ? "lighten"
    : "multiply";

  /* Cursor parallax — each orb gets a per-instance depth so they drift
     toward the cursor at slightly different speeds, layered on top of
     the existing framer-motion idle animation. */
  const orbWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cursor = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const orbs = lite ? ORBS.slice(0, 3) : ORBS;
  useEffect(() => {
    if (lite) return;
    const onMove = (e: MouseEvent | PointerEvent) => {
      // Normalised −0.5..+0.5 around viewport centre
      cursor.current.tx = e.clientX / window.innerWidth - 0.5;
      cursor.current.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    let raf = 0;
    const tick = () => {
      // Lerp current toward target for smooth easing
      cursor.current.x += (cursor.current.tx - cursor.current.x) * 0.11;
      cursor.current.y += (cursor.current.ty - cursor.current.y) * 0.11;
      const refs = orbWrapRefs.current;
      for (let i = 0; i < refs.length; i++) {
        const el = refs[i];
        if (!el) continue;
        // Alternate sign per orb for a more organic, parallax-y feel.
        // Larger orbs (later indices) drift further.
        const depth = 90 + (i % 4) * 40;
        const sign = i % 2 === 0 ? 1 : -1;
        const dx = cursor.current.x * depth * sign;
        const dy = cursor.current.y * depth * sign;
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [lite]);


  return (
    <div
      aria-hidden="true"
      className="y2k-backdrop pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Soft gradient orbs — bigger sweeps. Outer wrapper holds the
          cursor-parallax transform; inner motion.div keeps the existing
          framer idle drift so the two motions compose. */}
      {orbs.map((o, i) => (
        <div
          key={`orb-${i}`}
          ref={(el) => {
            orbWrapRefs.current[i] = el;
          }}
          className="y2k-orb-wrap"
          style={{
            position: "absolute",
            top: o.top,
            left: o.left,
            width: lite ? Math.min(o.size * 0.52, 260) : o.size,
            height: lite ? Math.min(o.size * 0.52, 260) : o.size,
            willChange: lite ? undefined : "transform",
            transition: lite ? undefined : "transform 0.05s linear",
          }}
        >
          <motion.div
            className="y2k-orb"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${o.from} 0%, ${o.to} 55%, transparent 75%)`,
              filter: `blur(${lite ? Math.min(o.blur * 0.32, 28) : o.blur}px)`,
              opacity: lite ? orbOpacity * 0.85 : orbOpacity,
              mixBlendMode: orbBlend,
            }}
            animate={
              lite
                ? undefined
                : {
                    x: [0, o.drift[0], o.drift[0] * 0.4, 0],
                    y: [0, o.drift[1], o.drift[1] * -0.5, 0],
                    scale: [1, 1.12, 0.94, 1],
                  }
            }
            transition={{
              duration: o.duration,
              delay: o.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      ))}

      {/* Tilted gradient tiles — bobbing & rotating (desktop only) */}
      {!lite && TILES.map((t, i) => (
        <motion.div
          key={`tile-${i}`}
          className="y2k-heavy"
          style={{
            position: "absolute",
            top: t.top,
            left: t.left,
            width: t.size,
            height: t.size,
            background: `linear-gradient(135deg, ${t.color}55 0%, ${t.color}10 100%)`,
            border: `1.5px solid ${t.color}55`,
            borderRadius: 18,
            backdropFilter: "blur(2px)",
            boxShadow: `0 8px 32px ${t.color}33`,
          }}
          animate={{
            y: [0, -t.drift, t.drift * 0.5, 0],
            x: [0, t.drift * 0.6, -t.drift * 0.4, 0],
            rotate: [t.rotate, t.rotate + 18, t.rotate - 8, t.rotate],
          }}
          transition={{
            duration: t.duration,
            delay: t.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Larger Y2K floaters drifting on figure-8 paths (desktop only) */}
      {!lite && FLOATERS.map((f, i) => (
        <motion.div
          key={`floater-${i}`}
          className="y2k-heavy"
          style={{
            position: "absolute",
            top: f.top,
            left: f.left,
            opacity: f.opacity,
            filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.12))",
          }}
          animate={{
            x: [0, f.driftX, f.driftX * -0.6, f.driftX * 0.4, 0],
            y: [0, f.driftY, f.driftY * 0.7, f.driftY * -0.4, 0],
            rotate: [0, f.rotateBy, f.rotateBy * 0.5, f.rotateBy * 1.4, 0],
            scale: [1, 1.08, 0.92, 1.04, 1],
          }}
          transition={{
            duration: f.duration,
            delay: f.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <ShapeSVG shape={f.shape} size={f.size} color={f.color} />
        </motion.div>
      ))}

      {/* Sparkles, asterisks, rings — twinkle + spin (desktop only) */}
      {!lite && SPARKLES.map((s, i) => (
        <motion.div
          key={`star-${i}`}
          className="y2k-heavy"
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
          }}
          animate={{
            scale: [0.7, 1.25, 0.85, 1.1, 0.7],
            rotate: [s.rotate, s.rotate + 360],
            opacity: [0.25, 0.85, 0.4, 0.7, 0.25],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <ShapeSVG shape={s.shape} size={s.size} color={s.color} />
        </motion.div>
      ))}

      {/* Drifting grain layer on top of decorations (desktop only) */}
      {!lite && (
        <motion.div
          className="y2k-heavy"
          style={{
            position: "absolute",
            inset: -40,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            opacity: 0.07,
            mixBlendMode: "multiply",
          }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 25, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
