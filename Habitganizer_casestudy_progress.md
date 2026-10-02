# Habiganize Case Study — Progress + Deploy Note



> **Repo:** `H:\My Portfolio_W2026\Lennaipdate`  

> **Slug:** `habiganize`  

> **Local preview:** http://localhost:5173/work/habiganize or http://localhost:5174/work/habiganize  

> **Live product:** https://habitganizer.tech  

> **Live portfolio:** https://www.lennahua.ca/work/habiganize  

> **Last updated:** Sep 19, 2026 — pending next deploy: See more scrolls to top (not page end)



---



## Pending next deploy (2026-09-19)



- **See more scroll fix** (`src/pages/work/case-study.tsx`): clicking **See more detail** used to `scrollIntoView` on the toggle button (bottom of content), so the page jumped to the end after expand. Now it `window.scrollTo({ top: 0 })` so reading starts at the beginning. Applies to all case studies with See more (Habiganize, Cotriply, etc.).



## Deployed (2026-08-05 night)



Portfolio Vercel prod + Neon `projects` updated. Habiganize slug is `habiganize` (legacy `Habitganize` row removed).



---



## What this case study is



**Habiganize** — cross-platform habit tracker with a pet-care economy. Narrative for Product / UX hiring managers:



- **Problem:** ~97% habit-app abandonment (retention cliff)

- **Bet:** emotional attachment (pets) beats streak guilt

- **USP:** solo BA → research → Figma system → PO → shipped (web, mobile, extension, API)



Lenses: **Business analysis**, **User**, **Design**, **Product**.



---



## See more UX (current — deploy this)



One `sections[]` list. No second `detailSections` document for Habiganize (legacy field still readable for old DB rows).



| Behavior | How |

|----------|-----|

| **Skim** | Blocks with `visibility: "always"` (or omitted) — **8** blocks |

| **See more** | (1) **Reveals** blocks with `visibility: "detail"` — **14** extras · (2) **Swaps text** on skim blocks that have `*Detail` fields |

| **Show less** | Hides detail-only blocks; restores skim copy |



**Button:** “See more detail” / “Show less” at bottom of content.

**Expand scroll (pending deploy):** on expand, smooth-scroll to **page top** (not the button). Show less does not force scroll.



### Text swap fields (same block, content changes)



Optional on text / problem-solution sections:



- `titleDetail`, `summaryDetail`, `bodyDetail`, `bulletsDetail`

- `problemDetail`, `solutionDetail`



When expanded, those replace skim fields. Habiganize already set on: **Problem, Bet, Care Loop, Design & Platform, Outcomes**.



Editable in Admin under **“Expanded copy (optional — swaps in when See more is on)”**.



### No iframe for live product



- Habiganize **does not** embed `habitganizer.tech` in an iframe (frame blockers + page jank).

- Use **image** or **video** + `href` + `linkLabel` → “Click here to try the product →”.

- PubHTML5 embeds still allowed for other projects only.



### Admin (Projects → Sections)



- `+ text` / `+ image` / `+ video` / `+ problem-solution` / `+ embed`

- Per block: **Skim (default)** vs **See more only**

- Image/video: Product CTA link + label

- Video: controls, **no autoplay**

- **Upload JSON / TXT** auto-fills sections (full project **or** bare sections array)

  - Fast path: upload `scripts/habiganize-detail-sections.json`



### DB safety



- Neon `content_sections.data` is **JSONB** — new optional fields need **no schema migration**.

- Saving projects with `visibility`, `href`, `type: "video"`, `*Detail` fields is safe.

- Do **not** strip unknown section fields on save.



---



## Habiganize section map



### Skim (always) — 8



1. The Problem *(text swaps on expand)*  

2. The Retention Cliff (image)  

3. The Bet *(problem/solution swap on expand)*  

4. The Care Loop *(text swaps on expand)*  

5. Core Loop (image)  

6. Design & Platform *(text swaps on expand)*  

7. Shipped Product (image + CTA → habitganizer.tech)  

8. Outcomes *(text swaps on expand)*  



### See more only — 14



Pitch · promo video · Research · Care Economy · Figma system · tokens · auth · explorations · four surfaces · IA · pets · **Try It Live (image + CTA, not iframe)** · business · validation  



---



## Data sources



| File | Role |

|------|------|

| `src/data/projects.json` | Local Vite seed |

| `lib/data/projects.json` | API / first-deploy DB seed |

| `scripts/habiganize-detail-sections.json` | Full sections list (also for Admin JSON upload) |

| `scripts/apply-habiganize-sections.mjs` | Writes unified `sections` (visibility + `*Detail`) into both JSON files; clears `detailSections` |



