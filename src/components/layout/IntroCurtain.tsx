import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { useScrollLock } from "@/lib/smooth-scroll";
import { HEM_H, PRELOAD_IMAGES, sectionLabel, shouldShowIntro } from "./intro-shared";

type SequenceProps = { label: string };

/** If the sequence chunk fails to load, fall back to showing the site instead of a blank curtain. */
const IntroSequence = lazy(
  (): Promise<{ default: ComponentType<SequenceProps> }> =>
    import("./IntroSequence").catch(() => ({ default: () => null })),
);

/** Matches the sequence's first frame so there is no flash while its chunk downloads. */
function CurtainPlaceholder({ onSkip }: { onSkip: () => void }) {
  useScrollLock(true);
  return (
    <div className="fixed inset-0 z-[200] bg-primary text-primary-foreground">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 border-b-[2.5px] border-[#111] bg-black/30"
        style={{ height: HEM_H }}
      />
      <button
        type="button"
        onClick={onSkip}
        className="absolute bottom-6 right-6 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-10"
      >
        Skip intro
      </button>
    </div>
  );
}

/**
 * First-visit intro gate. Returning visitors, `/admin` and reduced-motion users never
 * download the animation; first visits fetch the sequence chunk and its artwork in parallel.
 */
export function IntroCurtain() {
  const [location] = useLocation();
  const [label] = useState(() => sectionLabel(location));
  const [show, setShow] = useState(() => shouldShowIntro(location));

  useEffect(() => {
    if (!show) return;
    PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [show]);

  if (!show) return null;
  return (
    <Suspense fallback={<CurtainPlaceholder onSkip={() => setShow(false)} />}>
      <IntroSequence label={label} />
    </Suspense>
  );
}
