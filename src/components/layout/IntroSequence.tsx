import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";
import outfitSleeveL from "@/assets/avatar/avatar-outfit-sleeve-l.png";
import outfitSleeveR from "@/assets/avatar/avatar-outfit-sleeve-r.png";
import outfitHandL from "@/assets/avatar/avatar-outfit-hand-l.png";
import outfitHandR from "@/assets/avatar/avatar-outfit-hand-r.png";
import { useScrollLock } from "@/lib/smooth-scroll";
import { HEM_H, PRELOAD_IMAGES, SEEN_KEY, avatarFront, outfitBody } from "./intro-shared";

const INTRO_IMAGES = [...PRELOAD_IMAGES, outfitSleeveL, outfitSleeveR, outfitHandL, outfitHandR];

/** Global tempo: every delay and duration below is multiplied by this (1 = ~2.6s total). */
const PACE = 1.2;
const s = (seconds: number) => seconds * PACE;

const BUILD_MS = s(1420);
const JUMP_MS = s(500);
const FALL_MS = s(950);
/** When the outfit scan sweeps over the skeleton (seconds into the build). */
const SCAN_AT = s(0.9);
const SCAN_S = s(0.42);

/** Artwork space: the outfit layers are 298×644 cut-outs of the front character sheet. */
const VIEW_W = 298;
const VIEW_H = 644;
/** Logo head scaled so its hair lines up with the outfit's hair. */
const HEAD = { x: -57.6, y: -13.5, width: 405.5, height: 313.3 };
/** She reaches up with her right arm (viewer's right) and hangs from the pull ring. */
const GRAB_SIDE = 1;
const REACH_DEG = 150;

const INK = "#111";
const PAPER = "#fff";
const SETTLE = [0.22, 1.25, 0.36, 1] as const;

type Phase = "build" | "jump" | "fall";
type Pt = readonly [number, number];
type Side = -1 | 1;

const pivot = (x: number, y: number) => ({
  transformBox: "view-box" as const,
  originX: `${x}px`,
  originY: `${y}px`,
});

/** Bones are drawn for the figure's right side (viewer's left) and mirrored across the spine. */
const mirror = (p: Pt, side: Side): Pt => (side < 0 ? p : [300 - p[0], p[1]]);

/** Long bone with slightly swollen ends, inked like the illustration. */
function Bone({ a, b, w = 6, knob = 1.45 }: { a: Pt; b: Pt; w?: number; knob?: number }) {
  const r = (w * knob) / 2;
  const layer = (color: string, grow: number) => (
    <>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w + grow * 2} strokeLinecap="round" />
      <circle cx={a[0]} cy={a[1]} r={r + grow} fill={color} />
      <circle cx={b[0]} cy={b[1]} r={r + grow} fill={color} />
    </>
  );
  return (
    <g>
      {layer(INK, 2.3)}
      {layer(PAPER, 0)}
    </g>
  );
}

/** Curved bone (ribs, collarbones, cartilage). */
function Arc({ d, w = 3.2 }: { d: string; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={INK} strokeWidth={w + 4.6} />
      <path d={d} stroke={PAPER} strokeWidth={w} />
    </g>
  );
}

const outline = { fill: PAPER, stroke: INK, strokeWidth: 2.3, strokeLinejoin: "round" as const };

