import { Link } from "wouter";
import { CursorBlockField } from "@/components/CursorBlockField";
import { useTheme } from "@/context/ThemeContext";

export default function NotFound() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {theme === "dark" && <CursorBlockField />}
      <div className="flex flex-col gap-6 max-w-md text-center relative z-10">
        <span className="font-serif text-[#C8A96E] text-sm uppercase tracking-widest">404</span>
        <h1 className="font-serif text-5xl text-[#F2EDE5] leading-tight">Page not found</h1>
        <p className="text-[#8A8278] text-sm leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="self-center text-sm text-[#C8A96E] border-b border-[#C8A96E]/40 hover:border-[#C8A96E] transition-colors pb-0.5 uppercase tracking-widest"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
