import { createContext, useContext, useEffect, type ReactNode } from "react";
import type Lenis from "lenis";

const LenisContext = createContext<Lenis | null>(null);

/**
 * Native browser scrolling wrapper.
 * Keeps native hardware-accelerated compositor scrolling instead of intercepting
 * wheel/trackpad events on the main thread with Lenis lerp damping.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  return <LenisContext.Provider value={null}>{children}</LenisContext.Provider>;
}

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/** Jump (or glide) the page to a y offset or element, through Lenis when it is running. */
export function scrollPageTo(
  lenis: Lenis | null,
  target: number | HTMLElement,
  { smooth = false, offset = 0 }: { smooth?: boolean; offset?: number } = {},
) {
  if (lenis) {
    lenis.scrollTo(target, { immediate: !smooth, force: true, offset });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, left: 0, behavior: smooth ? "smooth" : "auto" });
  } else {
    target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
}

/** Freeze page scrolling while an overlay (lightbox, menu) is open. */
export function useScrollLock(locked: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.documentElement.style.overflow;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [locked, lenis]);
}
