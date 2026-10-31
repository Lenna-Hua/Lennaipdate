import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useSpring } from "framer-motion";
import { DinoFallback } from "@/components/SafeImage";
import { BRAND_EASE } from "@/lib/brand";
import {
  DEVICE_FRAMES,
  FLOATING_DEFAULT_BG,
  setSlotOf,
  type MockupDevice,
  type MockupLayout,
  type ScreenMeta,
} from "@/lib/device-mockup";

type ScreenClick = (src: string) => void;

/** A screenshot plus its tweaks, resolved from section data. */
export type Shot = { src: string; zoom: number; y: number; size: number; device?: MockupDevice };

export function toShots(screens: string[], meta: ScreenMeta[] = []): Shot[] {
  return screens
    .map((src, i) => ({
      src,
      zoom: meta[i]?.zoom ?? 100,
      y: meta[i]?.y ?? 0,
      size: meta[i]?.size ?? 100,
      device: meta[i]?.device,
    }))
    .filter((s) => !!s.src);
}

/**
 * Website-style scroll for a screenshot taller than the screen: scroll down a
 * chunk, pause to "read", repeat to the bottom, then glide back to the top.
 * `overflow` and `view` are fractions of the image's own height.
 */
function scrollKeyframes(overflow: number, view: number) {
  const steps = Math.min(8, Math.max(1, Math.ceil(overflow / (view * 0.7))));
  const ys = [0, 0];
  const ts = [0, 1.4];
  let t = 1.4;
  for (let k = 1; k <= steps; k++) {
    const y = -(overflow * k) / steps;
    t += 1.1;
    ys.push(y);
    ts.push(t);
    t += k === steps ? 1.6 : 1.1;
    ys.push(y);
    ts.push(t);
  }
  t += Math.min(2.4, 1 + steps * 0.2);
  ys.push(0);
  ts.push(t);
  return {
    y: ys.map((v) => `${(v * 100).toFixed(3)}%`),
    transition: { duration: t, times: ts.map((x) => x / t), ease: "easeInOut" as const, repeat: Infinity },
  };
}

/**
 * One device with a screenshot inside. `deck` is the screens it can step
 * through; when interactive, clicking crossfades to the next screen, tall
 * screens scroll up and down like a website, and the device tilts toward the cursor.
 */
