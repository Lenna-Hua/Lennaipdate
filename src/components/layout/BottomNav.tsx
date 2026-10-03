import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Briefcase, Palette, User, type LucideIcon } from "lucide-react";

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function BottomNav() {
  const [location] = useLocation();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 80) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: Array<{ href: string; label: string; icon: LucideIcon }> = [
    { href: "/",        label: "Home",    icon: Home },
    { href: "/work",    label: "Work",    icon: Briefcase },
    { href: "/studio",  label: "Studio",  icon: Palette },
    { href: "/about",   label: "About",   icon: User },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? location === "/" || location === "/home"
      : location === href || location.startsWith(href + "/");

  return (
    <motion.nav
      aria-label="Primary"
      className="fixed left-1/2 -translate-x-1/2 z-40 pointer-events-none w-auto max-w-[calc(100vw-1rem)]"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
      initial={false}
      animate={{ y: hidden ? 96 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
    >
      <div
        className="
          pointer-events-auto
          flex items-center gap-0.5
          rounded-full
          border border-border/60
          bg-background/95 md:bg-background/70 md:backdrop-blur-xl
          shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35),0_2px_8px_-2px_rgba(0,0,0,0.15)]
          px-1 py-1 sm:px-1.5 sm:py-1.5
        "
      >
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className="relative inline-flex items-center justify-center"
            >
              <span
                className={`
                  relative z-10 inline-flex flex-col items-center justify-center gap-0.5
                  px-2.5 py-1.5 sm:px-3.5 sm:py-2
                  text-[10px] sm:text-xs font-sans uppercase tracking-[0.12em] sm:tracking-[0.18em]
                  rounded-full transition-colors duration-300 whitespace-nowrap
                  ${active
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"}
                `}
              >
                <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2} aria-hidden="true" />
                <span className="leading-none">{link.label}</span>
              </span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-full bg-primary"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 36,
                      mass: 0.7,
                    }}
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
