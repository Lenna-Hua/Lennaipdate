# Admin redesign plan — UXfolio-style editor

Source: the UXfolio research chat (Sep 29, 2026), where we walked through UXfolio's
logged-in editor (Lora template), Design panel, section editing and Thumbnail Designer.

## What UXfolio's editor does that we want

| UXfolio pattern | What it looks like there |
| --- | --- |
| App shell, not a web page | Full-screen editor. Left: Design / Settings / Pages. Center: the page canvas. Right of top bar: View, Share, Tools, Publish. |
| Light, calm UI | White panels, thin grey borders, one accent color, sentence-case labels, lots of spacing. |
| Left panel with drill-in cards | Design panel lists Colors, Fonts, Animations, Buttons, Cursors, Social icons, Labels, Spacing, Templates. Each card opens a sub-panel with a back arrow. |
| Stage → Save / Cancel | Picking a palette previews instantly on the canvas; **Save** commits, **Cancel** reverts. Save is disabled until something changes. |
| Section toolbar | Hovering a section shows a floating toolbar (edit, background, add content). `+` buttons sit between sections and open an "Add section" library. |
| Every section | Add, duplicate, reorder, delete. |
| Case study tools | Device mockups with scrollable full-page screens, embeds, password per case study, Thumbnail Designer for matching covers. |

## Where our admin is today

- Rendered inside the public site layout (site navbar, Y2K backdrop blobs, footer) — feels like a page, not a tool.
- Dark brown/gold theme, ALL-CAPS labels everywhere, dense.
- 13 tabs in a horizontal strip (fixed Oct 9: now a vertical sidebar).
- Header has 8 buttons in one row (Live Preview, Save Draft, Preflight, Migrate, Dry Run, Save to Site, Export, Logout).
- Case study sections reorder only with ↑ ↓, boxes have no names, so they're hard to refer to.

## Phase 1 — Shell, look and project editor (build now)

1. **Own app shell for `/admin`.** No site navbar, backdrop or footer. A slim sticky top bar:
   title + current section on the left; Live Preview, View site, Save Draft, **Save to Site** on the right;
   rarely used actions (Preflight, Migrate inline media, Dry run, Export JSON, Logout) in a **Tools** menu.
2. **Light theme.** Replace the hard-coded dark colors with admin color tokens (`--adm-*`) defined once,
   set to a UXfolio-like light palette (white panels, warm grey borders, blue accent).
   One file controls the look from now on.
3. **Vertical sidebar, always on the left** of the editing area, at every screen width.
   Groups: **Page Content** (Projects, Gallery, Tags), Profile, Pages, Library.
4. **Named editing boxes.** Every box in the project editor gets a short code and name so it can be
   called out: `P` = project list, `D1…D10` = Details boxes, `S1…Sn` = case-study sections.
5. **Section cards like UXfolio.** Drag handle to reorder, collapse/expand, duplicate, delete,
   and `+ Add section here` between cards.

## Phase 2 — Design panel (next)

1. Rebuild **Fonts & Look** as a UXfolio-style Design panel: drill-in cards (Colors, Fonts, Animations,
   Buttons, Cursors, Labels, Spacing) with back arrows.
2. **Color palettes:** named presets plus custom colors mapped to tokens (headings, body, buttons, links,
   backgrounds). The site reads them as CSS variables instead of the hard-coded `#1F67F1`.
3. **Stage → Save / Cancel** in the Design panel, previewed live in the preview pane.
4. Per-section **background presets** (moving gradient, grainy mesh, dotted grid) for home/hero sections.

## Phase 3 — Case study extras (later)

1. **Thumbnail Designer** for Work-card covers (drop screens → device → background), reusing `DeviceMockup`.
2. **Password per case study** for NDA work (server-checked, not just hidden in the client).
3. **Review link** where mentors can leave pinned comments (needs storage; scope separately).
4. Click-to-edit in the live preview (click a section in the preview → jump to its box in the editor).

## Guardrails

- Don't touch `img-src` in `vercel.json` (see `.cursor/rules/csp-image-hosts.mdc`).
- Data shapes stay the same — this is a UI change; saved content keeps working.
- Verify with the live preview on and off, and on a narrow window.