function scatter(n: number) {
  const r = (k: number) => {
    const v = Math.sin(n * 127.1 + k * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  return { x: (r(1) - 0.5) * 320, y: (r(2) - 0.5) * 260 - 30, rotate: (r(3) - 0.5) * 240 };
}

/** A bone that flies in from a scattered spot and settles into place. */
function Piece({ at, n, children }: { at: number; n: number; children: ReactNode }) {
  return (
    <motion.g
      initial={{ ...scatter(n), opacity: 0 }}
      animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      transition={{ delay: s(at), duration: s(0.36), ease: SETTLE, opacity: { delay: s(at), duration: s(0.1) } }}
    >
      {children}
    </motion.g>
  );
}

const ARMS: Record<Side, { pivot: Pt; hand: Pt; sleeve: string; handImg: string }> = {
  [-1]: { pivot: [58, 262], hand: [40, 430], sleeve: outfitSleeveL, handImg: outfitHandL },
  [1]: { pivot: [240, 262], hand: [252, 430], sleeve: outfitSleeveR, handImg: outfitHandR },
};

/** Where the grabbing hand's fingers end up once the arm is raised at its natural length. */
const GRIP: Pt = (() => {
  const { pivot: p, hand } = ARMS[GRAB_SIDE];
  const th = ((-GRAB_SIDE * REACH_DEG) * Math.PI) / 180;
  const rx = hand[0] - p[0];
  const ry = hand[1] + 10 - p[1];
  return [p[0] + rx * Math.cos(th) - ry * Math.sin(th), p[1] + rx * Math.sin(th) + ry * Math.cos(th)];
})();
/** Hair top sits this far above the grip; the cord is long enough to keep her head under the rail. */
const HEAD_ABOVE_GRIP = (GRIP[1] - 12) / VIEW_H;

/** Figure height token shared by the character box and the pull cord so they stay aligned. */
const FIG_H = "min(56vh, 440px)";
const CORD_X = (GRIP[0] - VIEW_W / 2) / VIEW_H;
const CORD_EXTRA = 26;
const RING = 18;

function ringCenter(viewportW: number, figH: number) {
  return { x: viewportW / 2 + figH * CORD_X, y: HEM_H + figH * HEAD_ABOVE_GRIP + CORD_EXTRA + RING / 2 };
}

/** Ink-and-paper pull cord that drops from the rail, sways, then goes taut when she hangs on it. */
function PullCord({ phase }: { phase: Phase }) {
  const hanging = phase !== "build";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute flex flex-col items-center"
      style={{ top: HEM_H - 2, left: `calc(50% + var(--fig-h) * ${CORD_X})`, x: "-50%", originY: 0 }}
      initial={{ y: "-105%", rotate: 0 }}
      animate={hanging ? { y: 0, rotate: 0 } : { y: 0, rotate: [0, 6, -4, 3, -1.5, 0] }}
      transition={
        hanging
          ? { duration: s(0.1) }
          : {
              y: { delay: SCAN_AT, duration: s(0.38), ease: SETTLE },
              rotate: { delay: SCAN_AT + s(0.25), duration: s(1), ease: "easeInOut" },
            }
      }
    >
      <div
        className="w-[5px] border-x-[1.5px] border-[#111] bg-white"
        style={{ height: `calc(var(--fig-h) * ${HEAD_ABOVE_GRIP} + ${CORD_EXTRA + 2}px)` }}
      />
      <div
        className="rounded-full border-[3px] border-white"
        style={{ width: RING, height: RING, boxShadow: `0 0 0 1.5px ${INK}, inset 0 0 0 1.5px ${INK}` }}
      />
    </motion.div>
  );
}

function HandBones({ side }: { side: Side }) {
  const m = (p: Pt) => mirror(p, side);
  const base = side < 0 ? 60 : 80;
  return (
    <>
      <Piece at={side < 0 ? 0.6 : 0.63} n={base}>
        {[
          [38, 412],
          [44, 411],
          [41, 416],
          [47, 415],
        ].map(([x, y]) => {
          const [cx, cy] = m([x, y]);
          return <circle key={`${x}${y}`} cx={cx} cy={cy} r={3} {...outline} strokeWidth={1.8} />;
        })}
      </Piece>
      {[0, 1, 2, 3].map((k) => (
        <Piece key={k} at={(side < 0 ? 0.62 : 0.65) + k * 0.01} n={base + 1 + k}>
          <Bone a={m([35 + k * 4, 419])} b={m([31 + k * 5.5, 431])} w={2.2} knob={1.6} />
          <Bone a={m([31 + k * 5.5, 434])} b={m([30 + k * 6, 446])} w={1.9} knob={1.5} />
        </Piece>
      ))}
      <Piece at={side < 0 ? 0.64 : 0.67} n={base + 6}>
        <Bone a={m([47, 417])} b={m([54, 425])} w={2.2} knob={1.6} />
        <Bone a={m([55, 428])} b={m([58, 434])} w={1.9} knob={1.5} />
      </Piece>
    </>
  );
}

/**
 * Grabbing arm: pulls back on the crouch, then reaches up at full length.
 * Free arm: swings up for balance on take-off, then dangles and sways while she hangs.
 */
function armMotion(side: Side, phase: Phase): { animate: TargetAndTransition; transition: Transition } {
  const out = -side;
  if (phase === "build") return { animate: { rotate: 0 }, transition: { duration: 0 } };
  if (side === GRAB_SIDE) {
    return {
      animate: { rotate: phase === "jump" ? [0, -out * 12, out * REACH_DEG] : out * REACH_DEG },
      transition:
        phase === "jump"
          ? { duration: JUMP_MS / 1000, times: [0, 0.3, 0.85], ease: ["easeOut", [0.3, 1.25, 0.5, 1]] }
          : { duration: 0 },
    };
  }
  return phase === "jump"
    ? {
        animate: { rotate: [0, -out * 10, out * 48] },
        transition: { duration: JUMP_MS / 1000, times: [0, 0.3, 1], ease: ["easeOut", "easeOut"] },
      }
    : {
        animate: { rotate: [out * 48, out * 12, out * 26, out * 16, out * 20] },
        transition: { duration: FALL_MS / 1000, ease: "easeInOut" },
      };
}

function Arm({ side, phase, reveal }: { side: Side; phase: Phase; reveal: string }) {
  const a = ARMS[side];
  const m = (p: Pt) => mirror(p, side);
  const t = side < 0 ? 0 : 0.03;
  const { animate, transition } = armMotion(side, phase);
  return (
    <motion.g style={pivot(...a.pivot)} initial={{ rotate: 0 }} animate={animate} transition={transition}>
      <Piece at={0.46 + t} n={side < 0 ? 40 : 50}>
        <Bone a={m([60, 264])} b={m([49, 336])} w={7} knob={1.55} />
      </Piece>
      <Piece at={0.52 + t} n={side < 0 ? 41 : 51}>
        <Bone a={m([52, 341])} b={m([45, 405])} w={3.6} knob={1.5} />
        <Bone a={m([45, 342])} b={m([37, 404])} w={3.6} knob={1.5} />
      </Piece>
      <image href={a.sleeve} width={VIEW_W} height={VIEW_H} clipPath={reveal} />
      <HandBones side={side} />
      <image href={a.handImg} width={VIEW_W} height={VIEW_H} clipPath={reveal} />
    </motion.g>
  );
}

function Leg({ side }: { side: Side }) {
  const m = (p: Pt) => mirror(p, side);
  const t = side < 0 ? 0 : 0.03;
  const n = side < 0 ? 0 : 10;
  return (
    <>
      <Piece at={0 + t} n={n}>
        <ellipse cx={m([104, 592])[0]} cy={592} rx={9} ry={6} {...outline} />
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <Bone a={m([96 + k * 4, 599])} b={m([80 + k * 8.5, 621])} w={2.6} knob={1.5} />
            <Bone a={m([80 + k * 8.5, 625])} b={m([78 + k * 9, 632])} w={2.1} knob={1.4} />
          </g>
        ))}
      </Piece>
      <Piece at={0.06 + t} n={n + 1}>
        <Bone a={m([106, 535])} b={m([99, 583])} w={3.2} knob={1.6} />
        <Bone a={m([117, 532])} b={m([108, 584])} w={7} knob={1.35} />
      </Piece>
      <Piece at={0.12 + t} n={n + 2}>
        <Bone a={m([124, 452])} b={m([116, 519])} w={8} knob={1.5} />
        <circle cx={m([112, 457])[0]} cy={457} r={4.5} {...outline} />
      </Piece>
      <Piece at={0.15 + t} n={n + 3}>
        <ellipse cx={m([117, 525])[0]} cy={525} rx={5.5} ry={6.5} {...outline} />
      </Piece>
    </>
  );
}

