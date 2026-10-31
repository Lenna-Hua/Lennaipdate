import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

const SEEN_KEY = "lenna-intro-seen";
const HOLD_MS = 1100;

const SECTION_LABELS: Record<string, string> = {
  "": "Home",
  home: "Home",
  work: "Work",
  studio: "Studio",
  about: "About",
  privacy: "Privacy",
  terms: "Terms",
};

function sectionLabel(path: string) {
  const first = path.split("/").filter(Boolean)[0] ?? "";
  return SECTION_LABELS[first] ?? "Hello";
}

function shouldShow(path: string) {
  if (path.startsWith("/admin")) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

/** First-visit curtain that shows the landing section's name, then lifts away. */
export function IntroCurtain() {
  const [location] = useLocation();
  const [label] = useState(() => sectionLabel(location));
  const [visible, setVisible] = useState(() => shouldShow(location));

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    const id = window.setTimeout(() => setVisible(false), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          aria-hidden
          className="fixed inset-0 z-[200] grid place-items-center bg-foreground text-background"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="overflow-hidden">
            <motion.span
              className="block font-display font-black uppercase tracking-tight leading-none text-[clamp(3rem,9vw,7.5rem)]"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            >
              {label}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
