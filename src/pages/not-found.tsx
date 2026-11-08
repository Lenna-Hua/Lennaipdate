import { Link } from "wouter";
import { CursorBlockField } from "@/components/CursorBlockField";
import { useTheme } from "@/context/ThemeContext";
import { Eyebrow } from "@/components/layout/SplitShowcase";

export default function NotFound() {
  const { theme } = useTheme();
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-6 relative">
      {theme === "dark" && <CursorBlockField />}
      <div className="flex flex-col gap-5 max-w-md text-center items-center relative z-10">
        <Eyebrow>404</Eyebrow>
        <h1 className="font-display font-black uppercase tracking-tight text-5xl md:text-6xl text-foreground leading-none">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
        >
          ← Return home
        </Link>
      </div>
    </div>
  );
}