const RIB_HALF_WIDTH = [30, 42, 50, 55, 57, 56, 50, 42];

function Robot({ phase }: { phase: Phase }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const revealId = `reveal-${uid}`;
  const skeletonId = `skeleton-${uid}`;
  const reveal = `url(#${revealId})`;
  const raised = phase !== "build";
  const scan = { delay: SCAN_AT, duration: SCAN_S, ease: "easeInOut" as const };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      style={{ overflow: "visible", filter: "drop-shadow(0 10px 0 rgba(0,0,0,0.18))" }}
    >
      <defs>
        <clipPath id={revealId}>
          <motion.rect
            x={-600}
            y={-600}
            width={1500}
            initial={{ height: 600 }}
            animate={{ height: 600 + VIEW_H }}
            transition={scan}
          />
        </clipPath>
        <clipPath id={skeletonId}>
          <motion.rect
            x={-600}
            width={1500}
            height={3000}
            initial={{ attrY: -1500 }}
            animate={{ attrY: [-1500, 0, VIEW_H] }}
            transition={{ ...scan, times: [0, 0.001, 1] }}
          />
        </clipPath>
      </defs>

      <motion.ellipse
        cx={150}
        cy={638}
        rx={96}
        ry={8}
        fill="rgba(0,0,0,0.25)"
        style={pivot(150, 638)}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={phase === "build" ? { scaleX: 1, opacity: 1 } : { scaleX: 0.4, opacity: 0 }}
        transition={phase === "build" ? { duration: s(0.3) } : { duration: s(0.12) }}
      />

      {/* A breath and a small weight shift once the body is complete. */}
      <motion.g
        style={pivot(150, 636)}
        initial={{ scaleY: 1, rotate: 0 }}
        animate={{ scaleY: [1, 1.018, 0.996, 1], rotate: [0, -0.9, 0.6, 0] }}
        transition={{ delay: SCAN_AT - s(0.04), duration: s(0.62), ease: "easeInOut" }}
      >
        <Arm side={-1} phase={phase} reveal={reveal} />
        <Arm side={1} phase={phase} reveal={reveal} />

        <g clipPath={`url(#${skeletonId})`}>
          <Leg side={-1} />
          <Leg side={1} />

          <Piece at={0.2} n={20}>
            <path
              d="M150 402 C120 394 96 400 98 420 C100 438 114 448 124 452 C132 462 142 466 150 466 C158 466 168 462 176 452 C186 448 200 438 202 420 C204 400 180 394 150 402 Z"
              {...outline}
            />
            <path d="M106 416 C112 406 128 404 137 411 M194 416 C188 406 172 404 163 411" fill="none" stroke={INK} strokeWidth={2} />
            <path d="M139 405 L161 405 L157 434 L150 443 L143 434 Z" {...outline} />
            <ellipse cx={135} cy={456} rx={6} ry={4.5} fill="hsl(var(--primary))" stroke={INK} strokeWidth={2} />
            <ellipse cx={165} cy={456} rx={6} ry={4.5} fill="hsl(var(--primary))" stroke={INK} strokeWidth={2} />
          </Piece>

          {[400, 386, 372].map((y, i) => (
            <Piece key={y} at={0.26 + i * 0.03} n={21 + i}>
              <path d={`M134 ${y + 5} H166`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
              <path d={`M134 ${y + 5} H166`} stroke={PAPER} strokeWidth={2.4} strokeLinecap="round" />
              <rect x={138} y={y} width={24} height={11} rx={4} {...outline} />
            </Piece>
          ))}

          <Piece at={0.34} n={24}>
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x={142} y={258 + i * 11} width={16} height={8} rx={3} {...outline} strokeWidth={2} />
            ))}
          </Piece>

          {([-1, 1] as const).map((side) => (
            <Piece key={side} at={0.36 + (side > 0 ? 0.02 : 0)} n={25 + (side > 0 ? 1 : 0)}>
              <path
                d={side < 0 ? "M66 262 Q82 258 99 266 Q94 296 88 322 Q76 300 66 262 Z" : "M234 262 Q218 258 201 266 Q206 296 212 322 Q224 300 234 262 Z"}
                {...outline}
              />
            </Piece>
          ))}

          {RIB_HALF_WIDTH.map((hw, i) => {
            const y = 262 + i * 12.5;
            const start = i === 7 ? hw * 0.5 : 7;
            const drop = 12 + i * 1.6;
            return (
              <Piece key={i} at={0.42 + (7 - i) * 0.02} n={30 + i}>
                {([-1, 1] as const).map((side) => (
                  <Arc
                    key={side}
                    d={`M${150 + side * start} ${y} C${150 + side * hw * 0.55} ${y - 12} ${150 + side * hw} ${y - 6} ${150 + side * hw} ${y + drop}`}
                  />
                ))}
              </Piece>
            );
          })}

          <Piece at={0.4} n={38}>
            <path d="M143 252 L157 252 L159 268 L155 330 L150 338 L145 330 L141 268 Z" {...outline} />
            <path d="M141 268 H159" stroke={INK} strokeWidth={2} />
          </Piece>

          <Piece at={0.57} n={39}>
            {([-1, 1] as const).map((side) =>
              [3, 4, 5, 6].map((i) => {
                const hw = RIB_HALF_WIDTH[i];
                const y = 262 + i * 12.5 + 12 + i * 1.6;
                return (
                  <Arc
                    key={`${side}${i}`}
                    w={1.8}
                    d={`M${150 + side * hw} ${y} Q${150 + side * hw * 0.55} ${y + 8} ${150 + side * 6} 334`}
                  />
                );
              }),
            )}
          </Piece>

          {([-1, 1] as const).map((side) => (
            <Piece key={side} at={0.56 + (side > 0 ? 0.02 : 0)} n={42 + (side > 0 ? 1 : 0)}>
              <Arc
                w={4.6}
                d={side < 0 ? "M143 254 C122 247 100 263 62 258" : "M157 254 C178 247 200 263 238 258"}
              />
            </Piece>
          ))}

          {[248, 238, 228, 218].map((y, i) => (
            <Piece key={y} at={0.58 + i * 0.02} n={44 + i}>
              <path d={`M138 ${y + 4} H162`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
              <path d={`M138 ${y + 4} H162`} stroke={PAPER} strokeWidth={1.8} strokeLinecap="round" />
              <rect x={143} y={y} width={14} height={8} rx={3} {...outline} strokeWidth={2} />
            </Piece>
          ))}

          <motion.g
            style={pivot(150, 210)}
            initial={{ y: -380, rotate: 10, opacity: 0 }}
            animate={{ y: [-380, 6, 0, 0], rotate: [10, -4, 2, 0], opacity: [0, 1, 1, 1] }}
            transition={{
              delay: s(0.62),
              duration: s(0.34),
              times: [0, 0.62, 0.82, 1],
              ease: ["easeIn", "easeOut", "easeInOut"],
              opacity: { delay: s(0.62), duration: s(0.08) },
            }}
          >
            <image href={avatarFront} {...HEAD} />
          </motion.g>
        </g>

        <image href={outfitBody} width={VIEW_W} height={VIEW_H} clipPath={reveal} />
        <motion.path
          d="M72 256 Q64 290 49 334 M224 250 Q240 300 248 350 Q254 385 254 410"
          fill="none"
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: raised ? 1 : 0 }}
          transition={{ duration: s(0.1), delay: raised ? s(0.06) : 0 }}
        />
      </motion.g>

      <motion.g
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: VIEW_H, opacity: [0, 1, 1, 0] }}
        transition={{ ...scan, opacity: { ...scan, times: [0, 0.1, 0.85, 1] } }}
      >
        <rect x={-30} y={-2.5} width={VIEW_W + 60} height={5} fill={INK} />
        <rect x={-30} y={-1} width={VIEW_W + 60} height={2} fill={PAPER} />
      </motion.g>
    </svg>
  );
}

