import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import appearanceSeed from "@/data/appearance.json";
import { useContent } from "@/lib/use-content";
import { useTheme } from "@/context/ThemeContext";
import { useScrollLock } from "@/lib/smooth-scroll";
import { AnimatedLogo } from "@/components/layout/AnimatedLogo";
import { FigmaArrow } from "@/components/layout/FigmaArrow";
import { ThemeToggleCreative } from "@/components/layout/ThemeToggleCreative";
import { FuturisticNavLink } from "@/components/layout/FuturisticNavLink";

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
    <span className="block text-[10px] uppercase font-mono tracking-[0.22em] text-muted-foreground/75">
      {children}
    </span>
  );
}

export function SiteChrome() {
  const identity = useContent("identity", identitySeed) as typeof identitySeed;
  const contact = useContent("contact", contactSeed) as typeof contactSeed;
  const appearance = useContent("appearance", appearanceSeed) as typeof appearanceSeed;
  const { theme, toggle } = useTheme();
  const isActive = useIsActive();
  const time = useLocalTime();
  const city = (contact.location ?? "").split(",")[0].trim();
  const email = contact.email?.trim() ?? "";
  const year = new Date().getFullYear();

  // Customizable sidebar background from appearance data
  const sidebarBg = appearance.sidebarBg || "#f3f0e2";
  const sidebarBgDark = appearance.sidebarBgDark || "#151513";
  const currentSidebarBg = theme === "dark" ? sidebarBgDark : sidebarBg;

  return (
    <>
      {/* ── Left Sidebar / Rail (Top-aligned, wrap-fitted, customizable background) ── */}
      <aside
        aria-label="Site sidebar"
        style={{ backgroundColor: currentSidebarBg }}
        className="hidden md:flex fixed inset-y-0 left-0 z-50 w-[var(--rail-w)] flex-col items-center justify-between py-6 px-1 border-r border-[#0000000a] dark:border-[#ffffff0d] select-none transition-colors duration-300"
      >
        {/* Top Lockup: Avatar (62px) + Name + Role Stacked at the Top */}
        <div className="flex flex-col items-center gap-6 pt-1 w-full">
          <AnimatedLogo size={62} />

          <div className="flex flex-col items-center gap-4">
            <Link
              href="/"
              className="font-display font-black uppercase leading-none tracking-[0.12em] lg:tracking-[0.15em] text-[1.85rem] lg:text-[2.05rem] text-foreground hover:text-primary transition-colors duration-200 [writing-mode:vertical-rl] rotate-180"
            >
              {identity.name}
            </Link>
            <span className="text-[11px] lg:text-[12px] font-mono uppercase tracking-[0.45em] text-foreground/60 dark:text-muted-foreground [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
              {identity.role ? `${identity.role.toUpperCase()} ${year}` : `PRODUCT DESIGNER ${year}`}
            </span>
          </div>
        </div>

        {/* Bottom: Subtle hairline copyright stamp */}
        <div className="text-[9px] font-mono text-muted-foreground/50 select-none pb-1">
          ©{year}
        </div>
      </aside>

      {/* ── Desktop Top Navigation Bar (Futuristic Elegance, Scramble Decryption & Laser Underline) ── */}
      <header className="hidden md:flex fixed top-0 right-0 left-[var(--rail-w)] z-40 h-[var(--chrome-h)] items-center justify-between px-8 lg:px-12 bg-background/80 backdrop-blur-md border-b border-[#00000008] dark:border-[#ffffff0a] transition-colors duration-300">
        {/* Futuristic Nav Links with Cyber Scramble & Kinetic Arrow */}
        <nav aria-label="Main navigation" className="flex items-center gap-8 lg:gap-11 pl-5">
          {NAV_LINKS.map((link) => (
            <FuturisticNavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={isActive(link.href)}
            />
          ))}
        </nav>

        {/* Right Side: Futuristic Minimalist Theme Switch */}
        <ThemeToggleCreative className="pl-5" />
      </header>

      {/* ── Mobile Chrome Bar & Menu Drawer (< 768px) ── */}
      <MobileChrome
        name={identity.name}
        email={email}
        city={city}
        time={time}
        theme={theme}
        toggleTheme={toggle}
      />
    </>
  );
}

function MobileChrome({
  name,
  email,
  city,
  time,
  theme,
  toggleTheme,
}: {
  name: string;
  email: string;
  city: string;
  time: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
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
      <header className="md:hidden fixed top-0 inset-x-0 z-50 h-[var(--chrome-h)] px-4 flex items-center justify-between bg-background/90 backdrop-blur-md border-b border-[#0000000a] dark:border-[#ffffff0d]">
        <div className="flex items-center gap-2.5 shrink-0">
          <AnimatedLogo size={42} className="shrink-0" />
          <Link href="/" className="font-display font-black uppercase tracking-tight text-xl text-foreground whitespace-nowrap">
            {name}
          </Link>
        </div>
        <div className="flex items-center gap-2 min-[320px]:gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="p-1 min-[320px]:p-1.5 text-foreground hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider whitespace-nowrap"
          >
            {theme === "dark" ? (
              <span className="inline-block px-2 py-0.5 border border-primary text-primary">
                <span className="hidden min-[300px]:inline">DARK </span>☾
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 border border-foreground/30 text-foreground">
                <span className="hidden min-[300px]:inline">LIGHT </span>☼
              </span>
            )}
          </button>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="font-mono text-xs uppercase tracking-widest px-3 py-1 border border-foreground/20 text-foreground hover:bg-foreground/5 transition-colors"
          >
            Menu
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="md:hidden fixed inset-0 z-[70] bg-background flex flex-col px-6 pt-6 pb-8"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-border/15 pb-4">
              <div className="flex items-center gap-2.5">
                <AnimatedLogo size={38} />
                <span className="font-display font-black uppercase text-lg">{name}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase tracking-widest text-foreground hover:text-primary transition-colors"
              >
                Close ✕
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="mt-8 flex flex-col gap-4">
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
                      onClick={() => setOpen(false)}
                      className={`group inline-flex items-center font-mono uppercase tracking-[0.18em] text-2xl transition-colors duration-200 ${
                        active ? "text-primary" : "text-foreground hover:text-primary"
                      }`}
                    >
                      <FigmaArrow
                        color="#1F68F1"
                        width={22}
                        height={12}
                        strokeWidth={1.6}
                        className={`mr-2.5 transition-opacity ${
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="mt-auto grid grid-cols-2 gap-6 border-t border-border/15 pt-6">
              <div>
                <ChromeLabel>Theme</ChromeLabel>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-1 group inline-flex items-center gap-1.5 text-xs font-mono tracking-wider text-foreground hover:text-primary transition-colors"
                >
                  {theme === "dark" ? "Dark Mode ☾" : "Light Mode ☼"}
                </button>
              </div>
              <div>
                <ChromeLabel>{city ? `Based in ${city}` : "Local time"}</ChromeLabel>
                <span className="mt-1 block text-xs font-mono tabular-nums text-foreground">{time}</span>
              </div>
              {email && (
                <div className="col-span-2">
                  <ChromeLabel>For inquiries</ChromeLabel>
                  <a
                    href={`mailto:${email}`}
                    className="mt-1 inline-block text-xs font-mono underline underline-offset-4 text-foreground hover:text-primary"
                  >
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
