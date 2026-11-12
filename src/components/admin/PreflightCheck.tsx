/**
 * PreflightCheck — pre-save diagnostics: section sizes, inline media detection.
 */
import type { ContentData, GalleryItem, PreflightInfo } from "./types";
import { formatBytes } from "./shared";
import { galleryImageSrc } from "@/lib/gallery-image";

export const SECTION_WARN_BYTES = 3.5 * 1024 * 1024; // 3.5 MB warn threshold

function findInlineMediaInGallery(items: GalleryItem[]): {
  itemLabel: string;
  field: string;
} | null {
  for (const item of items) {
    const label = item.title?.trim() || item.slug?.trim() || item.id;
    if (typeof item.coverImage === "string" && item.coverImage.startsWith("data:")) {
      return { itemLabel: label, field: "coverImage" };
    }
    const imgs = item.images ?? [];
    for (let i = 0; i < imgs.length; i += 1) {
      const src = galleryImageSrc(imgs[i]);
      if (src.startsWith("data:")) {
        return { itemLabel: label, field: `images[${i}]` };
      }
    }
  }
  return null;
}

/** Scan ALL content sections for inline base64 data URLs. */
function findAllInlineMedia(data: ContentData): { section: string; itemLabel: string; field: string }[] {
  const found: { section: string; itemLabel: string; field: string }[] = [];

  for (const item of data.gallery ?? []) {
    const label = item.title?.trim() || item.slug?.trim() || item.id;
    if (typeof item.coverImage === "string" && item.coverImage.startsWith("data:")) {
      found.push({ section: "gallery", itemLabel: label, field: "coverImage" });
    }
    if (typeof item.logo === "string" && item.logo.startsWith("data:")) {
      found.push({ section: "gallery", itemLabel: label, field: "logo" });
    }
    if (typeof item.stampImage === "string" && item.stampImage.startsWith("data:")) {
      found.push({ section: "gallery", itemLabel: label, field: "stampImage" });
    }
    for (let i = 0; i < (item.images ?? []).length; i += 1) {
      const src = galleryImageSrc(item.images![i]);
      if (src.startsWith("data:")) {
        found.push({ section: "gallery", itemLabel: label, field: `images[${i}]` });
      }
    }
  }

  for (const proj of data.projects ?? []) {
    const label = proj.title?.trim() || proj.slug?.trim() || proj.id;
    if (typeof proj.coverImage === "string" && proj.coverImage.startsWith("data:")) {
      found.push({ section: "projects", itemLabel: label, field: "coverImage" });
    }
    if (typeof proj.logo === "string" && proj.logo.startsWith("data:")) {
      found.push({ section: "projects", itemLabel: label, field: "logo" });
    }
    const allSecs = [
      ...(proj.sections ?? []),
      ...(proj.detailSections ?? []),
    ];
    for (const sec of allSecs) {
      if (typeof sec.src === "string" && sec.src.startsWith("data:")) {
        found.push({
          section: "projects",
          itemLabel: label,
          field: `section "${sec.title || sec.id}"`,
        });
      }
      if (Array.isArray(sec.images)) {
        for (let i = 0; i < sec.images.length; i++) {
          if (typeof sec.images[i] === "string" && sec.images[i].startsWith("data:")) {
            found.push({
              section: "projects",
              itemLabel: label,
              field: `section "${sec.title || sec.id}" image [${i + 1}]`,
            });
          }
        }
      }
    }
  }

  for (const logo of data.studio?.logos ?? []) {
    if (typeof logo.src === "string" && logo.src.startsWith("data:")) {
      found.push({
        section: "studio",
        itemLabel: logo.name?.trim() || logo.id,
        field: "src",
      });
    }
  }

  const heroMedia = data.homepage?.home?.heroMedia;
  if (typeof heroMedia === "string" && heroMedia.startsWith("data:")) {
    found.push({
      section: "homepage",
      itemLabel: "Home page",
      field: "heroMedia",
    });
  }

  return found;
}

export { findInlineMediaInGallery, findAllInlineMedia };

