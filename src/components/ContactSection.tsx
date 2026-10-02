import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import contactSeed from "@/data/contact.json";
import { useContent } from "@/lib/use-content";

const BLUE = "#1F67F1";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const VP = { once: true, margin: "-60px" };

type Status = "idle" | "sending" | "success" | "error";

export function ContactSection() {
  const contactData = useContent("contact", contactSeed) as typeof contactSeed;
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

  return (
    <section
      id="contact"
      className="w-full flex flex-col gap-12 pt-12 scroll-mt-28"
      style={{ borderTop: `2px solid ${BLUE}` }}
    >
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
        className="flex flex-col gap-4"
      >
        <span
          className="text-sm uppercase tracking-[0.5em] font-sans font-bold w-max px-3 py-1 rounded-full"
          style={{ color: BLUE, background: BLUE + "22", border: `1px solid ${BLUE}44` }}
        >
          Get in Touch
        </span>
        <h2
          className="font-display font-black uppercase leading-[0.88] tracking-tight"
          style={{ fontSize: "clamp(2.75rem,8vw,6.5rem)", color: BLUE }}
        >
          Let's Talk
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">

        {/* ── Contact Info ── */}
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={VP}
          className="flex flex-col gap-8"
        >
          {/* Email block */}
          {contactData.email?.trim() && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col gap-3 p-6 rounded-xl"
              style={{ background: BLUE + "14", border: `1.5px solid ${BLUE}40` }}
            >
              <h3
                className="uppercase tracking-widest text-sm font-sans font-bold"
                style={{ color: BLUE }}
              >
                General Inquiries
              </h3>
              <a
                href={`mailto:${contactData.email}`}
                className="font-display font-black uppercase text-2xl md:text-3xl text-foreground hover:opacity-75 transition-opacity leading-tight tracking-tight"
              >
                {contactData.email}
              </a>
            </motion.div>
          )}

          {/* Phone block */}
          {contactData.phone?.trim() && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col gap-3 p-6 rounded-xl"
              style={{ background: BLUE + "14", border: `1.5px solid ${BLUE}40` }}
            >
              <h3
                className="uppercase tracking-widest text-sm font-sans font-bold"
                style={{ color: BLUE }}
              >
                Phone
              </h3>
              <a
                href={`tel:${contactData.phone.replace(/[^+\d]/g, "")}`}
                className="font-display font-black uppercase text-2xl md:text-3xl text-foreground hover:opacity-75 transition-opacity leading-tight tracking-tight"
              >
                {contactData.phone}
              </a>
            </motion.div>
          )}

          {/* Location block */}
          {contactData.location?.trim() && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col gap-3 p-6 rounded-xl"
              style={{ background: BLUE + "14", border: `1.5px solid ${BLUE}40` }}
            >
              <h3
                className="uppercase tracking-widest text-sm font-sans font-bold"
                style={{ color: BLUE }}
              >
                Location
              </h3>
              <p className="text-foreground text-lg font-sans font-medium">
                {contactData.location}
                <span className="block text-muted-foreground text-sm font-normal mt-0.5">EST Timezone · Open to Remote</span>
              </p>
            </motion.div>
          )}

          {/* Social block */}
          {(() => {
            const validSocials = (contactData.socials ?? []).filter(
              ({ label, href }) => (label ?? "").trim() && (href ?? "").trim(),
            );
            if (validSocials.length === 0) return null;
            return (
              <motion.div variants={fadeUp} className="flex flex-col gap-4">
                <h3
                  className="uppercase tracking-widest text-sm font-sans font-bold"
                  style={{ color: BLUE }}
                >
                  Find Me
                </h3>
                <div className="flex flex-wrap gap-3">
                  {validSocials.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-sm font-medium px-5 py-2.5 rounded-full transition-opacity hover:opacity-75"
                      style={{ background: BLUE + "22", color: BLUE, border: `1.5px solid ${BLUE}55` }}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </motion.div>
            );
          })()}

          {/* Availability badge */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-sans text-muted-foreground">Available for freelance projects</span>
          </motion.div>
        </motion.div>

        {/* ── Contact Form ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="p-8 md:p-10 rounded-2xl"
          style={{ background: BLUE + "0E", border: `2px solid ${BLUE}35` }}
        >
          {status === "success" ? (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-6 py-16 text-center"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{ background: BLUE + "22", border: `2px solid ${BLUE}` }}
              >
                ✦
              </div>
              <div>
                <p className="font-display font-black uppercase text-2xl" style={{ color: BLUE }}>Message sent!</p>
                <p className="text-muted-foreground font-sans text-sm mt-2">I'll get back to you as soon as possible.</p>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="text-sm font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Send another
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {[
                { id: "name",  label: "Name",  type: "text"  },
                { id: "email", label: "Email", type: "email" },
              ].map(({ id, label, type }) => (
                <div key={id} className="flex flex-col gap-2">
                  <label
                    htmlFor={id}
                    className="text-sm uppercase tracking-widest font-sans font-bold"
                    style={{ color: BLUE }}
                  >
                    {label} <span className="text-red-500" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <input
                    type={type}
                    id={id}
                    name={id}
                    value={form[id as keyof typeof form]}
                    onChange={handleChange}
                    className="bg-transparent border-b-2 text-foreground py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors font-sans text-base"
                    style={{ borderColor: BLUE + "55" }}
                    onFocus={e => (e.currentTarget.style.borderColor = BLUE)}
                    onBlur={e  => (e.currentTarget.style.borderColor = BLUE + "55")}
                    required
                    disabled={status === "sending"}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="message"
                  className="text-sm uppercase tracking-widest font-sans font-bold"
                  style={{ color: BLUE }}
                >
                  Message <span className="text-red-500" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={handleChange}
                  className="bg-transparent border-b-2 text-foreground py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors resize-none font-sans text-base"
                  style={{ borderColor: BLUE + "55" }}
                  onFocus={e => (e.currentTarget.style.borderColor = BLUE)}
                  onBlur={e  => (e.currentTarget.style.borderColor = BLUE + "55")}
                  required
                  disabled={status === "sending"}
                />
              </div>

              {status === "error" && (
                <p role="alert" aria-live="assertive" className="text-sm font-sans text-red-400 -mt-4">
                  {errorMsg || "Something went wrong. Please try again."}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-2 py-4 px-8 font-sans font-bold uppercase tracking-widest transition-all w-max rounded-full text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-85"
                style={{ background: BLUE, color: "#FFFFFF" }}
              >
                {status === "sending" ? "Sending…" : "Send Message ✦"}
              </button>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed -mt-2">
                Your name, email, and message are used only to reply to this inquiry. See the{" "}
                <Link href="/privacy" className="underline underline-offset-4" style={{ color: BLUE }}>
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
