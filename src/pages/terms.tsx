import { Link } from "wouter";
import { SITE } from "@/lib/site";

const BLUE = "#1F67F1";
const UPDATED = "August 21, 2026";

export default function Terms() {
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
          Terms of Use
        </h1>
        <p className="text-sm text-muted-foreground font-sans">Last updated {UPDATED}</p>
      </header>

      <div className="flex flex-col gap-8 text-foreground/90 font-sans text-base leading-relaxed">
        <p>
          These terms govern use of {SITE.name}’s portfolio at{" "}
          <a href={SITE.url} className="underline underline-offset-4" style={{ color: BLUE }}>
            {SITE.url.replace("https://", "")}
          </a>
          . By using the site you agree to them. If you do not agree, please do not use the site.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">The site</h2>
          <p>
            This is a finished personal portfolio showing product design, UX research, and creative
            work by {SITE.name}, {SITE.role}, based in {SITE.location}. Case studies, studio pieces,
            and contact details describe real work and how to reach me.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">What you may do</h2>
          <p>
            You may browse, share links to public pages, and contact me about professional work. You
            may not scrape the site in a way that harms availability, attempt to access the admin
            area without authorization, or present this work as your own.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Content and ownership</h2>
          <p>
            Unless noted otherwise, writing, images, and case-study materials are owned by {SITE.name}{" "}
            or used with permission from the client or collaborator named in the piece. Client names
            and product screens appear for portfolio documentation. They are not an offer to license
            those brands.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">No professional advice</h2>
          <p>
            Case studies describe past process and outcomes. They are not a guarantee of future
            results, legal advice, or a current client engagement unless we have a separate written
            agreement.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Third-party links</h2>
          <p>
            The site links to live products, Figma files, LinkedIn, and other destinations I do not
            control. Their terms and privacy practices apply when you leave this site.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Availability</h2>
          <p>
            I aim to keep pages working, but the site is provided as-is. Occasional maintenance or
            hosting issues can interrupt access.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-black uppercase text-2xl tracking-tight">Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href={`mailto:${SITE.email}`} className="underline underline-offset-4" style={{ color: BLUE }}>
              {SITE.email}
            </a>
            . See also the{" "}
            <Link href="/privacy" className="underline underline-offset-4" style={{ color: BLUE }}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/about#contact" className="underline underline-offset-4" style={{ color: BLUE }}>
              Contact
            </Link>{" "}
            page.
          </p>
        </section>
      </div>
    </article>
  );
}
