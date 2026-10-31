import type { ReactNode } from "react";
import { Link } from "wouter";

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
    <div className="grid gap-10 md:gap-8 md:grid-cols-[minmax(15rem,26%)_1fr]">
      <aside className="flex flex-col justify-between gap-10 md:sticky md:top-[var(--chrome-h)] md:h-[calc(100svh-var(--chrome-h)-1.5rem)]">
        <div className="flex flex-col gap-6">{asideTop}</div>
        {asideBottom && <div className="flex flex-col gap-5">{asideBottom}</div>}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Oversized item counter, e.g. the number of works in the grid beside it. */
export function BigCount({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-display font-black leading-[0.8] tracking-tighter tabular-nums text-primary text-[clamp(5.5rem,13vw,12rem)]">
        {String(value).padStart(2, "0")}
      </span>
      {label && (
        <span className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="w-max text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
    >
      {children}
    </Link>
  );
}
