import type { ReactNode } from "react";
import { Link } from "wouter";

/** Left column width shared by every split layout so edges line up across sections. */
export const SPLIT_COLUMNS = "md:grid-cols-[minmax(15rem,26%)_1fr]";

/** Sticky intro column on the left, scrolling content (usually a masonry grid) on the right. */
export function SplitShowcase({
  asideTop,
  asideBottom,
  children,
}: {
  asideTop: ReactNode;
  asideBottom?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}>
      <aside className="flex flex-col justify-between gap-10 md:sticky md:top-[var(--chrome-h)] md:h-[calc(100svh-var(--chrome-h)-1.5rem)]">
        <div className="flex flex-col gap-6">{asideTop}</div>
        {asideBottom && <div className="flex flex-col gap-5">{asideBottom}</div>}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Eyebrow({
  children,
  className = "",
  tone = "muted",
}: {
  children: ReactNode;
  className?: string;
  tone?: "muted" | "primary";
}) {
  const color = tone === "primary" ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`block text-[11px] uppercase tracking-[0.2em] ${color} ${className}`}>
      {children}
    </span>
  );
}

/** Ruled section: label + heading on the left, content on the right. */
export function EditorialSection({
  id,
  eyebrow,
  heading,
  aside,
  stickyAside = false,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  /** Extra content under the heading (blurb, counter, links). */
  aside?: ReactNode;
  stickyAside?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`grid gap-8 ${SPLIT_COLUMNS} border-t border-border pt-8 scroll-mt-[calc(var(--chrome-h)+1rem)] ${className}`}
    >
      <div
        className={`flex flex-col gap-2 ${
          stickyAside ? "md:sticky md:top-[calc(var(--chrome-h)+1rem)] md:self-start" : ""
        }`}
      >
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {heading && (
          <h2 className="font-display font-black uppercase tracking-tight leading-[0.9] text-4xl md:text-5xl text-foreground">
            {heading}
          </h2>
        )}
        {aside}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Oversized item counter, e.g. the number of works in the grid beside it. */
export function BigCount({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-display font-black leading-[0.8] tracking-tighter tabular-nums text-primary text-[clamp(5.5rem,13vw,12rem)]">
        {String(value).padStart(2, "0")}
      </span>
      {label && <Eyebrow className="mt-2">{label}</Eyebrow>}
    </div>
  );
}

export const TEXT_LINK_CLASS =
  "w-max text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors";

export function TextLink({
  href,
  children,
  external = false,
  download,
}: {
  href: string;
  children: ReactNode;
  /** Plain anchor in a new tab (off-site URLs, files). */
  external?: boolean;
  download?: string;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" download={download} className={TEXT_LINK_CLASS}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={TEXT_LINK_CLASS}>
      {children}
    </Link>
  );
}

/** Text menu item with the same "→ marks the current one" behaviour as the site menu. */
export function ArrowOption({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group inline-flex items-center gap-2 font-display font-bold uppercase text-[1.05rem] leading-[1.2] tracking-tight transition-colors ${
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
      {children}
      {count !== undefined && (
        <sup className="text-[0.6em] font-sans font-normal tabular-nums text-muted-foreground">{count}</sup>
      )}
    </button>
  );
}
