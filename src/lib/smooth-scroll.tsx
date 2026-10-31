import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

const LenisContext = createContext<Lenis | null>(null);

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** Lenis smooth scrolling for the public site. Admin keeps native scrolling. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const enabled = !location.startsWith("/admin");
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (!enabled || window.matchMedia(REDUCED_QUERY).matches) return;
    const instance = new Lenis({
      lerp: 0.1,
      autoRaf: true,
      allowNestedScroll: true,
      prevent: (node) => node.closest("[role='dialog'], [data-lenis-prevent]") !== null,
    });
    setLenis(instance);
    return () => {
      instance.destroy();
      setLenis(null);
    };
  }, [enabled]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
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
