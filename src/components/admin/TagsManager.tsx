/**
 * TagsManager — rename, merge, and delete tags across all projects and gallery items.
 */
import { useState } from "react";
import type { Project, GalleryItem } from "./types";

// ── Tag utility functions ──────────────────────────────────────────────

export function deriveTagStats(
  projects: Project[],
  gallery: GalleryItem[],
): Map<string, { projects: string[]; gallery: string[] }> {
  const sets = new Map<string, { projects: Set<string>; gallery: Set<string> }>();
  const bump = (raw: string, kind: "projects" | "gallery", id: string) => {
    const k = (raw ?? "").trim();
    if (!k) return;
    if (!sets.has(k)) sets.set(k, { projects: new Set(), gallery: new Set() });
    sets.get(k)![kind].add(id);
  };
  for (const p of projects) for (const t of p.tags ?? []) bump(t, "projects", p.id);
  for (const g of gallery) for (const t of g.tags ?? []) bump(t, "gallery", g.id);
  const out = new Map<string, { projects: string[]; gallery: string[] }>();
  for (const [k, v] of sets) {
    out.set(k, { projects: Array.from(v.projects), gallery: Array.from(v.gallery) });
  }
  return out;
}

function rewriteTags(tags: string[], rewrite: (t: string) => string | null): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const v = rewrite(t);
    if (!v) continue;
    if (out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function applyTagRename(
  projects: Project[],
  gallery: GalleryItem[],
  from: string,
  to: string,
): { projects: Project[]; gallery: GalleryItem[] } {
  const target = to.trim();
  if (!target) return { projects, gallery };
  const fn = (t: string) => (t === from ? target : t);
  return {
    projects: projects.map((p) => ({ ...p, tags: rewriteTags(p.tags ?? [], fn) })),
    gallery: gallery.map((g) => ({ ...g, tags: rewriteTags(g.tags ?? [], fn) })),
  };
}

function applyTagMerge(
  projects: Project[],
  gallery: GalleryItem[],
  sources: string[],
  target: string,
): { projects: Project[]; gallery: GalleryItem[] } {
  const tgt = target.trim();
  if (!tgt) return { projects, gallery };
  const set = new Set(sources);
  const fn = (t: string) => (set.has(t) ? tgt : t);
  return {
    projects: projects.map((p) => ({ ...p, tags: rewriteTags(p.tags ?? [], fn) })),
    gallery: gallery.map((g) => ({ ...g, tags: rewriteTags(g.tags ?? [], fn) })),
  };
}

function applyTagDelete(
  projects: Project[],
  gallery: GalleryItem[],
  tag: string,
): { projects: Project[]; gallery: GalleryItem[] } {
  const fn = (t: string) => (t === tag ? null : t);
  return {
    projects: projects.map((p) => ({ ...p, tags: rewriteTags(p.tags ?? [], fn) })),
    gallery: gallery.map((g) => ({ ...g, tags: rewriteTags(g.tags ?? [], fn) })),
  };
}

// ── TagsManager component ──────────────────────────────────────────────

export function TagsManager({
  projects,
  gallery,
  onProjectsChange,
  onGalleryChange,
}: {
  projects: Project[];
  gallery: GalleryItem[];
  onProjectsChange: (p: Project[]) => void;
  onGalleryChange: (g: GalleryItem[]) => void;
}) {
  const stats = deriveTagStats(projects, gallery);
  const tags = Array.from(stats.entries())
    .map(([tag, refs]) => ({
      tag,
      projects: refs.projects,
      gallery: refs.gallery,
      total: refs.projects.length + refs.gallery.length,
    }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));

  const [filter, setFilter] = useState("");
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergingTag, setMergingTag] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const apply = (next: { projects: Project[]; gallery: GalleryItem[] }) => {
    onProjectsChange(next.projects);
    onGalleryChange(next.gallery);
  };

  const lowerCounts = new Map<string, number>();
  for (const t of tags) {
    const k = t.tag.toLowerCase();
    lowerCounts.set(k, (lowerCounts.get(k) ?? 0) + 1);
  }

  const filtered = filter
    ? tags.filter((t) => t.tag.toLowerCase().includes(filter.toLowerCase()))
    : tags;

  const closeAll = () => {
    setRenamingTag(null);
    setMergingTag(null);
    setConfirmDelete(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[color:var(--adm-text)] text-lg font-serif">Tags ({tags.length})</h2>
          <p className="text-[color:var(--adm-muted)] text-xs mt-1 max-w-xl">
            Rename, merge, or delete tags across all projects and gallery items at
            once. Click <span className="text-[color:var(--adm-accent)]">Save to Site</span> after
            changes to publish. Rows highlighted gold are duplicate-casing variants.
          </p>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter tags…"
          className="bg-transparent border-b border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-1.5 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors w-56"
        />
      </div>

      {tags.length === 0 && (
        <p className="text-[color:var(--adm-faint)] text-sm italic">
          No tags in use yet. Add some on the Projects or Studio tabs.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {filtered.map(({ tag, projects: pIds, gallery: gIds, total }) => {
          const isDup = (lowerCounts.get(tag.toLowerCase()) ?? 0) > 1;
          const renaming = renamingTag === tag;
          const merging = mergingTag === tag;
          const deleting = confirmDelete === tag;
          return (
            <div
              key={tag}
              className={`flex flex-col gap-2 border px-4 py-3 rounded ${
                isDup ? "border-[color:var(--adm-accent)]/40 bg-[color:var(--adm-accent)]/5" : "border-[color:var(--adm-line)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[color:var(--adm-text)] text-sm font-medium truncate">
                    {tag}
                  </span>
                  <span className="text-[10px] text-[color:var(--adm-muted)] uppercase tracking-widest whitespace-nowrap">
                    {pIds.length} project{pIds.length === 1 ? "" : "s"} ·{" "}
                    {gIds.length} artwork{gIds.length === 1 ? "" : "s"}
                  </span>
                  {isDup && (
                    <span className="text-[10px] text-[color:var(--adm-accent)] uppercase tracking-widest whitespace-nowrap">
                      Duplicate casing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
                  <button
                    onClick={() => {
                      closeAll();
                      setRenamingTag(tag);
                      setRenameValue(tag);
                    }}
                    className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-accent)] transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      closeAll();
                      setMergingTag(tag);
                      setMergeTarget("");
                    }}
                    className="text-[color:var(--adm-muted)] hover:text-[color:var(--adm-accent)] transition-colors"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => {
                      closeAll();
                      setConfirmDelete(tag);
                    }}
                    className="text-[color:var(--adm-muted)] hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {renaming && (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setRenamingTag(null);
                      if (e.key === "Enter") {
                        const v = renameValue.trim();
                        if (v && v !== tag)
                          apply(applyTagRename(projects, gallery, tag, v));
                        setRenamingTag(null);
                      }
                    }}
                    className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-1.5 px-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors flex-1 min-w-[180px]"
                  />
                  <button
                    onClick={() => {
                      const v = renameValue.trim();
                      if (v && v !== tag)
                        apply(applyTagRename(projects, gallery, tag, v));
                      setRenamingTag(null);
                    }}
                    className="text-xs uppercase tracking-widest border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-1.5 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors"
                  >
                    Rename {total} item{total === 1 ? "" : "s"}
                  </button>
                  <button
                    onClick={() => setRenamingTag(null)}
                    className="text-xs uppercase tracking-widest text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {merging && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={mergeTarget}
                    onChange={(e) => setMergeTarget(e.target.value)}
                    className="bg-[color:var(--adm-input)] border border-[color:var(--adm-line-strong)] text-[color:var(--adm-text)] py-1.5 px-2 text-sm focus:outline-none focus:border-[color:var(--adm-accent)] transition-colors flex-1 min-w-[180px]"
                  >
                    <option value="">Merge into…</option>
                    {tags
                      .filter((o) => o.tag !== tag)
                      .map((o) => (
                        <option key={o.tag} value={o.tag}>
                          {o.tag} ({o.total})
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={!mergeTarget}
                    onClick={() => {
                      if (!mergeTarget) return;
                      apply(applyTagMerge(projects, gallery, [tag], mergeTarget));
                      setMergingTag(null);
                    }}
                    className="text-xs uppercase tracking-widest border border-[color:var(--adm-accent)] text-[color:var(--adm-accent)] px-3 py-1.5 hover:bg-[color:var(--adm-accent)] hover:text-[color:var(--adm-on-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Merge {total} item{total === 1 ? "" : "s"}
                  </button>
                  <button
                    onClick={() => setMergingTag(null)}
                    className="text-xs uppercase tracking-widest text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {deleting && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[color:var(--adm-text)] text-sm">
                    Remove &quot;{tag}&quot; from {total} item{total === 1 ? "" : "s"}?
                  </span>
                  <button
                    onClick={() => {
                      apply(applyTagDelete(projects, gallery, tag));
                      setConfirmDelete(null);
                    }}
                    className="text-xs uppercase tracking-widest border border-red-400 text-red-400 px-3 py-1.5 hover:bg-red-400 hover:text-[color:var(--adm-on-accent)] transition-colors"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs uppercase tracking-widest text-[color:var(--adm-muted)] hover:text-[color:var(--adm-text)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