export function computePreflight(data: ContentData, storageBackend: string): PreflightInfo {
  const sectionsToCheck: (keyof ContentData)[] = [
    "projects", "about", "experience", "education",
    "gallery", "identity", "contact", "files", "homepage",
    "studio", "appearance",
  ];

  const sectionSizes = sectionsToCheck.map((name) => {
    const bytes = new TextEncoder().encode(JSON.stringify(data[name])).length;
    return { name, bytes, formatted: formatBytes(bytes) };
  });

  const totalBytes = sectionSizes.reduce((sum, s) => sum + s.bytes, 0);
  const oversizeSections = sectionSizes.filter((s) => s.bytes > SECTION_WARN_BYTES).map((s) => s.name);
  const largestSection = sectionSizes.reduce((max, s) => (s.bytes > max.bytes ? s : max)).name;
  const inlineMedia = findAllInlineMedia(data);

  return {
    sectionSizes,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    oversizeSections,
    largestSection,
    inlineMedia,
    storageBackend,
    allClear: oversizeSections.length === 0 && inlineMedia.length === 0 && !findInlineMediaInGallery(data.gallery ?? []),
  };
}

// ── PreflightPanel (inline display of preflight results) ───────────────

export function PreflightPanel({
  info,
  onClose,
}: {
  info: PreflightInfo;
  onClose: () => void;
}) {
  return (
    <div className="border border-[color:var(--adm-line-strong)] rounded-lg p-5 bg-[color:var(--adm-surface)]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[color:var(--adm-text)] text-lg font-medium">
          Preflight Check{" "}
          {info.allClear ? (
            <span className="text-emerald-400 text-sm ml-2">✓ All Clear</span>
          ) : (
            <span className="text-amber-400 text-sm ml-2">⚠ Issues Found</span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)] text-sm"
        >
          ✕ Close
        </button>
      </div>

      {/* Storage Backend */}
      <div className="mb-4 text-sm">
        <span className="text-[color:var(--adm-muted)]">Storage backend:</span>{" "}
        <span className="text-[color:var(--adm-accent)] font-medium">{info.storageBackend}</span>
      </div>

      {/* Section Sizes */}
      <div className="mb-4">
        <h4 className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest mb-2">
          Section Payload Sizes{" "}
          <span className="text-[color:var(--adm-text)] normal-case">({info.totalFormatted} total)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {info.sectionSizes.map((s) => (
            <div
              key={s.name}
              className={`flex justify-between items-center px-3 py-2 rounded text-sm ${
                s.bytes > SECTION_WARN_BYTES
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "bg-[color:var(--adm-subtle)]"
              }`}
            >
              <span className="text-[color:var(--adm-text)] capitalize">{s.name}</span>
              <span className={s.bytes > SECTION_WARN_BYTES ? "text-amber-400" : "text-[color:var(--adm-muted)]"}>
                {s.formatted}
              </span>
            </div>
          ))}
        </div>
        {info.oversizeSections.length > 0 && (
          <p className="text-amber-400 text-xs mt-2">
            ⚠ {info.oversizeSections.join(", ")} exceed {formatBytes(SECTION_WARN_BYTES)}: may fail on Vercel (limit ~4.5 MB).
          </p>
        )}
      </div>

      {/* Inline Media */}
      <div>
        <h4 className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest mb-2">
          Inline Base64 Media{" "}
          <span className="normal-case">
            ({info.inlineMedia.length} found{info.inlineMedia.length > 0 ? ": must migrate before saving" : ""})
          </span>
        </h4>
        {info.inlineMedia.length === 0 ? (
          <p className="text-emerald-400/70 text-sm">No inline media detected: safe to save.</p>
        ) : (
          <div className="space-y-1">
            {info.inlineMedia.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                <span className="text-red-400">●</span>
                <span className="text-[color:var(--adm-muted)]">{m.section}</span>
                <span className="text-[color:var(--adm-text)]">→ {m.itemLabel}</span>
                <span className="text-[color:var(--adm-muted)]">→ {m.field}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
