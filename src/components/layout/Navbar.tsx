import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import logoSrc from "@assets/logo.png";
import identitySeed from "@/data/identity.json";
import { useContent } from "@/lib/use-content";
import { SafeImage } from "@/components/SafeImage";

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const identityData = useContent("identity", identitySeed) as typeof identitySeed;
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Focus trap for mobile menu
  useEffect(() => {
    if (!mobileOpen) {
      // Return focus to hamburger when menu closes
      hamburgerRef.current?.focus();
      return;
    }
    const menuEl = mobileMenuRef.current;
    if (!menuEl) return;
    // Focus first link on open
    const firstLink = menuEl.querySelector<HTMLElement>('a, button');
    firstLink?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const focusable = menuEl.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const links = [
    { href: "/",        label: "Home"    },
    { href: "/work",    label: "Work"    },
    { href: "/studio",  label: "Studio"  },
    { href: "/about",   label: "About"   },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? location === "/" || location === "/home"
      : location === href || location.startsWith(href + "/");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 lg:px-16 py-4 md:py-6 flex justify-between items-center backdrop-blur-sm bg-background/85 border-b border-[#ffffff06]">

        {/* Logo */}
        <Link href="/" className="relative z-50 flex items-center">
          <SafeImage
            src={logoSrc}
            alt={`${identityData.name}${identityData.role ? ` — ${identityData.role}` : ""}`}
            className="h-8 md:h-9 object-contain"
            fallbackAspect="3 / 1"
          />
          <span className="sr-only">{identityData.name}</span>
        </Link>

        {/* Desktop nav — pill container (omaidmustafa style) */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-1.5 border border-primary/15">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/20"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="ml-3 inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-primary/50 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-4">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-primary/50 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/10 transition-colors"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            ref={hamburgerRef}
            className="text-foreground relative z-50 cursor-pointer flex flex-col gap-[5px] w-7 h-5 justify-center"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <motion.span
              className="block h-px bg-foreground w-full origin-center"
              animate={mobileOpen ? { rotate: 45, y: 4 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.span
              className="block h-px bg-foreground w-full"
              animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-px bg-foreground w-full origin-center"
              animate={mobileOpen ? { rotate: -45, y: -4 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.3 }}
            />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            key="mobile-overlay"
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col items-start justify-center px-8 sm:px-10 gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
            <motion.p
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 mb-1"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.05, duration: 0.3 }}
            >
              Navigate
            </motion.p>

            {links.map((link, i) => {
              const active = isActive(link.href);
              return (
                <motion.div
                  key={link.href}
                  className="flex items-center gap-4 w-full"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{
                    delay: 0.08 + i * 0.07,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {/* Active dot indicator */}
                  <motion.span
                    aria-hidden
                    className="block rounded-full bg-primary"
                    animate={{
                      width: active ? 10 : 4,
                      height: active ? 10 : 4,
                      opacity: active ? 1 : 0.25,
                    }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`font-display font-black uppercase text-[clamp(2.8rem,10vw,5rem)] leading-[0.95] tracking-tight transition-colors duration-300 ${
                      active
                        ? "text-primary"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}

            {/* Close affordance */}
            <motion.button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.08 + links.length * 0.07, duration: 0.35 }}
            >
              <span className="inline-block w-6 h-px bg-current" />
              Close
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
