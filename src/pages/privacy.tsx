import { Link } from "wouter";
import { SITE } from "@/lib/site";

const BLUE = "#1F67F1";
const UPDATED = "August 21, 2026";

export default function Privacy() {
  return (
    <article className="w-full max-w-3xl flex flex-col gap-8 pt-12 md:pt-24 pb-24">
      <header className="flex flex-col gap-3">
        <span
          className="text-sm uppercase tracking-[0.5em] font-sans font-bold w-max px-3 py-1 rounded-full"
          style={{ color: BLUE, background: BLUE + "22", border: `1px solid ${BLUE}44` }}
        >
          Legal
        </span>
        <h1
          className="font-display font-black uppercase leading-[0.9] tracking-tight"
          style={{ fontSize: "clamp(2.5rem,7vw,5rem)" }}
        >
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground font-sans">Last updated {UPDATED}</p>
      </header>

      <div className="flex flex-col gap-8 text-foreground/90 font-sans text-base leading-relaxed">
        <p>
          This policy explains how {SITE.name} (“I”, “me”) collects and uses information on{" "}
          <a href={SITE.url} className="underline underline-offset-4" style={{ color: BLUE }}>
            {SITE.url.replace("https://", "")}
          </a>
          , a personal product-design portfolio. It is written for visitors, collaborators, and
          advertising reviewers who need a clear, finished statement of how this site works.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Who I am</h2>
          <p>
            {SITE.name}, {SITE.role}, based in {SITE.location}. For privacy questions, email{" "}
            <a href={`mailto:${SITE.email}`} className="underline underline-offset-4" style={{ color: BLUE }}>
              {SITE.email}
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Information I collect</h2>
          <p>I only collect what is needed to run this portfolio and respond to you:</p>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              <strong>Contact form.</strong> Name, email address, and message. The server also stores
              the sending IP address and browser user-agent to limit spam and abuse.
            </li>
            <li>
              <strong>On-device preferences.</strong> Theme choice and optional Play-page scores stay
              in your browser’s local storage. They are not sent to me unless you also submit the
              contact form.
            </li>
            <li>
              <strong>Hosting logs.</strong> The site host (Vercel) may keep standard request logs
              (IP, time, requested URL) for security and reliability.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">How I use it</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>To reply to inquiries about design work, collaboration, or freelance projects.</li>
            <li>To keep the site working (theme, spam control, uptime).</li>
            <li>I do not sell personal information. I do not use contact-form data for marketing lists.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Who receives it</h2>
          <p>
            Contact messages are stored so I can read them in the site inbox, and may be emailed to me
            through Resend. Hosting is on Vercel. These providers process data only to deliver their
            service.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Advertising and cookies</h2>
          <p>
            This site may display or measure ads through Google. Google and its partners can set
            cookies or similar identifiers to serve and measure ads. If that happens, you can learn
            how Google uses data at{" "}
            <a
              href="https://business.safety.google/privacy/"
              className="underline underline-offset-4"
              style={{ color: BLUE }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google’s Business Data Responsibility page
            </a>{" "}
            and manage ad personalization at{" "}
            <a
              href="https://adssettings.google.com/"
              className="underline underline-offset-4"
              style={{ color: BLUE }}
              target="_blank"
              rel="noopener noreferrer"
            >
              adssettings.google.com
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">How long I keep it</h2>
          <p>
            Contact messages are kept until I have responded and no longer need them for the inquiry,
            or until you ask me to delete them. Browser storage stays until you clear it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Your choices</h2>
          <p>
            Email {SITE.email} to request access, correction, or deletion of a message you sent. You
            can also avoid the form and write me directly. Clearing site data in your browser removes
            local theme and game scores.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Security</h2>
          <p>
            The site is served over HTTPS. Messages are submitted with POST so they are not placed in
            the page URL. No method of transmission is perfectly secure; please do not send passwords
            or government ID through the contact form.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Related:{" "}
          <Link href="/terms" className="underline underline-offset-4" style={{ color: BLUE }}>
            Terms of Use
          </Link>
          {" · "}
          <Link href="/about#contact" className="underline underline-offset-4" style={{ color: BLUE }}>
            Contact
          </Link>
        </p>
      </div>
    </article>
  );
}
