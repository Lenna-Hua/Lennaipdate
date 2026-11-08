import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";
import { useFloatIn } from "@/lib/motion";
import { EditorialSection, Eyebrow } from "@/components/layout/SplitShowcase";

type Status = "idle" | "sending" | "success" | "error";

const FIELD_CLASS =
  "w-full bg-transparent border-0 border-b border-border text-foreground py-3 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors disabled:opacity-60";

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-4 border-t border-border py-3">
      <Eyebrow className="pt-1">{label}</Eyebrow>
      <div className="min-w-0 flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function ContactSection() {
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
  const floatIn = useFloatIn();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    };

    try {
      // Build the URL via Vite's BASE_URL so the call respects the artifact's
      // base path. BASE_URL always has a trailing slash, so the result is
      // e.g. "/api/contact" when mounted at "/" or "/portfolio/api/contact"
      // when mounted under a sub-path.
      const url = `${import.meta.env.BASE_URL}api/contact`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok) {
        throw new Error(body.error ?? `Request failed (${res.status}).`);
      }
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Couldn't reach the server. Please check your connection and try again.",
      );
    }
  }

  const socials = (contactData.socials ?? []).filter(
    ({ label, href }) => (label ?? "").trim() && (href ?? "").trim(),
  );
  const linkClass = "w-max max-w-full text-base text-foreground hover:text-primary transition-colors break-all";

  return (
    <EditorialSection
      id="contact"
      eyebrow="Get in touch"
      heading="Let's Talk"
      aside={
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
          Available for freelance projects
        </p>
      }
    >
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
        <motion.div {...floatIn} className="flex flex-col">
          {contactData.email?.trim() && (
            <InfoRow label="Inquiries">
              <a href={`mailto:${contactData.email}`} className={linkClass}>
                {contactData.email}
              </a>
            </InfoRow>
          )}
          {contactData.phone?.trim() && (
            <InfoRow label="Phone">
              <a href={`tel:${contactData.phone.replace(/[^+\d]/g, "")}`} className={linkClass}>
                {contactData.phone}
              </a>
            </InfoRow>
          )}
          {contactData.location?.trim() && (
            <InfoRow label="Location">
              <span className="text-base text-foreground">{contactData.location}</span>
              <span className="text-sm text-muted-foreground">EST Timezone · Open to Remote</span>
            </InfoRow>
          )}
          {socials.length > 0 && (
            <InfoRow label="Elsewhere">
              {socials.map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {label} <span aria-hidden className="text-muted-foreground">↗</span>
                </a>
              ))}
            </InfoRow>
          )}
          <div className="border-t border-border" />
        </motion.div>

        <motion.div {...floatIn}>
          {status === "success" ? (
            <div role="status" aria-live="polite" className="flex flex-col gap-4 border-t border-border pt-6">
              <p className="font-display font-black uppercase tracking-tight text-3xl text-foreground">Message sent</p>
              <p className="text-sm text-muted-foreground">I'll get back to you as soon as possible.</p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="w-max text-xs uppercase tracking-[0.2em] text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              {[
                { id: "name", label: "Name", type: "text" },
                { id: "email", label: "Email", type: "email" },
              ].map(({ id, label, type }) => (
                <div key={id} className="flex flex-col">
                  <label htmlFor={id} className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {label} <span className="text-primary" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    type={type}
                    id={id}
                    name={id}
                    value={form[id as keyof typeof form]}
                    onChange={handleChange}
                    className={FIELD_CLASS}
                    required
                    disabled={status === "sending"}
                  />
                </div>
              ))}

              <div className="flex flex-col">
                <label htmlFor="message" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Message <span className="text-primary" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  className={`${FIELD_CLASS} resize-none`}
                  required
                  disabled={status === "sending"}
                />
              </div>

              {status === "error" && (
                <p role="alert" aria-live="assertive" className="text-sm text-destructive -mt-3">
                  {errorMsg || "Something went wrong. Please try again."}
                </p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group inline-flex w-max items-center gap-3 border border-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                </button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your name, email, and message are used only to reply to this inquiry. See the{" "}
                  <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </EditorialSection>
  );
}