export function DeviceFrame({
  device,
  deck,
  start = 0,
  interactive = false,
  onOpen,
  alt = "",
  className = "",
  style,
}: {
  device: MockupDevice;
  deck: Shot[];
  start?: number;
  interactive?: boolean;
  onOpen?: ScreenClick;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const spec = DEVICE_FRAMES[device];
  const { left, top, width, height } = spec.screen;
  const reduce = useReducedMotion();
  const live = interactive && !reduce;
  const [idx, setIdx] = useState(start);
  const [broken, setBroken] = useState<Record<string, true>>({});
  /** Image height / width per src, read once loaded. */
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const rotateX = useSpring(0, { stiffness: 160, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 160, damping: 18 });

  useEffect(() => setIdx(start), [start, deck.length]);

  const shot = deck.length ? deck[idx % deck.length] : undefined;
  const canAdvance = interactive && deck.length > 1;
  const clickable = canAdvance || (!!onOpen && !!shot);

  const measure = (src: string, img: HTMLImageElement | null) => {
    if (!img?.naturalWidth || ratios[src]) return;
    const r = img.naturalHeight / img.naturalWidth;
    setRatios((m) => ({ ...m, [src]: r }));
  };

  // Screen height as a fraction of screen width; images taller than this scroll.
  const screenRatio = height / width / spec.aspect;
  const ratio = shot ? ratios[shot.src] : undefined;
  const tall = !!ratio && ratio > screenRatio * 1.02;
  const scale = (shot?.zoom ?? 100) / 100;
  const view = tall ? screenRatio / ratio! : 1;
  const overflow = tall ? Math.max(0, scale - view) : 0;
  const scroll = live && inView && overflow > 0.01 ? scrollKeyframes(overflow, view) : null;
  const restY = `${(-overflow * (shot?.y ?? 0)).toFixed(3)}%`;

  const activate = () => {
    if (canAdvance) setIdx((i) => (i + 1) % deck.length);
    else if (onOpen && shot) onOpen(shot.src);
  };

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!live) return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 8);
  };

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={rootRef}
      className={`group relative ${device === "browser" ? "overflow-hidden bg-[#E9E6E1] ring-1 ring-black/10" : ""} ${clickable ? (canAdvance ? "cursor-pointer" : "cursor-zoom-in") : ""} ${className}`}
      style={{
        aspectRatio: String(spec.aspect),
        ...(device === "browser" ? { borderRadius: "1.4% / 2.1%" } : null),
        ...(live ? { rotateX, rotateY, transformPerspective: 900 } : null),
        ...style,
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={clickable ? activate : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? (canAdvance ? "Next screen" : `Expand screen${alt ? `: ${alt}` : ""}`) : undefined}
      onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), activate()) : undefined}
    >
      {device === "browser" && (
        <div
          className="absolute inset-x-0 top-0 flex items-center gap-[0.8%] px-[1.6%]"
          style={{ height: `${top}%` }}
          aria-hidden="true"
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} className="block rounded-full" style={{ width: "1.1%", aspectRatio: "1", background: c }} />
          ))}
        </div>
      )}
      <div
        className="absolute overflow-hidden bg-black"
        style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
      >
        <AnimatePresence initial={false}>
          {shot &&
            (broken[shot.src] ? (
              <DinoFallback key={`fb-${idx}`} alt={alt} className="absolute inset-0 w-full h-full" aspect="auto" />
            ) : (
              <motion.img
                key={`${shot.src}-${idx}`}
                ref={(el) => {
                  if (el?.complete) measure(shot.src, el);
                }}
                src={shot.src}
                alt={alt}
                draggable={false}
                loading="lazy"
                decoding="async"
                onLoad={(e) => measure(shot.src, e.currentTarget)}
                onError={() => setBroken((b) => ({ ...b, [shot.src]: true }))}
                initial={live ? { opacity: 0 } : false}
                animate={{ opacity: 1, y: scroll ? scroll.y : restY }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.5, ease: BRAND_EASE },
                  y: scroll ? scroll.transition : { duration: 0.8, ease: BRAND_EASE },
                }}
                className={`absolute inset-x-0 top-0 block w-full select-none ${tall ? "h-auto" : "h-full object-cover"}`}
                style={{
                  objectPosition: `50% ${shot.y}%`,
                  scale,
                  originY: 0,
                }}
              />
            ))}
        </AnimatePresence>
        {canAdvance && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[3%] flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          >
            {deck.slice(0, 8).map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all ${i === idx % deck.length ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
      {spec.src && (
        <img
          src={spec.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
        />
      )}
    </motion.div>
  );
}

type LayoutProps = {
  device: MockupDevice;
  shots: Shot[];
  interactive: boolean;
  alt?: string;
  onOpen?: ScreenClick;
};

/** Max width of one device in single/row layouts. */
function deviceMaxWidth(device: MockupDevice): string {
  if (device === "phone") return "280px";
  if (device === "tablet") return "420px";
  return "860px";
}

function SingleLayout({ device, shots, interactive, alt, onOpen }: LayoutProps) {
  return (
    <div className="flex justify-center">
      <DeviceFrame
        device={device}
        deck={shots}
        interactive={interactive}
        alt={alt}
        onOpen={onOpen}
        className="w-full drop-shadow-2xl"
        style={{ maxWidth: deviceMaxWidth(device) }}
      />
    </div>
  );
}

function RowLayout({ device, shots, interactive, alt, onOpen }: LayoutProps) {
  const landscape = DEVICE_FRAMES[device].landscape;
  const cols = landscape ? Math.min(shots.length, 2) : Math.min(shots.length, 4);
  return (
    <div
      className={`grid gap-4 md:gap-6 justify-items-center items-end ${landscape ? "grid-cols-1" : "grid-cols-2"} md:[grid-template-columns:var(--cols)]`}
      style={{ "--cols": `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties}
    >
      {shots.map((s, i) => (
        <DeviceFrame
          key={`${s.src}-${i}`}
          device={device}
          deck={shots}
          start={i}
          interactive={interactive}
          alt={alt}
          onOpen={onOpen}
          className="w-full drop-shadow-xl"
          style={{ maxWidth: deviceMaxWidth(device) }}
        />
      ))}
    </div>
  );
}

function ClusterLayout({ device, shots, interactive, alt, onOpen }: LayoutProps) {
  const items = shots.slice(0, 5);
  const center = Math.floor((items.length - 1) / 2);
  const landscape = DEVICE_FRAMES[device].landscape;
  const base = landscape ? 58 : 30;
  const overlap = landscape ? 22 : 7;
  return (
    <div className="flex justify-center items-end py-[3%]">
      {items.map((s, i) => {
        const dist = Math.abs(i - center);
        return (
          <DeviceFrame
            key={`${s.src}-${i}`}
            device={device}
            deck={shots}
            start={i}
            interactive={interactive}
            alt={alt}
            onOpen={onOpen}
            className="shrink-0 drop-shadow-2xl"
            style={{
              width: `${base * (1 - 0.2 * dist)}%`,
              marginLeft: i === 0 ? 0 : `-${overlap}%`,
              zIndex: 10 - dist,
            }}
          />
        );
      })}
    </div>
  );
}

type Slot = { x: number; y: number; w: number; blur: number; opacity: number; z: number };

/** Positions (% of stage) tuned to the tilted "floating phones" reference. */
const PORTRAIT_SLOTS: Slot[] = [
  { x: 50, y: 50, w: 30, blur: 0, opacity: 1, z: 30 },
  { x: 17, y: 80, w: 28, blur: 0, opacity: 1, z: 25 },
  { x: 72, y: 12, w: 24, blur: 0, opacity: 1, z: 20 },
  { x: 22, y: 34, w: 22, blur: 1.5, opacity: 0.85, z: 10 },
  { x: 81, y: 84, w: 22, blur: 2.5, opacity: 0.8, z: 15 },
  { x: 41, y: 80, w: 17, blur: 6, opacity: 0.5, z: 5 },
  { x: 96, y: 42, w: 17, blur: 8, opacity: 0.45, z: 4 },
];

const LANDSCAPE_SLOTS: Slot[] = [
  { x: 50, y: 50, w: 58, blur: 0, opacity: 1, z: 30 },
  { x: 12, y: 18, w: 40, blur: 3, opacity: 0.6, z: 10 },
  { x: 88, y: 82, w: 40, blur: 3, opacity: 0.6, z: 10 },
  { x: 90, y: 12, w: 28, blur: 7, opacity: 0.4, z: 5 },
  { x: 10, y: 88, w: 28, blur: 7, opacity: 0.4, z: 5 },
];

function FloatingLayout({ device, shots, interactive, alt, onOpen }: LayoutProps) {
  const reduce = useReducedMotion();
  const landscape = DEVICE_FRAMES[device].landscape;
  const slots = landscape ? LANDSCAPE_SLOTS : PORTRAIT_SLOTS;
  const tilt = landscape ? -8 : -14;
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
      {slots.map((slot, i) => {
        const shot = shots[i % shots.length];
        const sharp = slot.blur === 0;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              zIndex: slot.z,
              opacity: slot.opacity,
              filter: sharp
                ? "drop-shadow(0 30px 40px rgba(0,0,0,0.45))"
                : `blur(${slot.blur}px)`,
              transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
            }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, i % 2 ? 8 : -8, 0] }}
              transition={reduce ? undefined : { duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
            >
              <DeviceFrame
                device={device}
                deck={sharp ? shots : [shot]}
                start={sharp ? i % shots.length : 0}
                interactive={sharp && interactive}
                alt={sharp ? alt : ""}
                onOpen={sharp ? onOpen : undefined}
                className="w-full"
              />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

type SetSlot = "big" | "mid" | "small";

/** Base width (% of stage) and anchor for each device in the set. */
const SET_SLOTS: Record<SetSlot, { w: number; left?: number; right?: number; bottom: number; z: number; center?: boolean }> = {
  big: { w: 70, bottom: 7, z: 1, center: true },
  mid: { w: 24, left: 2, bottom: 0, z: 2 },
  small: { w: 12, right: 4, bottom: 0, z: 3 },
};

const SET_FALLBACK: Record<SetSlot, MockupDevice> = { big: "laptop", mid: "tablet", small: "phone" };

/** Assign shots to laptop / tablet / phone slots: by tagged device first, then in order. */
function assignSet(shots: Shot[], device: MockupDevice) {
  const out: Partial<Record<SetSlot, { device: MockupDevice; deck: Shot[] }>> = {};
  const untagged: Shot[] = [];
  for (const s of shots) {
    if (!s.device) {
      untagged.push(s);
      continue;
    }
    const slot = setSlotOf(s.device);
    if (out[slot]) out[slot]!.deck.push(s);
    else out[slot] = { device: s.device, deck: [s] };
  }
  for (const slot of ["big", "mid", "small"] as SetSlot[]) {
    if (out[slot] || !untagged.length) continue;
    const fallback = slot === "big" && setSlotOf(device) === "big" ? device : SET_FALLBACK[slot];
    out[slot] = { device: fallback, deck: [untagged.shift()!] };
  }
  return out;
}

function SetLayout({ device, shots, interactive, alt, onOpen }: LayoutProps) {
  const slots = assignSet(shots, device);
  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
      {(["big", "mid", "small"] as SetSlot[]).map((slot) => {
        const item = slots[slot];
        if (!item) return null;
        const pos = SET_SLOTS[slot];
        const landscapeMid = slot === "mid" && item.device === "tablet-landscape";
        const w = (landscapeMid ? 34 : pos.w) * (item.deck[0].size / 100);
        return (
          <div
            key={slot}
            className="absolute drop-shadow-2xl"
            style={{
              width: `${w}%`,
              bottom: `${pos.bottom}%`,
              zIndex: pos.z,
              ...(pos.center ? { left: "50%", transform: "translateX(-50%)" } : null),
              ...(pos.left !== undefined ? { left: `${pos.left}%` } : null),
              ...(pos.right !== undefined ? { right: `${pos.right}%` } : null),
            }}
          >
            <DeviceFrame
              device={item.device}
              deck={item.deck}
              interactive={interactive}
              alt={alt}
              onOpen={onOpen}
              className="w-full"
            />
          </div>
        );
      })}
    </div>
  );
}

export function MockupStage({
  device,
  layout,
  screens,
  meta,
  background,
  width,
  interactive = false,
  alt,
  onScreenClick,
}: {
  device: MockupDevice;
  layout: MockupLayout;
  screens: string[];
  meta?: ScreenMeta[];
  background?: string;
  /** Mockup width, % of the content column (40–100). */
  width?: number;
  interactive?: boolean;
  alt?: string;
  onScreenClick?: ScreenClick;
}) {
  const shots = toShots(screens, meta);
  if (!shots.length) return null;
  const bg = background || (layout === "floating" ? FLOATING_DEFAULT_BG : "");
  const Layout =
    layout === "floating"
      ? FloatingLayout
      : layout === "set"
        ? SetLayout
        : layout === "cluster"
          ? ClusterLayout
          : layout === "row"
            ? RowLayout
            : SingleLayout;
  return (
    <div
      className={`w-full rounded-xl overflow-hidden ${bg && layout !== "floating" ? "p-6 md:p-10" : ""}`}
      style={bg ? { background: bg } : undefined}
    >
      <div className="mx-auto" style={{ maxWidth: `${Math.min(100, Math.max(40, width ?? 100))}%` }}>
        <Layout
          device={device}
          shots={shots}
          interactive={interactive}
          alt={alt}
          onOpen={onScreenClick}
        />
      </div>
    </div>
  );
}
