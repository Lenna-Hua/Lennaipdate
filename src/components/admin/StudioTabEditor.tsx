/**
 * One admin tab for everything on /studio: the artworks list and the page copy/settings.
 */
import { useState } from "react";
import type { GalleryItem, Studio } from "./types";
import { GalleryEditor } from "./GalleryEditor";
import { StudioEditor } from "./StudioEditor";

type Pane = "artworks" | "page";

const PANES: { id: Pane; label: string }[] = [
  { id: "artworks", label: "Artworks" },
  { id: "page", label: "Page settings" },
];

export function StudioTabEditor({
  gallery,
  studio,
  onGalleryChange,
  onStudioChange,
  onPreview,
  tagSuggestions,
}: {
  gallery: GalleryItem[];
  studio: Studio;
  onGalleryChange: (next: GalleryItem[]) => void;
  onStudioChange: (next: Studio) => void;
  onPreview?: () => void;
  tagSuggestions: string[];
}) {
  const [pane, setPane] = useState<Pane>("artworks");

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Studio sections"
        className="flex gap-1 border-b border-[color:var(--adm-line)]"
      >
        {PANES.map((p) => {
          const active = pane === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPane(p.id)}
              className={`-mb-px px-4 py-2 text-sm border-b-2 transition-colors ${
                active
                  ? "border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] font-medium"
                  : "border-transparent text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]"
              }`}
            >
              {p.label}
              {p.id === "artworks" && (
                <span className="ml-2 text-xs tabular-nums text-[color:var(--adm-faint)]">
                  {gallery.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {pane === "artworks" ? (
        <GalleryEditor data={gallery} onChange={onGalleryChange} tagSuggestions={tagSuggestions} />
      ) : (
        <StudioEditor data={studio} onChange={onStudioChange} onPreview={onPreview} />
      )}
    </div>
  );
}
