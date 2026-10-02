import { Link } from "wouter";
import { SafeImage } from "@/components/SafeImage";
import type { StudioLogo } from "@/components/admin/types";

export function LogoMarquee({
  items,
  speed = 32,
  label,
}: {
  items: StudioLogo[];
  speed?: number;
  label?: string;
}) {
  if (items.length === 0) return null;

  const loop = items.length === 1 ? [...items, ...items, ...items] : [...items, ...items];
  const duration = Math.max(12, speed);

  return (
    <section className="flex flex-col gap-4 -mx-6 md:-mx-12 lg:-mx-16" aria-label={label || "Project logos"}>
      {label && (
        <p className="px-6 md:px-12 lg:px-16 text-xs uppercase tracking-[0.4em] font-sans font-bold text-muted-foreground">
          {label}
        </p>
      )}
      <div className="logo-marquee relative overflow-hidden py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
        <div
          className="logo-marquee-track flex w-max items-center gap-10 md:gap-14"
          style={{ animationDuration: `${duration}s` }}
        >
          {loop.map((item, i) => {
            const inner = (
              <span className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
                {item.src ? (
                  <SafeImage
                    src={item.src}
                    alt=""
                    className="h-12 md:h-16 w-auto max-w-[160px] object-contain"
                    fallbackAspect="1 / 1"
                  />
                ) : (
                  <span className="font-display font-black uppercase text-2xl md:text-3xl tracking-tight text-foreground/80 whitespace-nowrap">
                    {item.name}
                  </span>
                )}
                {item.src && item.name && (
                  <span className="sr-only">{item.name}</span>
                )}
              </span>
            );
            const key = `${item.id}-${i}`;
            if (item.href) {
              const external = /^https?:/i.test(item.href);
              return external ? (
                <a key={key} href={item.href} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  {inner}
                </a>
              ) : (
                <Link key={key} href={item.href} className="flex-shrink-0">
                  {inner}
                </Link>
              );
            }
            return (
              <span key={key} className="flex-shrink-0">
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
