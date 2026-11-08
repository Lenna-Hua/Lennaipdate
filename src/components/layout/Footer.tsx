import type { ReactNode } from "react";
import { Link } from "wouter";
import identitySeed from "@/data/identity.json";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { scrollPageTo, useLenis } from "@/lib/smooth-scroll";
import { Eyebrow, SPLIT_COLUMNS } from "@/components/layout/SplitShowcase";

type Identity = typeof identitySeed;
type Contact = typeof contactSeed;

const FOOTER_MENU = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/studio", label: "Studio" },
  { href: "/about", label: "About" },
];

const linkClass =
  "w-max text-sm text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function FooterColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow className="mb-1">{label}</Eyebrow>
      {children}
    </div>
  );
}

export function Footer() {
  const identity = useContent("identity", identitySeed) as Identity;
  const contact = useContent("contact", contactSeed) as Contact;
  const lenis = useLenis();
  const year = new Date().getFullYear();
  const email = contact.email?.trim() ?? "";

  const socials = (contact.socials ?? [])
    .map((s) => ({ label: (s.label ?? "").trim(), href: (s.href ?? "").trim() }))
    .filter((s) => s.label && s.href);

  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^+\d]/g, "")}` : "";

  return (
    <footer className="mt-28 md:mt-40 border-t border-border pt-8 flex flex-col gap-14 md:gap-20">
      {email && (
        <div className={`grid gap-4 ${SPLIT_COLUMNS} md:gap-8`}>
          <Eyebrow>For inquiries</Eyebrow>
          <a
            href={`mailto:${email}`}
            className="w-max max-w-full font-display font-black tracking-tight leading-[0.95] text-foreground hover:text-primary transition-colors break-all text-[clamp(1.9rem,5.5vw,5rem)]"
          >
            {email}
            <span aria-hidden className="ml-3 inline-block text-primary">↗</span>
          </a>
        </div>
      )}

      <div className={`grid gap-10 ${SPLIT_COLUMNS} md:gap-8`}>
        <div className="flex flex-col gap-2">
          <p className="font-display font-black uppercase tracking-tight leading-none text-2xl md:text-3xl text-foreground">
            {identity.name}
            <sup className="text-[0.45em] ml-0.5">©</sup>
          </p>
          {identity.role && <p className="text-sm text-muted-foreground">{identity.role}</p>}
          <Eyebrow className="mt-3">Crafting digital goods since 2019</Eyebrow>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
          <FooterColumn label="Menu">
            <nav aria-label="Footer" className="flex flex-col gap-1.5">
              {FOOTER_MENU.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="w-max text-[16px] text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </FooterColumn>

          <FooterColumn label="Contact">
            {email && (
              <a href={`mailto:${email}`} className={`${linkClass} break-all`}>
                {email}
              </a>
            )}
            {contact.phone?.trim() && (
              <a href={phoneHref} className={linkClass}>
                {contact.phone}
              </a>
            )}
            {contact.location?.trim() && <span className="text-sm text-muted-foreground">{contact.location}</span>}
          </FooterColumn>

          {socials.length > 0 && (
            <FooterColumn label="Elsewhere">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {s.label} <span aria-hidden className="text-muted-foreground">↗</span>
                </a>
              ))}
            </FooterColumn>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          © {year} {identity.name}. All rights reserved.
        </span>
        <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Use
          </Link>
          <button
            type="button"
            onClick={() => scrollPageTo(lenis, 0, { smooth: true })}
            className="uppercase tracking-[0.2em] hover:text-foreground transition-colors"
          >
            Back to top ↑
          </button>
        </nav>
      </div>
    </footer>
  );
}
