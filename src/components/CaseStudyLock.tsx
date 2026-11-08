import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import { CoverMedia, coverStillSrc } from "@/components/CoverMedia";
import { Eyebrow, SPLIT_COLUMNS } from "@/components/layout/SplitShowcase";
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
    <motion.div
      className={`grid gap-10 md:gap-8 ${SPLIT_COLUMNS}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: BRAND_EASE }}
    >
      <div className="flex flex-col gap-2">
        <Link
          href="/work"
          className="w-max text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 decoration-1 hover:text-primary transition-colors"
        >
          ← All work
        </Link>
        <Eyebrow className="inline-flex items-center gap-2">
          <Lock className="w-3 h-3" aria-hidden="true" />
          Protected case study
        </Eyebrow>
      </div>

      <div className="flex flex-col gap-8 max-w-4xl">
        <div className="flex flex-col gap-4">
          <h1 className="font-display font-black uppercase text-foreground leading-[0.9] tracking-tight break-words text-[clamp(2.5rem,6vw,6rem)]">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-3xl text-foreground/75 text-lg md:text-2xl leading-snug tracking-tight">{subtitle}</p>
          )}
        </div>

        {coverImage && (
          <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: "16/7" }}>
            {still ? (
              <SafeImage src={still} alt="" className={blurClass} />
            ) : (
              <CoverMedia src={coverImage} alt="" mimeHint={coverMime} className={blurClass} paused />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 bg-background/90 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-foreground">
                <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                Under NDA
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border pt-5 max-w-xl">
          <label htmlFor="case-study-password" className="text-sm text-foreground">
            This work is under NDA. Enter the password to view it.
          </label>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <input
              id="case-study-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "case-study-password-error" : undefined}
              className="flex-1 bg-transparent border-0 border-b border-border px-0 py-3 text-foreground text-base focus:outline-none focus:border-primary transition-colors"
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={!password || submitting}
              className="inline-flex items-center gap-3 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              {submitting ? "Checking…" : "Unlock"}
              <span aria-hidden>→</span>
            </button>
          </div>
          {error && (
            <p id="case-study-password-error" role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {contactEmail && (
            <p className="text-muted-foreground text-sm">
              Don't have the password?{" "}
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Access to "${title}" case study`)}`}
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Request access
              </a>
            </p>
          )}
        </form>
      </div>
    </motion.div>
  );
}
