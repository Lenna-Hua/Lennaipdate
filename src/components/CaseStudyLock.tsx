import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { CoverMedia, coverStillSrc } from "@/components/CoverMedia";
import { BRAND_EASE } from "@/lib/brand";

export function CaseStudyLock({
  title,
  subtitle,
  coverImage,
  coverMime,
  coverPoster,
  contactEmail,
  onUnlock,
}: {
  title: string;
  subtitle?: string;
  coverImage?: string;
  coverMime?: string;
  coverPoster?: string;
  contactEmail?: string;
  /** Resolves to an error message, or null once the case study is unlocked. */
  onUnlock: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const still = coverImage ? coverStillSrc(coverImage, coverMime, coverPoster) : "";
  const blurClass = "w-full h-full object-cover blur-md scale-110 opacity-60";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    const message = await onUnlock(password);
    setSubmitting(false);
    if (message) {
      setError(message);
      setPassword("");
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-10 pt-8 md:pt-16 pb-24">
      <motion.div
        className="w-full max-w-3xl flex flex-col gap-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: BRAND_EASE }}
      >
        {coverImage && (
          <div className="relative w-full overflow-hidden rounded-xl bg-card" style={{ aspectRatio: "16/7" }}>
            {still ? (
              <SafeImage src={still} alt="" className={blurClass} />
            ) : (
              <CoverMedia src={coverImage} alt="" mimeHint={coverMime} className={blurClass} paused />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-background/80 border border-border flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" aria-hidden="true" />
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="text-primary text-xs uppercase tracking-[0.4em] font-sans font-bold">
            Protected case study
          </span>
          <h1
            className="font-display font-black text-primary leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-foreground/65 text-base md:text-lg font-sans leading-relaxed">{subtitle}</p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 md:p-8 flex flex-col gap-4"
        >
          <label htmlFor="case-study-password" className="text-foreground font-sans text-sm font-semibold">
            This work is under NDA. Enter the password to view it.
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="case-study-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "case-study-password-error" : undefined}
              className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground font-sans text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={!password || submitting}
              className="px-6 py-3 rounded-full border-2 border-primary bg-primary text-primary-foreground font-sans text-sm font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </div>
          {error && (
            <p id="case-study-password-error" role="alert" className="text-destructive text-sm font-sans">
              {error}
            </p>
          )}
          {contactEmail && (
            <p className="text-muted-foreground text-sm font-sans">
              Don't have the password?{" "}
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Access to "${title}" case study`)}`}
                className="text-primary underline underline-offset-2"
              >
                Request access
              </a>
            </p>
          )}
        </form>

        <Link
          href="/work"
          className="text-muted-foreground/80 hover:text-primary transition-colors text-xs uppercase tracking-[0.2em] font-sans w-max"
        >
          ← All Projects
        </Link>
      </motion.div>
    </div>
  );
}
