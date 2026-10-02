/**
 * GalleryEditor — edit gallery items (big projects and artworks) with cover images,
 * additional images, tags, external links, and ordering.
 */
import { useState } from "react";
import { SafeImage } from "@/components/SafeImage";
import { AdminSortableList } from "@/pages/admin-sortable";
import type { GalleryImageColumns, GalleryItem } from "./types";
import {
  galleryImageColumns,
  galleryImageSrc,
  withGalleryImageColumns,
  withGalleryImageSrc,
} from "@/lib/gallery-image";
import { TextInput, TextareaInput, TagsInput, CheckboxInput, slugify } from "./shared";
import {
  UploadToLibraryDashed,
  PickFromLibraryButton,
  SectionImageUploader,
} from "./AssetLibrary";

const COLUMN_OPTIONS: { value: GalleryImageColumns; label: string }[] = [
  { value: 1, label: "1 — Full" },
  { value: 2, label: "2 — Half" },
  { value: 3, label: "3 — Third" },
];

export function GalleryEditor({
  data,
  onChange,
  tagSuggestions,
}: {
  data: GalleryItem[];
  onChange: (d: GalleryItem[]) => void;
  tagSuggestions: string[];
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "active" | "archived"
  >("active");

  const update = (idx: number, patch: Partial<GalleryItem>) => {
    onChange(data.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const itemCounts = {
    all: data.length,
    active: data.filter((g) => !g.archived).length,
    archived: data.filter((g) => Boolean(g.archived)).length,
  };

  const matchesVisibility = (g: GalleryItem) => {
    if (visibilityFilter === "active") return !g.archived;
    if (visibilityFilter === "archived") return Boolean(g.archived);
    return true;
  };

  const updateWithSlug = (idx: number, title: string) => {
    const item = data[idx];
    if (!item) return;
    const currentSlug = item.slug ?? "";
    const expectedFromOldTitle = slugify(item.title ?? "");
    // Auto-update slug only when it still matches the previous title's slug
    // (i.e. user has not manually customised it).
    const shouldAutoSlug = !currentSlug || currentSlug === expectedFromOldTitle;
    update(idx, {
      title,
      ...(shouldAutoSlug ? { slug: slugify(title) } : {}),
    });
  };

  const slugConflict = (slug: string, idx: number): boolean =>
    data.some((it, i) => i !== idx && it.slug === slug);

  const addItem = () => {
    const maxOrder = data.reduce((m, it) => Math.max(m, it.order ?? 0), 0);
    const newItem: GalleryItem = {
      id: String(Date.now()),
      kind: "big",
      slug: `new-item-${Date.now()}`,
      title: "New Item",
      role: "",
      year: String(new Date().getFullYear()),
      description: "",
      tags: [],
      coverImage: "",
      images: [],
      order: maxOrder + 1,
      featured: false,
      archived: false,
    };
    const updated = [...data, newItem];
    onChange(updated);
    setSelectedIdx(updated.length - 1);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const arr = [...data].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const pos = arr.findIndex((x) => x.id === data[idx].id);
    const to = pos + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[pos], arr[to]] = [arr[to], arr[pos]];
    arr.forEach((it, i) => {
      it.order = i + 1;
    });
    onChange(arr);
    setSelectedIdx(data.findIndex((x) => x.id === arr[to].id));
  };

  const item = data[selectedIdx];

  return (
    <div className="flex gap-6">
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={addItem}
          className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-2 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest mb-2"
        >
          + Add Gallery Item
        </button>
        <div className="mb-2 flex flex-col gap-1">
          {(
            [
              { id: "all" as const, label: "All", count: itemCounts.all },
              { id: "active" as const, label: "Active", count: itemCounts.active },
              { id: "archived" as const, label: "Archived", count: itemCounts.archived },
            ]
          ).map((opt) => {
            const active = visibilityFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVisibilityFilter(opt.id)}
                className={`flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest px-2 py-1.5 border transition-colors ${
                  active
                    ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                    : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`tabular-nums text-[9px] px-1.5 py-0.5 rounded ${
                    active ? "bg-[#0A0908]/20" : "bg-[#1B1815] text-[#4A4540]"
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
        {(["big", "small"] as const).map((kind) => {
          const group = data.filter(
            (g) => (g.kind ?? "big") === kind && matchesVisibility(g),
          );
          if (group.length === 0) return null;
          const heading =
            kind === "big" ? "Big Projects · Work page" : "Artworks · Slideshow";
          return (
            <div key={kind} className="flex flex-col gap-1.5 mt-3 first:mt-0">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#C8A96E] px-1 pt-1 pb-1">
                {heading} ({group.length})
              </div>
              <AdminSortableList
                items={group}
                onReorder={(reorderedGroup) => {
                  const selectedId = data[selectedIdx]?.id;
                  const positions = data.reduce<number[]>((acc, item, i) => {
                    if ((item.kind ?? "big") === kind && matchesVisibility(item)) {
                      acc.push(i);
                    }
                    return acc;
                  }, []);
                  const newData = [...data];
                  positions.forEach((pos, i) => {
                    newData[pos] = reorderedGroup[i]!;
                  });
                  onChange(newData);
                  if (selectedId) {
                    const newIdx = newData.findIndex((x) => x.id === selectedId);
                    if (newIdx !== -1) setSelectedIdx(newIdx);
                  }
                }}
                renderItem={(g, _groupIdx, dragHandle) => {
                  const i = data.findIndex((x) => x.id === g.id);
                  return (
                    <div className="flex items-center gap-1">
                      {dragHandle}
                      <button
                        onClick={() => setSelectedIdx(i)}
                        className={`flex-1 text-left text-sm px-2 py-2 truncate transition-colors ${
                          i === selectedIdx
                            ? "bg-[#C8A96E] text-[#0A0908]"
                            : "text-[#8A8278] hover:text-[#F2EDE5] border border-[#272421]"
                        }`}
                        title={g.title}
                      >
                        {g.featured ? "★ " : ""}
                        {g.title}
                        {g.archived && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest opacity-70">
                            (archived)
                          </span>
                        )}
                        {g.linkUrl && (
                          <span className="ml-2 opacity-70" title="Has external link">
                            ↗
                          </span>
                        )}
                      </button>
                    </div>
                  );
                }}
              />
            </div>
          );
        })}
      </div>
      {item && (
        <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-2">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <span className="text-[#C8A96E] text-sm uppercase tracking-widest">
              {item.title}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => moveItem(selectedIdx, -1)}
                className="text-[#8A8278] hover:text-[#F2EDE5] text-sm"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveItem(selectedIdx, 1)}
                className="text-[#8A8278] hover:text-[#F2EDE5] text-sm"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => {
                  onChange(data.filter((_, i) => i !== selectedIdx));
                  setSelectedIdx(Math.max(0, selectedIdx - 1));
                }}
                className="text-sm text-[#4A4540] hover:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#8A8278] text-xs uppercase tracking-widest">
              Section
            </label>
            <div className="flex gap-2">
              {(["big", "small"] as const).map((k) => {
                const active = (item.kind ?? "big") === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update(selectedIdx, { kind: k })}
                    className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                      active
                        ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                        : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                    }`}
                  >
                    {k === "big" ? "Big Project" : "Artwork"}
                  </button>
                );
              })}
            </div>
            <span className="text-[#4A4540] text-[11px] font-sans">
              Big Projects appear as cards on the Work page, each with its own
              /studio/&lt;slug&gt; page. Artworks appear in the slideshow on Studio and
              Home and open in a popup.
            </span>
          </div>

          {(item.kind ?? "big") === "small" && (
            <div className="flex flex-col gap-2">
              <label className="text-[#8A8278] text-xs uppercase tracking-widest">
                Slideshow card shape
              </label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    { value: undefined, label: "Auto" },
                    { value: "portrait" as const, label: "Portrait" },
                    { value: "landscape" as const, label: "Landscape" },
                  ] as const
                ).map(({ value, label }) => {
                  const active = (item.orientation ?? undefined) === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        update(selectedIdx, {
                          orientation: value,
                        })
                      }
                      className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                        active
                          ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                          : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[#4A4540] text-[11px] font-sans">
                Auto uses the cover&apos;s natural ratio. Portrait = 4:5, Landscape =
                16:10. All cards share the same max height; width follows the ratio.
              </span>
            </div>
          )}

          <TextInput
            label="Title"
            value={item.title}
            onChange={(v) => updateWithSlug(selectedIdx, v)}
          />
          <div className="flex flex-col gap-1">
            <TextInput
              label="Slug (URL: /studio/<slug>)"
              value={item.slug ?? ""}
              onChange={(v) => update(selectedIdx, { slug: slugify(v) })}
            />
            {item.slug && slugConflict(item.slug, selectedIdx) && (
              <span className="text-red-400 text-xs">
                Slug already used by another item — must be unique.
              </span>
            )}
          </div>
          <TextInput
            label="Role / Discipline"
            value={item.role}
            onChange={(v) => update(selectedIdx, { role: v })}
          />
          <TextInput
            label="Year"
            value={item.year ?? ""}
            onChange={(v) => update(selectedIdx, { year: v })}
          />
          <TextInput
            label="Display order"
            value={String(item.order ?? "")}
            onChange={(v) => {
              const n = parseInt(v, 10);
              update(selectedIdx, { order: Number.isFinite(n) ? n : undefined });
            }}
          />
          <TextareaInput
            label="Description"
            value={item.description ?? ""}
            onChange={(v) => update(selectedIdx, { description: v })}
            rows={4}
          />
          <TagsInput
            label="Tags"
            tags={item.tags ?? []}
            suggestions={tagSuggestions}
            onChange={(tags) => update(selectedIdx, { tags })}
          />

          <div className="flex flex-col gap-3 border border-[#272421] rounded p-3">
            <CheckboxInput
              label="★ Show on homepage Selected Work"
              checked={Boolean(item.featured)}
              onChange={(v) => update(selectedIdx, { featured: v })}
            />
            <CheckboxInput
              label="Archive (hide from public site)"
              checked={Boolean(item.archived)}
              onChange={(v) => update(selectedIdx, { archived: v })}
            />
          </div>

          {/* External hyperlink */}
          <div className="flex flex-col gap-2 border border-[#272421] rounded p-3">
            <label className="text-[#8A8278] text-xs uppercase tracking-widest">
              External Hyperlink (optional)
            </label>
            <TextInput
              label="Link URL (Behance, Vimeo, live site, etc.)"
              value={item.linkUrl ?? ""}
              onChange={(v) => update(selectedIdx, { linkUrl: v })}
            />
            <TextInput
              label='Link button label (default: "View project")'
              value={item.linkLabel ?? ""}
              onChange={(v) => update(selectedIdx, { linkLabel: v })}
            />
            <span className="text-[#4A4540] text-[11px] font-sans">
              Shown as a button on the public Studio detail page (big
              projects) or in the artwork popup (artworks). Leave blank to
              hide the button.
            </span>
          </div>

          {/* Cover image */}
          <div className="flex flex-col gap-2">
            <label className="text-[#8A8278] text-xs uppercase tracking-widest">
              Cover Image
            </label>
            <input
              type="text"
              value={item.coverImage}
              onChange={(e) => update(selectedIdx, { coverImage: e.target.value })}
              placeholder="Paste image URL"
              className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <UploadToLibraryDashed
                label="↑ Upload cover image"
                accept="image/*"
                onUploaded={(url) => update(selectedIdx, { coverImage: url })}
              />
              <PickFromLibraryButton
                type="image"
                onPick={(url) => update(selectedIdx, { coverImage: url })}
              />
            </div>
            {item.coverImage && (
              <div
                className="rounded overflow-hidden border border-[#3A3530]"
                style={{ maxHeight: "150px" }}
              >
                <SafeImage
                  src={item.coverImage}
                  alt="cover preview"
                  className="w-full object-cover"
                  style={{ maxHeight: "150px" }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border border-[#272421] rounded p-3">
            <label className="text-[#8A8278] text-xs uppercase tracking-widest">
              Project logo (marquee)
            </label>
            <span className="text-[#4A4540] text-[11px] font-sans">
              Square mark for the looping logo strip at the bottom of the Work page. Leave blank to skip this item.
            </span>
            <input
              type="text"
              value={item.logo ?? ""}
              onChange={(e) => update(selectedIdx, { logo: e.target.value })}
              placeholder="Paste logo URL"
              className="bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-2 text-sm focus:outline-none focus:border-[#C8A96E] transition-colors"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <UploadToLibraryDashed
                label="↑ Upload logo"
                accept="image/*"
                onUploaded={(url) => update(selectedIdx, { logo: url })}
              />
              <PickFromLibraryButton
                type="image"
                onPick={(url) => update(selectedIdx, { logo: url })}
              />
            </div>
            {item.logo && (
              <SafeImage
                src={item.logo}
                alt="logo preview"
                className="h-12 w-auto object-contain"
                fallbackAspect="1 / 1"
              />
            )}
          </div>

          {/* Additional images */}
          <div className="flex flex-col gap-3">
            <label className="text-[#8A8278] text-xs uppercase tracking-widest">
              Additional Images
            </label>
            {(item.kind ?? "big") === "small" && (
              <span className="text-[#4A4540] text-[11px] font-sans">
                Extra images appear on the artwork detail page and in the modal
                gallery when opened.
              </span>
            )}
            {(item.kind ?? "big") === "big" && (
              <div className="flex flex-col gap-2 border border-[#272421] p-3 rounded">
                <label className="text-[#8A8278] text-[10px] uppercase tracking-widest">
                  Default columns
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLUMN_OPTIONS.map(({ value, label }) => {
                    const active = (item.imageColumns ?? 2) === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          update(selectedIdx, { imageColumns: value })
                        }
                        className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                          active
                            ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                            : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[#4A4540] text-[11px] font-sans">
                  Applies to images that do not have their own width. Override
                  any single image below: 1 = full row, 2 = half, 3 = one third.
                </span>
              </div>
            )}
            {(item.images ?? []).map((entry, i) => {
              const src = galleryImageSrc(entry);
              const columns = galleryImageColumns(entry, item.imageColumns);
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 border border-[#272421] p-3 rounded"
                >
                  <div className="flex items-start gap-3">
                    {src && (
                      <SafeImage
                        src={src}
                        alt=""
                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                        fallbackAspect="16 / 5"
                      />
                    )}
                    <input
                      type="text"
                      value={src}
                      onChange={(e) => {
                        const arr = [...(item.images ?? [])];
                        arr[i] = withGalleryImageSrc(arr[i] ?? "", e.target.value);
                        update(selectedIdx, { images: arr });
                      }}
                      className="flex-1 bg-transparent border-b border-[#3A3530] text-[#F2EDE5] py-1 text-sm focus:outline-none focus:border-[#C8A96E]"
                    />
                    <button
                      onClick={() => {
                        const arr = (item.images ?? []).filter((_, j) => j !== i);
                        update(selectedIdx, { images: arr });
                      }}
                      className="text-sm text-[#4A4540] hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  {(item.kind ?? "big") === "big" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#8A8278] text-[10px] uppercase tracking-widest">
                        This image
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {COLUMN_OPTIONS.map(({ value, label }) => {
                          const active = columns === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                const arr = [...(item.images ?? [])];
                                arr[i] = withGalleryImageColumns(
                                  arr[i] ?? "",
                                  value,
                                );
                                update(selectedIdx, { images: arr });
                              }}
                              className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                                active
                                  ? "bg-[#C8A96E] text-[#0A0908] border-[#C8A96E]"
                                  : "text-[#8A8278] border-[#3A3530] hover:border-[#C8A96E]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  update(selectedIdx, {
                    images: [
                      ...(item.images ?? []),
                      { src: "", columns: item.imageColumns ?? 2 },
                    ],
                  })
                }
                className="text-sm border border-[#C8A96E] text-[#C8A96E] px-3 py-1.5 hover:bg-[#C8A96E] hover:text-[#0A0908] transition-colors uppercase tracking-widest"
              >
                + Add URL
              </button>
              <SectionImageUploader
                onPicked={(url) =>
                  update(selectedIdx, {
                    images: [
                      ...(item.images ?? []),
                      { src: url, columns: item.imageColumns ?? 2 },
                    ],
                  })
                }
              />
              <PickFromLibraryButton
                type="image"
                label="From library"
                onPick={(url) =>
                  update(selectedIdx, {
                    images: [
                      ...(item.images ?? []),
                      { src: url, columns: item.imageColumns ?? 2 },
                    ],
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
