/**
 * Identity & Contact editor — name, role, email, phone, location, social links.
 */
import type { Identity, Contact, SocialLink } from "./types";

export function IdentityContactEditor({
  identity,
  contact,
  onIdentityChange,
  onContactChange,
}: {
  identity: Identity;
  contact: Contact;
  onIdentityChange: (next: Identity) => void;
  onContactChange: (next: Contact) => void;
}) {
  const updateSocial = (i: number, patch: Partial<SocialLink>) => {
    const next = [...(contact.socials ?? [])];
    next[i] = { ...next[i], ...patch };
    onContactChange({ ...contact, socials: next });
  };
  const removeSocial = (i: number) => {
    const next = (contact.socials ?? []).filter((_, idx) => idx !== i);
    onContactChange({ ...contact, socials: next });
  };
  const addSocial = () => {
    onContactChange({
      ...contact,
      socials: [...(contact.socials ?? []), { label: "", href: "" }],
    });
  };

  const fieldClass =
    "bg-transparent border-b border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-2 focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors";
  const labelClass = "text-[color:var(--adm-muted)] text-xs uppercase tracking-widest";

  return (
    <div className="flex flex-col gap-10">
      {/* Identity */}
      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Identity</h2>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Your name and role appear in the navigation, footer, home hero, and case-study sidebar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={identity.name}
              onChange={(e) => onIdentityChange({ ...identity, name: e.target.value })}
              className={fieldClass}
            />
            <span className="text-[color:var(--adm-faint)] text-xs">
              On the home hero, the first word renders in brand blue and the rest in foreground.
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Role / title</label>
            <input
              type="text"
              value={identity.role}
              onChange={(e) => onIdentityChange({ ...identity, role: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="flex flex-col gap-4 border-t border-[color:var(--adm-line)] pt-8">
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Contact</h2>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Used by the Let&apos;s Talk section at the bottom of About, the footer, and the case-study sidebar. Empty fields hide automatically.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => onContactChange({ ...contact, email: e.target.value })}
              className={fieldClass}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Phone</label>
            <input
              type="text"
              value={contact.phone}
              onChange={(e) => onContactChange({ ...contact, phone: e.target.value })}
              className={fieldClass}
              placeholder="416-555-0100"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={contact.location}
              onChange={(e) => onContactChange({ ...contact, location: e.target.value })}
              className={fieldClass}
              placeholder="City, Region, Country"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Social links</label>
            <button
              type="button"
              onClick={addSocial}
              className="text-sm border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-1.5 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors uppercase tracking-widest"
            >
              + Add link
            </button>
          </div>
          {(contact.socials ?? []).length === 0 && (
            <p className="text-[color:var(--adm-faint)] text-xs">No social links yet.</p>
          )}
          {(contact.socials ?? []).map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end border border-[color:var(--adm-line)] p-3">
              <div className="flex flex-col gap-1">
                <span className="text-[color:var(--adm-faint)] text-[10px] uppercase tracking-widest">Label</span>
                <input
                  type="text"
                  value={s.label}
                  onChange={(e) => updateSocial(i, { label: e.target.value })}
                  className={fieldClass}
                  placeholder="LinkedIn"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[color:var(--adm-faint)] text-[10px] uppercase tracking-widest">URL</span>
                <input
                  type="url"
                  value={s.href}
                  onChange={(e) => updateSocial(i, { href: e.target.value })}
                  className={fieldClass}
                  placeholder="https://…"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSocial(i)}
                className="text-sm border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-1.5 hover:border-red-400 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
