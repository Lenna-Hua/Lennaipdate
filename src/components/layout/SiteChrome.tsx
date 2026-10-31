import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { useTheme } from "@/context/ThemeContext";
import { useScrollLock } from "@/lib/smooth-scroll";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/studio", label: "Studio" },
  { href: "/about", label: "About" },
];

/* Contact location is free text, so the clock zone is pinned here. */
const TIME_ZONE = "America/Toronto";

function useIsActive() {
  const [location] = useLocation();
  return (href: string) =>
    href === "/"
      ? location === "/" || location === "/home"
      : location === href || location.startsWith(href + "/");
}

function useLocalTime() {
  const format = () =>
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TIME_ZONE,
    }).format(new Date());
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

function ChromeLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

function ThemeSwitch({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`group inline-flex items-baseline gap-1.5 text-sm text-foreground hover:text-primary transition-colors ${className}`}
    >
      {theme === "dark" ? "Dark" : "Light"}
      <span aria-hidden className="inline-block w-4 h-px bg-current translate-y-[-3px] transition-all group-hover:w-6" />
    </button>
  );
}

export function SiteChrome() {
  const identity = useContent("identity", identitySeed) as typeof identitySeed;
  const contact = useContent("contact", contactSeed) as typeof contactSeed;
  const isActive = useIsActive();
  const time = useLocalTime();
  const city = (contact.location ?? "").split(",")[0].trim();
  const email = contact.email?.trim() ?? "";
  const year = new Date().getFullYear();

  return (
    <>
      {/* Vertical wordmark rail */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-50 w-[var(--rail-w)] flex-col items-center pt-6 pointer-events-none">
        <Link
          href="/"
          className="pointer-events-auto font-display font-black uppercase leading-none tracking-tight text-[1.65rem] text-foreground hover:text-primary transition-colors [writing-mode:vertical-rl] rotate-180"
        >
          {identity.name}
          <sup className="text-[0.45em] align-super ml-0.5">©</sup>
        </Link>
        <span className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          {identity.role} — {year}
        </span>
      </div>

      {/* Desktop top bar */}
      <header className="hidden md:block fixed top-0 right-0 left-[var(--rail-w)] z-40 h-[var(--chrome-h)] pointer-events-none bg-gradient-to-b from-background via-background/90 to-transparent">
        <div className="grid grid-cols-12 gap-6 px-8 pt-5">
          <nav aria-label="Main navigation" className="col-span-4 lg:col-span-3 pointer-events-auto">
            <ChromeLabel>Menu</ChromeLabel>
            <ul className="mt-2 flex flex-col">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`group inline-flex items-center gap-2 font-display font-bold uppercase text-[1.05rem] leading-[1.15] tracking-tight transition-colors ${
                        active ? "text-primary" : "text-foreground hover:text-primary"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`inline-block overflow-hidden transition-all duration-300 ${
                          active ? "w-4 opacity-100" : "w-0 opacity-0 group-hover:w-4 group-hover:opacity-60"
                        }`}
                      >
                        →
                      </span>
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="col-span-2 lg:col-span-3 pointer-events-auto">
            <ChromeLabel>Theme</ChromeLabel>
            <ThemeSwitch className="mt-1" />
          </div>

          <div className="col-span-3 pointer-events-auto">
            <ChromeLabel>{city ? `Based in ${city}` : "Local time"}</ChromeLabel>
            <span className="mt-1 block text-sm text-foreground tabular-nums">{time}</span>
          </div>

          {email && (
            <div className="col-span-3 text-right pointer-events-auto">
              <ChromeLabel>For inquiries</ChromeLabel>
              <a
                href={`mailto:${email}`}
                className="mt-1 inline-block text-sm text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
              >
                {email}
              </a>
            </div>
          )}
        </div>
      </header>

      <MobileChrome name={identity.name} email={email} city={city} time={time} />
    </>
  );
}

function MobileChrome({
  name,
  email,
  city,
  time,
}: {
  name: string;
  email: string;
  city: string;
  time: string;
}) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  const [location] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>("a, button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-50 h-[var(--chrome-h)] px-5 flex items-center justify-between bg-background/90 backdrop-blur-sm">
        <Link href="/" className="font-display font-black uppercase tracking-tight text-xl text-foreground">
          {name}
          <sup className="text-[0.5em] ml-0.5">©</sup>
        </Link>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="text-[11px] uppercase tracking-[0.2em] text-foreground"
        >
          Menu
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="md:hidden fixed inset-0 z-[70] bg-background flex flex-col px-5 pt-5 pb-8"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between">
              <ChromeLabel>Menu</ChromeLabel>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] uppercase tracking-[0.2em] text-foreground"
              >
                Close
              </button>
            </div>

            <nav aria-label="Main navigation" className="mt-10 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => {
                const active = isActive(link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`font-display font-black uppercase tracking-tight leading-[0.95] text-[clamp(2.75rem,14vw,4.5rem)] ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {active && <span aria-hidden className="mr-2">→</span>}
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="mt-auto grid grid-cols-2 gap-6">
              <div>
                <ChromeLabel>Theme</ChromeLabel>
                <ThemeSwitch className="mt-1" />
              </div>
              <div>
                <ChromeLabel>{city ? `Based in ${city}` : "Local time"}</ChromeLabel>
                <span className="mt-1 block text-sm tabular-nums">{time}</span>
              </div>
              {email && (
                <div className="col-span-2">
                  <ChromeLabel>For inquiries</ChromeLabel>
                  <a href={`mailto:${email}`} className="mt-1 inline-block text-sm underline underline-offset-4">
                    {email}
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