/**
 * First-visit intro: a skeleton with the logo face assembles bone by bone, gets
 * "dressed" by a scan line, then jumps, grabs the pull cord and rides the curtain
 * down to reveal the page. Loaded lazily by `IntroCurtain`.
 */
export default function IntroSequence({ label }: { label: string }) {
  const [visible, setVisible] = useState(true);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>("build");
  const [metrics, setMetrics] = useState({ jumpX: 0, jumpY: -320, fallY: 1400 });
  const robotRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const percent = useTransform(progress, (v) => `${Math.round(v)}%`);
  const barScale = useTransform(progress, [0, 100], [0, 1]);

  useScrollLock(visible);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    let cancelled = false;
    const go = () => {
      if (!cancelled) setStarted(true);
    };
    Promise.all(
      INTRO_IMAGES.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => undefined);
      }),
    ).then(go);
    const fallback = window.setTimeout(go, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  useEffect(() => {
    if (!started) return;
    const counter = animate(progress, 100, { duration: SCAN_AT + SCAN_S, ease: "easeInOut" });
    const timers = [
      window.setTimeout(() => {
        const el = robotRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const ring = ringCenter(window.innerWidth, r.height);
          setMetrics({
            jumpX: ring.x - (r.left + (GRIP[0] / VIEW_W) * r.width),
            jumpY: ring.y - (r.top + (GRIP[1] / VIEW_H) * r.height),
            fallY: window.innerHeight + 80,
          });
        }
        setPhase("jump");
      }, BUILD_MS),
      window.setTimeout(() => setPhase("fall"), BUILD_MS + JUMP_MS),
    ];
    return () => {
      counter.stop();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [started, progress]);

  const vh = typeof window === "undefined" ? 800 : window.innerHeight;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[200] bg-primary text-primary-foreground"
          style={{ boxShadow: "0 -30px 60px -10px rgba(0,0,0,0.35)", ["--fig-h" as string]: FIG_H }}
          initial={false}
          animate={phase === "fall" ? { y: [0, 0, vh * 0.035, vh * 0.02, metrics.fallY] } : { y: 0 }}
          transition={
            phase === "fall"
              ? {
                  duration: FALL_MS / 1000,
                  times: [0, 0.22, 0.34, 0.44, 1],
                  ease: ["linear", "easeOut", "easeInOut", [0.55, 0, 0.85, 0.35]],
                }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (phase === "fall") setVisible(false);
          }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(0,0,0,0.16) 0%, rgba(255,255,255,0.07) 22%, rgba(0,0,0,0.05) 48%, rgba(255,255,255,0.08) 72%, rgba(0,0,0,0.16) 100%)",
              backgroundSize: "140px 100%",
            }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "build" ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <motion.div
              ref={robotRef}
              className="relative aspect-[298/644]"
              style={
                phase === "fall"
                  ? { height: "var(--fig-h)", originX: GRIP[0] / VIEW_W, originY: GRIP[1] / VIEW_H }
                  : { height: "var(--fig-h)", originX: 0.5, originY: 1 }
              }
              animate={
                phase === "build"
                  ? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 }
                  : phase === "jump"
                    ? {
                        x: [0, 0, metrics.jumpX],
                        y: [0, 0, metrics.jumpY],
                        scaleY: [1, 0.9, 1.04, 1],
                        scaleX: [1, 1.04, 0.98, 1],
                      }
                    : { x: metrics.jumpX, y: metrics.jumpY, scaleX: 1, scaleY: 1, rotate: [0, -27, -15, -23, -20] }
              }
              transition={
                phase === "jump"
                  ? {
                      x: { duration: JUMP_MS / 1000, times: [0, 0.3, 1], ease: ["linear", [0.2, 0.7, 0.4, 1]] },
                      y: { duration: JUMP_MS / 1000, times: [0, 0.3, 1], ease: ["easeOut", [0.12, 0.8, 0.3, 1]] },
                      scaleY: { duration: JUMP_MS / 1000, times: [0, 0.3, 0.55, 1] },
                      scaleX: { duration: JUMP_MS / 1000, times: [0, 0.3, 0.55, 1] },
                    }
                  : phase === "fall"
                    ? { rotate: { duration: FALL_MS / 1000, ease: "easeInOut" }, default: { duration: 0 } }
                    : { duration: 0 }
              }
            >
              {started && <Robot phase={phase} />}
            </motion.div>

            <motion.div
              className="flex w-48 flex-col gap-2 text-[11px] uppercase tracking-[0.2em]"
              initial={{ opacity: 0, y: 8 }}
              animate={phase === "build" ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-baseline justify-between">
                <span>Assembling</span>
                <motion.span className="tabular-nums">{percent}</motion.span>
              </div>
              <div className="h-[2px] w-full bg-white/25">
                <motion.div className="h-full origin-left bg-white" style={{ scaleX: barScale }} />
              </div>
            </motion.div>
          </div>

          <PullCord phase={phase} />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 border-b-[2.5px] border-[#111] bg-black/30"
            style={{ height: HEM_H }}
          />

          <motion.span
            aria-hidden
            className="absolute bottom-8 left-6 font-display text-2xl font-black uppercase tracking-tight md:left-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "build" ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          >
            Opening {label}
          </motion.span>

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="absolute bottom-6 right-6 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-10"
          >
            Skip intro
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