```bash

node scripts/apply-habiganize-sections.mjs

```



---



## Assets (`public/case-studies/habiganize/`)



| File | Use |

|------|-----|

| `web-cover.png` | Hero + Try It Live CTA image |

| `retention-chart.png` | Retention cliff |

| `loop-diagram.png` | Core loop |

| `mobile-screens.png` | Shipped product (+ CTA) |

| `promo.webm` | See more — video (controls, no autoplay) |

| `tokens-diagram.png`, `ia-diagram.png`, `pets-strip.png`, `live-auth.png`, `concept-mockup.png` | See more images |



Real captures only — no invented screens.



---



## Code touchpoints



| Path | What |

|------|------|

| `src/pages/work/case-study.tsx` | See more, text swap, video, CTA link, PubHTML5-only embed |

| `src/components/admin/ProjectEditor.tsx` | +video, visibility, CTA, expanded copy, JSON fill |

| `src/components/admin/types.ts` | Section fields |

| `src/components/admin/PreflightCheck.tsx` | Scans sections + legacy detailSections for inline base64 |

| `.cursor/rules/csp-image-hosts.mdc` | Never drop `framerusercontent.com` from `img-src` |



`frame-src` may still list habitganizer.tech historically; Habiganize case study no longer depends on iframe.



---



## Honesty guardrails



- No invented metrics (D30 lift, etc.)  

- Research = desk synthesis; usability tests = “next”  

- Persona “Restart Riley” = synthesized  

- No junk test-data screenshots  



---



## Local test plan (before deploy)



```bash

cd "H:\My Portfolio_W2026\Lennaipdate"

pnpm dev

# open /work/habiganize

```



Checklist:



- [ ] Skim shows **8** sections  

- [ ] **See more** reveals extra blocks **and** Problem / Bet / Loop / Design / Outcomes text **changes**  

- [ ] **See more** lands at **page top** (not the end / toggle button)  

- [ ] **Show less** restores skim copy and hides detail-only blocks  

- [ ] Shipped Product / Try It Live show **Click here to try the product →** (opens habitganizer.tech; no iframe)  

- [ ] Promo video has controls, does not autoplay  

- [ ] Admin: edit expanded copy, mark See more only, add video, upload `scripts/habiganize-detail-sections.json`  

- [ ] Other case studies still load Framer images (CSP)  



---



## Deploy checklist (when user asks)



1. **Portfolio** (`Lennaipdate`) → Vercel deploy  

2. **Sync Neon** `projects` with new Habiganize `sections` (visibility + `*Detail` + CTA). Prefer Admin **Save to Site** after confirming local seed, or seed from `lib/data/projects.json`.  

3. **Verify live** `/work/habiganize`: skim 8 → See more text swap + extras; **See more scrolls to top**; CTA links; video; CSP on other case studies  

4. Habiganize Netlify frame-ancestors fix is **optional now** (no portfolio iframe). Deploy only if you still want embedding elsewhere.



---



## Suggested next work



- [x] See more reveals detail blocks  

- [x] See more **swaps text** via `*Detail` fields  

- [x] See more expand scrolls to **page top** (code ready; ship on next deploy)  

- [x] Admin: visibility, +video, CTA, JSON auto-fill, expanded copy fields  

- [x] Replace iframe with product CTA  

- [ ] Tune skim vs expanded copy balance  

- [ ] Public Figma link when available  

- [ ] Real usability quotes / App Store shots when ready  

---

## Admin upload export (ready to upload)

| File | Purpose |
|------|---------|
| [`exports/habiganize-case-study-upload.json`](./exports/habiganize-case-study-upload.json) | Full Habiganize project for Admin → Work → **Upload JSON / TXT** |
| [`exports/README-habiganize-upload.md`](./exports/README-habiganize-upload.md) | Upload steps + See more visibility legend |

**See more (do not strip):** one `sections[]` with `visibility`:

- `"always"` → **8** default skim sections  
- `"detail"` → **14** shown only after **See more detail**

Regenerate anytime: `node scripts/export-habiganize-upload.mjs`

---

## Quick paste for a new agent



```

Continue Habiganize in H:\My Portfolio_W2026\Lennaipdate.

Read Habitganizer_casestudy_progress.md (this deploy note) first.

Do not deploy until user says so.

See more: visibility always|detail on sections[] (8 skim + 14 detail-only).

Pending deploy: See more scrolls to page top (case-study.tsx), not end.

Admin upload file: exports/habiganize-case-study-upload.json

Regenerate export: node scripts/export-habiganize-upload.mjs

Local: pnpm dev → /work/habiganize

```



---



*End of deploy note.*

