/**
 * About section editor — portrait, bio paragraphs, skills (JSON), and community entries.
 */
import type { About, CommunityItem, SkillGroup } from "./types";
import { TextInput, TextareaInput } from "./shared";
import {
  UploadToLibraryDashed,
  PickFromLibraryButton,
} from "./AssetLibrary";
import { SafeImage } from "@/components/SafeImage";
import { AdminSortableList } from "@/pages/admin-sortable";

const BTN =
  "text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest";

function CommunityEditor({
  intro,
  items,
  onIntroChange,
  onItemsChange,
}: {
  intro: string;
  items: CommunityItem[];
  onIntroChange: (v: string) => void;
  onItemsChange: (items: CommunityItem[]) => void;
}) {
  const update = (idx: number, patch: Partial<CommunityItem>) =>
    onItemsChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addImage = (idx: number, url: string) =>
    update(idx, { images: [...(items[idx].images ?? []), url] });

  return (
    <div className="flex flex-col gap-4">
      <label className="text-[#8A8278] text-sm uppercase tracking-widest">
        Community &amp; Volunteer
      </label>
      <TextareaInput
        label="Intro paragraph"
        value={intro}
        onChange={onIntroChange}
        rows={3}
        hint="Shown above the entry cards on the About page."
      />
      <AdminSortableList
        items={items}
        onReorder={onItemsChange}
        renderItem={(item, idx, dragHandle) => (
          <div className="border border-[#272421] p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {dragHandle}
                <span className="text-[#C8A96E] text-sm uppercase tracking-widest">
                  Entry {idx + 1}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}
                className="text-sm text-[#4A4540] hover:text-red-400"
              >
                Remove
              </button>
            </div>
            <TextInput label="Title" value={item.title} onChange={(v) => update(idx, { title: v })} />
            <TextInput
              label="Organization (optional)"
              value={item.organization ?? ""}
              onChange={(v) => update(idx, { organization: v })}
            />
            <TextInput
              label="Period (optional — e.g. 2024 – Present)"
              value={item.period ?? ""}
              onChange={(v) => update(idx, { period: v })}
            />
            <TextareaInput
              label="Description"
              value={item.description ?? ""}
              onChange={(v) => update(idx, { description: v })}
              rows={3}
            />
            <TextInput
              label="Link (optional)"
              value={item.linkUrl ?? ""}
              onChange={(v) => update(idx, { linkUrl: v })}
            />
            <TextInput
              label="Link label (optional)"
              value={item.linkLabel ?? ""}
              onChange={(v) => update(idx, { linkLabel: v })}
            />

            <div className="flex flex-col gap-2">
              <span className="text-[#8A8278] text-xs uppercase tracking-widest">
                Photos (first is the cover)
              </span>
              {(item.images ?? []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {(item.images ?? []).map((src, i) => (
                    <div
                      key={`${src}-${i}`}
                      className="relative w-20 h-20 border border-[#3A3530] overflow-hidden"
                    >
                      <SafeImage src={src} alt="" className="w-full h-full object-cover" fallbackAspect="1 / 1" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() =>
                          update(idx, { images: (item.images ?? []).filter((_, j) => j !== i) })
                        }
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 text-white text-xs leading-none hover:bg-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <UploadToLibraryDashed
                  label="↑ Upload photo"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
                  onUploaded={(url) => addImage(idx, url)}
                />
                <PickFromLibraryButton onPick={(url) => addImage(idx, url)} />
              </div>
            </div>
          </div>
        )}
      />
      <button
        type="button"
        onClick={() =>
          onItemsChange([...items, { id: String(Date.now()), title: "New entry", images: [] }])
        }
        className={`self-start ${BTN}`}
      >
        + Add Community Entry
      </button>
    </div>
  );
}

export function AboutEditor({
  data,
  onChange,
  onPreviewHome,
  onPreviewAbout,
}: {
  data: About;
  onChange: (d: About) => void;
  onPreviewHome?: (about: About) => void;
  onPreviewAbout?: (about: About) => void;
}) {
  const photo = data.photo ?? "";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[#8A8278] text-sm border border-[#272421] p-3">
        About page order: Info (portrait + bio, here) → Capabilities (Skills, here) → Experience
        (Experience tab) → Community &amp; Volunteer (here) → Education (Education tab) → Let&apos;s
        Talk (Identity &amp; Contact tab).
      </p>
      <div className="flex flex-col gap-2 max-w-md">
        <label className="text-[#8A8278] text-xs uppercase tracking-widest">
          About portrait
        </label>
        <input
          type="text"
          value={photo}
          onChange={(e) => onChange({ ...data, photo: e.target.value })}
          placeholder="Paste image URL or upload below"
          className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <UploadToLibraryDashed
            label="↑ Upload portrait"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
            onUploaded={(url) => onChange({ ...data, photo: url })}
          />
          <PickFromLibraryButton
            onPick={(url) => onChange({ ...data, photo: url })}
          />
          {photo && (
            <button
              type="button"
              onClick={() => onChange({ ...data, photo: "" })}
              className="text-sm text-[#4A4540] hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {photo ? (
          <div
            className="rounded overflow-hidden border border-[#3A3530] mt-1"
            style={{ maxWidth: "220px", aspectRatio: "3 / 4" }}
          >
            <SafeImage
              src={photo}
              alt="About portrait preview"
              className="w-full h-full object-cover"
              fallbackAspect="3 / 4"
            />
          </div>
        ) : (
          <p className="text-[#4A4540] text-xs">
            No portrait set — the About page will show a placeholder until you upload one.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <TextInput
          label="Years of experience"
          value={data.yearsExperience ?? "3+"}
          onChange={(v) => onChange({ ...data, yearsExperience: v })}
        />
        <p className="text-[#4A4540] text-xs">
          Shown on Home and About (e.g. 3+, 4+). Use Preview to check before publishing, or Save to Site to go live.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {onPreviewHome && (
            <button
              type="button"
              onClick={() => onPreviewHome(data)}
              className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
            >
              Preview Home
            </button>
          )}
          {onPreviewAbout && (
            <button
              type="button"
              onClick={() => onPreviewAbout(data)}
              className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
            >
              Preview About
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[#8A8278] text-sm uppercase tracking-widest">Bio Paragraphs</label>
        {data.bio.map((para, i) => (
          <div key={i} className="relative">
            <textarea
              value={para}
              onChange={(e) => {
                const updated = [...data.bio];
                updated[i] = e.target.value;
                onChange({ ...data, bio: updated });
              }}
              rows={3}
              className="w-full bg-[#0A0908] border border-[#3A3530] text-[#F2EDE5] py-2 px-3 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors resize-y"
            />
            <button
              onClick={() => onChange({ ...data, bio: data.bio.filter((_, j) => j !== i) })}
              className="absolute top-2 right-2 text-[#4A4540] hover:text-red-400 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...data, bio: [...data.bio, ""] })}
          className="self-start text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
        >
          + Add Paragraph
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-[#8A8278] text-sm uppercase tracking-widest">
          Skills (JSON format — array of {"{category, items[]}"}
          )
        </label>
        <textarea
          value={JSON.stringify(data.skills, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as SkillGroup[];
              onChange({ ...data, skills: parsed });
            } catch {
              // ignore parse errors while typing
            }
          }}
          rows={12}
          className="w-full bg-[#0A0908] border border-[#3A3530] text-[#F2EDE5] py-2 px-3 text-sm font-mono focus:outline-none focus:border-[#C8A96E] transition-colors resize-y"
        />
      </div>

      <CommunityEditor
        intro={data.community ?? ""}
        items={data.communityItems ?? []}
        onIntroChange={(v) => onChange({ ...data, community: v })}
        onItemsChange={(items) => onChange({ ...data, communityItems: items })}
      />
    </div>
  );
}
