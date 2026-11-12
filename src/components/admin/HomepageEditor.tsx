/**
 * Homepage editor — entry/splash page and home page content.
 */
import type { Homepage } from "./types";
import { TextInput, TextareaInput, CheckboxInput } from "./shared";
import {
  UploadToLibraryDashed,
  PickFromLibraryButton,
} from "./AssetLibrary";
import { CoverMedia } from "@/components/CoverMedia";

export function HomepageEditor({
  data,
  onChange,
  onPreview,
}: {
  data: Homepage;
  onChange: (next: Homepage) => void;
  onPreview?: () => void;
}) {
  const updateEntry = (patch: Partial<Homepage["entry"]>) =>
    onChange({ ...data, entry: { ...data.entry, ...patch } });
  const updateDesignCard = (patch: Partial<Homepage["entry"]["designCard"]>) =>
    updateEntry({ designCard: { ...data.entry.designCard, ...patch } });
  const updateArtCard = (patch: Partial<Homepage["entry"]["artCard"]>) =>
    updateEntry({ artCard: { ...data.entry.artCard, ...patch } });
  const updateHome = (patch: Partial<Homepage["home"]>) =>
    onChange({ ...data, home: { ...data.home, ...patch } });

  const heroMedia = data.home.heroMedia?.trim() ?? "";
  const heroMediaAlt = data.home.heroMediaAlt ?? "";
  const heroMediaMime = data.home.heroMediaMime ?? "";

  const setHeroMedia = (url: string, mime?: string) => {
    updateHome({
      heroMedia: url,
      ...(mime ? { heroMediaMime: mime } : {}),
    });
  };

  const clearHeroMedia = () => {
    updateHome({ heroMedia: "", heroMediaAlt: "", heroMediaMime: "" });
  };

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      {onPreview && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onPreview}
            className="text-sm border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-1.5 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] uppercase tracking-widest"
          >
            Preview home
          </button>
        </div>
      )}
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Entry / Splash Page</h2>
        <p className="text-[color:var(--adm-muted)] text-sm">
          The dark splash screen visitors see at the very root URL: top wordmark, two big choice cards, and the prompt at the bottom.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Wordmark"
            value={data.entry.wordmarkPrefix}
            onChange={(v) => updateEntry({ wordmarkPrefix: v })}
          />
          <TextInput
            label="Wordmark accent (e.g. .)"
            value={data.entry.wordmarkSuffix}
            onChange={(v) => updateEntry({ wordmarkSuffix: v })}
          />
        </div>
        <TextInput
          label="Top-right tagline"
          value={data.entry.topbarTagline}
          onChange={(v) => updateEntry({ topbarTagline: v })}
        />
        <TextInput
          label="Bottom prompt"
          value={data.entry.bottomPrompt}
          onChange={(v) => updateEntry({ bottomPrompt: v })}
        />

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Left card: Product / Design</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="Number" value={data.entry.designCard.number} onChange={(v) => updateDesignCard({ number: v })} />
            <TextInput label="Title line 1" value={data.entry.designCard.titleLine1} onChange={(v) => updateDesignCard({ titleLine1: v })} />
            <TextInput label="Title line 2" value={data.entry.designCard.titleLine2} onChange={(v) => updateDesignCard({ titleLine2: v })} />
          </div>
          <TextareaInput label="Description" value={data.entry.designCard.description} onChange={(v) => updateDesignCard({ description: v })} rows={2} />
        </div>

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Right card: Art / Creative</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="Number" value={data.entry.artCard.number} onChange={(v) => updateArtCard({ number: v })} />
            <TextInput label="Title line 1" value={data.entry.artCard.titleLine1} onChange={(v) => updateArtCard({ titleLine1: v })} />
            <TextInput label="Title line 2" value={data.entry.artCard.titleLine2} onChange={(v) => updateArtCard({ titleLine2: v })} />
          </div>
          <TextareaInput label="Description" value={data.entry.artCard.description} onChange={(v) => updateArtCard({ description: v })} rows={2} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Home Page</h2>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Order on the page: Hero → Selected Work → From the Studio → About. Your name and bio are edited under Identity & Contact and About.
        </p>

        <TextInput
          label="Hero eyebrow line"
          value={data.home.heroEyebrow}
          onChange={(v) => updateHome({ heroEyebrow: v })}
        />
        <TextareaInput
          label="Hero intro paragraph"
          value={data.home.heroIntro}
          onChange={(v) => updateHome({ heroIntro: v })}
          rows={4}
        />

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Hero media (optional)</span>
          <p className="text-[color:var(--adm-muted)] text-xs">
            Image or video shown below the intro. Leave empty to keep the current text-only hero on the live site.
          </p>
          <input
            type="text"
            value={heroMedia}
            onChange={(e) => updateHome({ heroMedia: e.target.value, heroMediaMime: "" })}
            placeholder="Paste URL or upload / pick from library"
            className="bg-transparent border-b border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <UploadToLibraryDashed
              label="↑ Upload hero media"
              usage="hero"
              accept="image/*,video/mp4,video/webm,.gif,.mp4,.webm"
              onUploaded={(url, meta) => setHeroMedia(url, meta?.mime)}
            />
            <PickFromLibraryButton
              type="all"
              label="From library"
              onPick={(url, meta) => setHeroMedia(url, meta?.mime)}
            />
            {heroMedia && (
              <button
                type="button"
                onClick={clearHeroMedia}
                className="text-sm text-[color:var(--adm-faint)] hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {heroMedia && (
            <TextInput
              label="Alt text (accessibility)"
              value={heroMediaAlt}
              onChange={(v) => updateHome({ heroMediaAlt: v })}
            />
          )}
          {heroMedia ? (
            <div
              className="rounded overflow-hidden border border-[color:var(--adm-line-strong)] mt-1"
              style={{ maxWidth: "480px", aspectRatio: "16 / 9" }}
            >
              <CoverMedia
                src={heroMedia}
                alt={heroMediaAlt || "Hero media preview"}
                mimeHint={heroMediaMime}
                className="w-full h-full object-cover bg-[color:var(--adm-input)]"
                loading="eager"
              />
            </div>
          ) : (
            <p className="text-[color:var(--adm-faint)] text-xs">
              No hero media set: visitors see the same layout as today.
            </p>
          )}
        </div>

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Hero buttons</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Primary label" value={data.home.primaryCtaLabel} onChange={(v) => updateHome({ primaryCtaLabel: v })} />
            <TextInput label="Primary link" value={data.home.primaryCtaHref} onChange={(v) => updateHome({ primaryCtaHref: v })} />
            <TextInput label="Secondary label" value={data.home.secondaryCtaLabel} onChange={(v) => updateHome({ secondaryCtaLabel: v })} />
            <TextInput label="Secondary link" value={data.home.secondaryCtaHref} onChange={(v) => updateHome({ secondaryCtaHref: v })} />
          </div>
          <TextInput
            label="Flower badge text (repeat it twice so it wraps the circle)"
            value={data.home.badgeLabel ?? "VIEW WORK • VIEW WORK •"}
            onChange={(v) => updateHome({ badgeLabel: v })}
          />
          <p className="text-[color:var(--adm-faint)] text-xs">
            The spinning flower sticker in the hero links to the primary button&apos;s link. Hidden on phones.
          </p>
        </div>

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Selected Work band</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Heading" value={data.home.selectedWorkHeading} onChange={(v) => updateHome({ selectedWorkHeading: v })} />
            <TextInput label='"View all" link label' value={data.home.selectedWorkLinkLabel} onChange={(v) => updateHome({ selectedWorkLinkLabel: v })} />
          </div>
          <p className="text-[color:var(--adm-faint)] text-xs">
            Up to 6 cards from Work and Gallery items with “★ Show on homepage Selected Work” ticked (and not archived).
          </p>
                  {/* Project Card Layout & Typeface Settings (Alex Boland Style) */}
          <div className="border-t border-[color:var(--adm-line)] pt-4 mt-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--adm-text)] text-xs font-semibold uppercase tracking-wider">
                Project Cards Styling & Sizing (Alex Boland)
              </span>
              <span className="text-[10px] font-mono text-[color:var(--adm-accent)] uppercase">Card Controls</span>
            </div>

            {/* Grid Size / Columns */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[color:var(--adm-text)] text-xs font-medium">Card Grid Sizing (Columns)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "md", label: "Standard (3 cols)", desc: "Dense editorial rhythm" },
                  { value: "lg", label: "Large (2 cols)", desc: "Prominent showcase" },
                  { value: "xl", label: "Extra Large", desc: "Hero-sized cards" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateHome({ selectedWorkCardSize: opt.value as "md" | "lg" | "xl" })}
                    className={`text-left p-2.5 rounded border transition-colors ${
                      (data.home.selectedWorkCardSize ?? "md") === opt.value
                        ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)]"
                        : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] hover:border-[color:var(--adm-accent)]"
                    }`}
                  >
                    <span className="block text-xs font-medium">{opt.label}</span>
                    <span className="block text-[10px] opacity-70 mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio, Role Tag & Title Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[color:var(--adm-text)] text-xs font-medium">Card Image Aspect Ratio</label>
                <select
                  value={data.home.selectedWorkCardAspect ?? "4/3"}
                  onChange={(e) => updateHome({ selectedWorkCardAspect: e.target.value as "4/3" | "16/10" | "1/1" | "auto" })}
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--adm-accent)]"
                >
                  <option value="4/3">4:3 (Classic Editorial - Alex Boland)</option>
                  <option value="16/10">16:10 (Cinematic / Wide)</option>
                  <option value="1/1">1:1 (Square)</option>
                  <option value="auto">Auto (Natural image proportion)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[color:var(--adm-text)] text-xs font-medium">Role Tag Visibility</label>
                <select
                  value={data.home.selectedWorkCardRoleTag ?? "hidden"}
                  onChange={(e) => updateHome({ selectedWorkCardRoleTag: e.target.value as "hover" | "hidden" | "always" })}
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--adm-accent)]"
                >
                  <option value="hidden">Hidden completely (Zero tags)</option>
                  <option value="hover">Visible on hover only</option>
                  <option value="always">Always visible (Static pill)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[color:var(--adm-text)] text-xs font-medium">Project Name / Title</label>
                <select
                  value={data.home.selectedWorkTitleDisplay ?? "always"}
                  onChange={(e) => updateHome({ selectedWorkTitleDisplay: e.target.value as "hover" | "always" })}
                  className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--adm-accent)]"
                >
                  <option value="hover">Reveal on hover only (Alex Boland)</option>
                  <option value="always">Always visible below card</option>
                </select>
              </div>
            </div>

            {/* Typeface Selection & Size */}
            <div className="border-t border-[color:var(--adm-line)] pt-3 flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[color:var(--adm-text)] text-xs font-medium">Card Title Typeface</label>
                  <select
                    value={data.home.selectedWorkTitleFont ?? "display"}
                    onChange={(e) => updateHome({ selectedWorkTitleFont: e.target.value })}
                    className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--adm-accent)]"
                  >
                    <option value="display">Display Font (headlines / site default)</option>
                    <option value="sans">Sans Font (clean body / Inter)</option>
                    <option value="serif">Serif Font (editorial / Cormorant)</option>
                    <option value="Syne">Syne (Geometric / Sharp)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech / Brutalist)</option>
                    <option value="Clash Display">Clash Display (Bold Modern)</option>
                    <option value="Archivo">Archivo (Industrial / Clean)</option>
                  </select>
                  <p className="text-[color:var(--adm-faint)] text-[10px]">
                    Choose which typeface renders the short title beneath each project card.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[color:var(--adm-text)] text-xs font-medium">Card Title Size</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { value: "sm", label: "Small" },
                      { value: "md", label: "Medium" },
                      { value: "lg", label: "Large" },
                      { value: "xl", label: "X-Large" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateHome({ selectedWorkTitleSize: s.value as "sm" | "md" | "lg" | "xl" })}
                        className={`py-1.5 px-2 rounded border text-xs text-center transition-colors ${
                          (data.home.selectedWorkTitleSize ?? "md") === s.value
                            ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)] font-semibold"
                            : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] hover:border-[color:var(--adm-accent)]"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title Weight & Casing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[color:var(--adm-text)] text-xs font-medium">Title Weight</label>
                  <select
                    value={data.home.selectedWorkTitleWeight ?? "bold"}
                    onChange={(e) => updateHome({ selectedWorkTitleWeight: e.target.value as "normal" | "medium" | "bold" | "black" })}
                    className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] rounded-md text-[color:var(--adm-text)] px-3 py-2 text-xs focus:outline-none focus:border-[color:var(--adm-accent)]"
                  >
                    <option value="normal">Normal (400)</option>
                    <option value="medium">Medium (500)</option>
                    <option value="bold">Bold (700 · Recommended)</option>
                    <option value="black">Black (900 · Ultra Bold)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[color:var(--adm-text)] text-xs font-medium">Title Casing</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "uppercase", label: "UPPERCASE" },
                      { value: "normal", label: "Title Case / As Typed" },
                    ].map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateHome({ selectedWorkTitleCase: c.value as "uppercase" | "normal" })}
                        className={`py-1.5 px-2 rounded border text-xs text-center transition-colors ${
                          (data.home.selectedWorkTitleCase ?? "uppercase") === c.value
                            ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)] font-semibold"
                            : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] hover:border-[color:var(--adm-accent)]"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Details (Subtitle, Description, Metadata Strip) */}
              <div className="border-t border-[color:var(--adm-line)] pt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <label className="text-[color:var(--adm-text)] text-xs font-medium">
                      Description, Subtitle & Metadata Strip (Below Project Card)
                    </label>
                    <span className="text-[10px] text-[color:var(--adm-faint)]">
                      {(data.home.selectedWorkCardDetailsMode ?? "show") === "show" ? "Showing" : "Not Showing"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "show", label: "Show (Turned On)" },
                      { value: "hide", label: "Not Showing (Turned Off)" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateHome({ selectedWorkCardDetailsMode: opt.value as "show" | "hide" })}
                        className={`py-2 px-3 rounded border text-xs text-center transition-colors ${
                          (data.home.selectedWorkCardDetailsMode ?? "show") === opt.value
                            ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)] font-semibold"
                            : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] hover:border-[color:var(--adm-accent)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(data.home.selectedWorkCardDetailsMode ?? "show") === "show" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => updateHome({ selectedWorkShowSubtitle: !(data.home.selectedWorkShowSubtitle ?? true) })}
                      className={`p-2 rounded border text-xs text-left transition-colors ${
                        (data.home.selectedWorkShowSubtitle ?? true)
                          ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)]"
                          : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)]"
                      }`}
                    >
                      <span className="block font-medium">Subtitle</span>
                      <span className="block text-[10px] opacity-70">
                        {(data.home.selectedWorkShowSubtitle ?? true) ? "✓ Showing" : "✕ Not Showing"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateHome({ selectedWorkShowDescription: !(data.home.selectedWorkShowDescription ?? true) })}
                      className={`p-2 rounded border text-xs text-left transition-colors ${
                        (data.home.selectedWorkShowDescription ?? true)
                          ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)]"
                          : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)]"
                      }`}
                    >
                      <span className="block font-medium">Description</span>
                      <span className="block text-[10px] opacity-70">
                        {(data.home.selectedWorkShowDescription ?? true) ? "✓ Showing" : "✕ Not Showing"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateHome({ selectedWorkShowMetadataStrip: !(data.home.selectedWorkShowMetadataStrip ?? true) })}
                      className={`p-2 rounded border text-xs text-left transition-colors ${
                        (data.home.selectedWorkShowMetadataStrip ?? true)
                          ? "border-[color:var(--adm-accent)] bg-[color:var(--adm-accent)]/10 text-[color:var(--adm-text)]"
                          : "border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)]"
                      }`}
                    >
                      <span className="block font-medium">Metadata Strip</span>
                      <span className="block text-[10px] opacity-70">
                        {(data.home.selectedWorkShowMetadataStrip ?? true) ? "✓ Showing" : "✕ Not Showing"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

<div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">From the Studio band</span>
          <CheckboxInput
            label="Show the artworks slideshow on Home"
            checked={data.home.showStudioBand !== false}
            onChange={(v) => updateHome({ showStudioBand: v })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Heading"
              value={data.home.studioHeading ?? "From the Studio"}
              onChange={(v) => updateHome({ studioHeading: v })}
            />
            <TextInput
              label="Studio link label"
              value={data.home.studioLinkLabel ?? "Visit Studio →"}
              onChange={(v) => updateHome({ studioLinkLabel: v })}
            />
          </div>
          <p className="text-[color:var(--adm-faint)] text-xs">
            Slides are the Gallery items set to “Artwork” (not archived), in Gallery order. Card size follows Studio Page → Card size.
          </p>
        </div>

        <div className="border border-[color:var(--adm-line)] p-4 flex flex-col gap-3">
          <span className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">About band (bottom of Home)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Eyebrow" value={data.home.aboutEyebrow} onChange={(v) => updateHome({ aboutEyebrow: v })} />
            <TextInput label="Heading" value={data.home.aboutHeading} onChange={(v) => updateHome({ aboutHeading: v })} />
          </div>
          <TextInput label='"Read full bio" link label' value={data.home.aboutCtaLabel} onChange={(v) => updateHome({ aboutCtaLabel: v })} />
          <p className="text-[color:var(--adm-faint)] text-xs">
            The paragraph is the first Bio paragraph from the About tab.
          </p>
        </div>
      </section>
    </div>
  );
}
