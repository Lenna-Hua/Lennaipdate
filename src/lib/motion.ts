import { useSyncExternalStore } from "react";
import type { Variants } from "framer-motion";

/* Gentle ease-out: unlike expo/spring curves it doesn't start at full speed,
   so entrances glide in instead of snapping. */
export const SOFT_EASE = [0.25, 0.1, 0.25, 1] as const;

/* Phones, touch tablets and reduced-motion users get the lightweight motion
   profile: shorter, transform-only entrances and a pared-back backdrop. */
const LITE_QUERY =
  "(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

const subscribeLite = subscribeTo(LITE_QUERY);
const subscribeReduced = subscribeTo(REDUCED_QUERY);

const matches = (query: string) =>
  typeof window !== "undefined" && window.matchMedia(query).matches;

export function useLiteMotion(): boolean {
  return useSyncExternalStore(subscribeLite, () => matches(LITE_QUERY), () => false);
}

function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeReduced, () => matches(REDUCED_QUERY), () => false);
}

type FloatInOptions = {
  delay?: number;
  /** Lift distance on desktop in px; phones use roughly half of it. */
  distance?: number;
};

const VIEWPORT = { once: true, amount: 0.12 } as const;

export type MotionProfile = { lite: boolean; reduced: boolean };

export function useMotionProfile(): MotionProfile {
  return { lite: useLiteMotion(), reduced: useReducedMotionPref() };
}

/** Scroll-triggered "float up and settle" entrance for a section. */
export function useFloatIn(options: FloatInOptions = {}) {
  return floatInProps(useMotionProfile(), options);
}

/** Non-hook form of `useFloatIn`, for per-item delays inside lists. */
export function floatInProps(
  { lite, reduced }: MotionProfile,
  { delay = 0, distance = 24 }: FloatInOptions = {},
) {
  if (reduced) {
    return { initial: false as const, animate: { opacity: 1 } };
  }

  return {
    initial: { opacity: 0, y: lite ? Math.round(distance * 0.5) : distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT,
    transition: {
      duration: lite ? 0.55 : 0.8,
      ease: SOFT_EASE,
      delay: lite ? delay * 0.5 : delay,
    },
  };
}

/** Parent/child variants for staggered grids that float in item by item. */
export function useFloatStagger() {
  const lite = useLiteMotion();
  const reduced = useReducedMotionPref();

  const container: Variants = {
    hidden: { opacity: reduced ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduced ? {} : { staggerChildren: lite ? 0.05 : 0.08 },
    },
  };

  const item: Variants = reduced
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: lite ? 12 : 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: lite ? 0.55 : 0.8, ease: SOFT_EASE },
        },
      };

  return { container, item, viewport: VIEWPORT };
}
