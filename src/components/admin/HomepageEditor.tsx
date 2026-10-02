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
            className="text-sm border border-[#3A3530] text-[#8A8278] px-3 py-1.5 hover:border-[#C8A96E] hover:text-[#C8A96E] uppercase tracking-widest"
          >
            Preview home
          </button>
        </div>
      )}
      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl text-[#F2EDE5]">Entry / Splash Page</h2>
        <p className="text-[#8A8278] text-sm">
          The dark splash screen visitors see at the very root URL — top wordmark, two big choice cards, and the prompt at the bottom.
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

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">Left card — Product / Design</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="Number" value={data.entry.designCard.number} onChange={(v) => updateDesignCard({ number: v })} />
            <TextInput label="Title line 1" value={data.entry.designCard.titleLine1} onChange={(v) => updateDesignCard({ titleLine1: v })} />
            <TextInput label="Title line 2" value={data.entry.designCard.titleLine2} onChange={(v) => updateDesignCard({ titleLine2: v })} />
          </div>
          <TextareaInput label="Description" value={data.entry.designCard.description} onChange={(v) => updateDesignCard({ description: v })} rows={2} />
        </div>

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">Right card — Art / Creative</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput label="Number" value={data.entry.artCard.number} onChange={(v) => updateArtCard({ number: v })} />
            <TextInput label="Title line 1" value={data.entry.artCard.titleLine1} onChange={(v) => updateArtCard({ titleLine1: v })} />
            <TextInput label="Title line 2" value={data.entry.artCard.titleLine2} onChange={(v) => updateArtCard({ titleLine2: v })} />
          </div>
          <TextareaInput label="Description" value={data.entry.artCard.description} onChange={(v) => updateArtCard({ description: v })} rows={2} />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl text-[#F2EDE5]">Home Page</h2>
        <p className="text-[#8A8278] text-sm">
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

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">Hero media (optional)</span>
          <p className="text-[#8A8278] text-xs">
            Image or video shown below the intro. Leave empty to keep the current text-only hero on the live site.
          </p>
          <input
            type="text"
            value={heroMedia}
            onChange={(e) => updateHome({ heroMedia: e.target.value, heroMediaMime: "" })}
            placeholder="Paste URL or upload / pick from library"
            className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <UploadToLibraryDashed
              label="↑ Upload hero media"
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
                className="text-sm text-[#4A4540] hover:text-red-400 transition-colors"
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
              className="rounded overflow-hidden border border-[#3A3530] mt-1"
              style={{ maxWidth: "480px", aspectRatio: "16 / 9" }}
            >
              <CoverMedia
                src={heroMedia}
                alt={heroMediaAlt || "Hero media preview"}
                mimeHint={heroMediaMime}
                className="w-full h-full object-cover bg-[#0A0908]"
                loading="eager"
              />
            </div>
          ) : (
            <p className="text-[#4A4540] text-xs">
              No hero media set — visitors see the same layout as today.
            </p>
          )}
        </div>

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">Hero buttons</span>
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
          <p className="text-[#4A4540] text-xs">
            The spinning flower sticker in the hero links to the primary button&apos;s link. Hidden on phones.
          </p>
        </div>

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">Selected Work band</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Heading" value={data.home.selectedWorkHeading} onChange={(v) => updateHome({ selectedWorkHeading: v })} />
            <TextInput label='"View all" link label' value={data.home.selectedWorkLinkLabel} onChange={(v) => updateHome({ selectedWorkLinkLabel: v })} />
          </div>
          <p className="text-[#4A4540] text-xs">
            Up to 6 cards from Work and Gallery items with “★ Show on homepage Selected Work” ticked (and not archived).
          </p>
        </div>

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">From the Studio band</span>
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
          <p className="text-[#4A4540] text-xs">
            Slides are the Gallery items set to “Artwork” (not archived), in Gallery order. Card size follows Studio Page → Card size.
          </p>
        </div>

        <div className="border border-[#272421] p-4 flex flex-col gap-3">
          <span className="text-[#C8A96E] text-sm uppercase tracking-widest">About band (bottom of Home)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="Eyebrow" value={data.home.aboutEyebrow} onChange={(v) => updateHome({ aboutEyebrow: v })} />
            <TextInput label="Heading" value={data.home.aboutHeading} onChange={(v) => updateHome({ aboutHeading: v })} />
          </div>
          <TextInput label='"Read full bio" link label' value={data.home.aboutCtaLabel} onChange={(v) => updateHome({ aboutCtaLabel: v })} />
          <p className="text-[#4A4540] text-xs">
            The paragraph is the first Bio paragraph from the About tab.
          </p>
        </div>
      </section>
    </div>
  );
}
