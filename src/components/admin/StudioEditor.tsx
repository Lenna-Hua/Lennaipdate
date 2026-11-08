/**
 * Studio page copy (hero, artworks slideshow, Play section) plus the logo marquee shown on Work.
 */
import { SafeImage } from "@/components/SafeImage";
import type { Studio, StudioLogo } from "./types";
import { TextInput, TextareaInput, CheckboxInput } from "./shared";
import {
  UploadToLibraryDashed,
  PickFromLibraryButton,
} from "./AssetLibrary";

export function StudioEditor({
  data,
  onChange,
  onPreview,
}: {
  data: Studio;
  onChange: (next: Studio) => void;
  onPreview?: () => void;
}) {
  const patch = (p: Partial<Studio>) => onChange({ ...data, ...p });

  const updateLogo = (idx: number, p: Partial<StudioLogo>) => {
    patch({
      logos: data.logos.map((logo, i) => (i === idx ? { ...logo, ...p } : logo)),
    });
  };

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Studio page</h2>
          <p className="text-[color:var(--adm-muted)] text-sm mt-1">
            Order on /studio: Hero → Artworks slideshow → Play (Kern game). Artworks themselves are
            edited in the Artworks tab above. The logo marquee at the bottom is shown on the Work page.
          </p>
        </div>
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="text-sm border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-1.5 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors uppercase tracking-widest"
          >
            Preview /studio
          </button>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Hero</h3>
        <TextInput label="Eyebrow" value={data.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
        <TextInput label="Heading" value={data.heading} onChange={(v) => patch({ heading: v })} />
        <TextareaInput label="Intro" value={data.intro} onChange={(v) => patch({ intro: v })} rows={4} />
        <div className="flex flex-col gap-3">
          <CheckboxInput
            label="Graph-paper background"
            checked={data.showGrid}
            onChange={(v) => patch({ showGrid: v })}
          />
          <CheckboxInput
            label="Hanging scrapbook decorations"
            checked={data.showDecor}
            onChange={(v) => patch({ showDecor: v })}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 border border-[color:var(--adm-line)] p-4">
        <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Artworks slideshow</h3>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Every artwork shows in this slideshow, here and on Home. Bigger pieces with their own page
          belong in Projects as case studies.
        </p>
        <TextInput
          label="Eyebrow"
          value={data.artworksEyebrow}
          onChange={(v) => patch({ artworksEyebrow: v })}
        />
        <TextInput
          label="Heading"
          value={data.artworksHeading}
          onChange={(v) => patch({ artworksHeading: v })}
        />
        <TextareaInput
          label="Blurb"
          value={data.artworksBlurb}
          onChange={(v) => patch({ artworksBlurb: v })}
          rows={2}
        />

        <div className="flex flex-col gap-2">
          <label className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">Card size</label>
          <div className="flex gap-2 flex-wrap">
            {(["md", "lg", "xl"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => patch({ artworksCardSize: size })}
                className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  data.artworksCardSize === size
                    ? "bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] border-[color:var(--adm-accent)]"
                    : "text-[color:var(--adm-muted)] border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)]"
                }`}
              >
                {size === "md" ? "Medium · 4 cols" : size === "lg" ? "Large · 3 cols" : "Extra large · 2 cols"}
              </button>
            ))}
          </div>
          <p className="text-[color:var(--adm-muted)] text-xs">
            Column count on wide screens. Tablets and phones use fewer columns automatically.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 border border-[color:var(--adm-line)] p-4">
        <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Play (Kern game)</h3>
        <p className="text-[color:var(--adm-muted)] text-sm">
          The interactive kerning game under the slideshow. Old /play links land here.
        </p>
        <CheckboxInput
          label="Show the Play section"
          checked={data.showPlay}
          onChange={(v) => patch({ showPlay: v })}
        />
        <TextInput
          label="Eyebrow"
          value={data.playEyebrow}
          onChange={(v) => patch({ playEyebrow: v })}
        />
        <TextInput
          label="Heading"
          value={data.playHeading}
          onChange={(v) => patch({ playHeading: v })}
        />
        <TextareaInput
          label="Blurb (optional)"
          value={data.playBlurb}
          onChange={(v) => patch({ playBlurb: v })}
          rows={2}
        />
      </section>

      <section className="flex flex-col gap-4 border border-[color:var(--adm-line)] p-4">
        <h3 className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest">Logo marquee: Work page</h3>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Infinite horizontal strip at the bottom of the Work page. Add marks here, and/or upload a Logo on each artwork or project.
        </p>
        <CheckboxInput
          label="Show marquee"
          checked={data.showLogoMarquee}
          onChange={(v) => patch({ showLogoMarquee: v })}
        />
        <CheckboxInput
          label="Also include logos uploaded on artworks + projects"
          checked={data.logoMarqueeAuto}
          onChange={(v) => patch({ logoMarqueeAuto: v })}
        />
        <TextInput
          label="Label above the strip"
          value={data.logoMarqueeLabel}
          onChange={(v) => patch({ logoMarqueeLabel: v })}
        />
        <TextInput
          label="Loop speed (seconds: higher is slower)"
          value={String(data.logoMarqueeSpeed)}
          onChange={(v) => {
            const n = parseFloat(v);
            patch({ logoMarqueeSpeed: Number.isFinite(n) ? n : data.logoMarqueeSpeed });
          }}
        />

        <div className="flex flex-col gap-3">
          {(data.logos ?? []).map((logo, i) => (
            <div key={logo.id} className="border border-[color:var(--adm-line)] p-3 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest">
                  Logo {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => patch({ logos: data.logos.filter((_, j) => j !== i) })}
                  className="text-sm text-[color:var(--adm-faint)] hover:text-red-400"
                >
                  Remove
                </button>
              </div>
              <TextInput
                label="Name"
                value={logo.name}
                onChange={(v) => updateLogo(i, { name: v })}
              />
              <TextInput
                label="Link (optional: /work/slug or https://…)"
                value={logo.href ?? ""}
                onChange={(v) => updateLogo(i, { href: v })}
              />
              <input
                type="text"
                value={logo.src ?? ""}
                onChange={(e) => updateLogo(i, { src: e.target.value })}
                placeholder="Logo image URL"
                className="bg-transparent border-b border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)]"
              />
              <div className="flex gap-2 flex-wrap">
                <UploadToLibraryDashed
                  label="↑ Upload logo"
                  usage="logo"
                  accept="image/*"
                  onUploaded={(url) => updateLogo(i, { src: url })}
                />
                <PickFromLibraryButton
                  type="image"
                  onPick={(url) => updateLogo(i, { src: url })}
                />
              </div>
              {logo.src && (
                <SafeImage
                  src={logo.src}
                  alt=""
                  className="h-12 w-auto object-contain"
                  fallbackAspect="1 / 1"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              patch({
                logos: [
                  ...data.logos,
                  { id: String(Date.now()), name: "New mark", src: "", href: "" },
                ],
              })
            }
            className="text-sm border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-1.5 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors uppercase tracking-widest w-max"
          >
            + Add logo
          </button>
        </div>
      </section>
    </div>
  );
}
