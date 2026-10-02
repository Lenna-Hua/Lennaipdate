# Cotriply case study — setup & how to update

## What’s already set up

| Piece | Location |
|--------|----------|
| Case study page | `/work/cotriply` |
| Seed data (local) | `src/data/projects.json` + `lib/data/projects.json` |
| Admin upload package | `exports/cotriply-case-study-upload.json` |
| Images | `public/case-studies/cotriply/` |
| Long draft / NDA notes | `case-study-drafts/cotriply-full-case-study.md` |

**Current meta**
- Role: UX & Product Designer (Internship)
- Period: April 2026 · 224 hours
- Featured: yes
- Cover: public cotriply.ai hero
- Visuals: public marketing only (NDA-safe)

---

## 1) Preview locally

```bash
npm run dev
```

Open: http://localhost:5173/work/cotriply  
(or whatever port Vite prints)

---

## 2) Put it live (production / Neon)

Local JSON seed ≠ live site if production reads from Neon Admin DB.

1. Deploy so `public/case-studies/cotriply/*` is on the site (git push → Vercel, or your usual deploy).
2. Open **Admin** → **Work**.
3. Create or select project **Cotriply** (slug must be `cotriply`).
4. **Upload JSON / TXT** → choose `exports/cotriply-case-study-upload.json`.
5. Confirm title, cover, sections look right.
6. **Save** (syncs Neon).
7. Hard-refresh https://www.lennahua.ca/work/cotriply

---

## 3) How to update later

### A. Change text / sections (most common)

1. Edit `exports/cotriply-case-study-upload.json`  
   - Top fields: `title`, `subtitle`, `type`, `period`, `challenge`, `solution`, `impact`, `bullets`, `featured`  
   - Body: `sections[]` (`title`, `body`, `bullets`, `visibility`)
2. Copy the same project object into both:
   - `src/data/projects.json`
   - `lib/data/projects.json`  
   (or ask Cursor: “sync cotriply upload JSON into projects.json”)
3. Re-upload JSON in Admin → **Save**.

`visibility`:
- `"always"` = default skim
- `"detail"` = only after **See more detail**

### B. Change / add images

1. Drop files in `public/case-studies/cotriply/`  
   Example: `my-flowchart.png`
2. Reference as `/case-studies/cotriply/my-flowchart.png`
3. Either:
   - set `coverImage`, or
   - add an `image` section:

```json
{
  "id": "flow-diagram",
  "type": "image",
  "visibility": "always",
  "src": "/case-studies/cotriply/my-flowchart.png",
  "title": "Permission model",
  "caption": "Participant read-only vs admin edit — portfolio diagram (not product UI)."
}
```

4. Deploy assets, then Admin upload + Save if content JSON changed.

**NDA:** only public site shots or your own redrawn diagrams unless Faith approves logged-in screens in writing.

### C. Toggle featured / archive

In the JSON (or Admin UI):
- `"featured": true` → can show on home (top featured slots)
- `"archived": true` → hides from main work list

### D. Safe things you can add anytime

- Redrawn flowcharts (booking steps, participant vs admin)
- Public cotriply.ai screenshots
- Caption tweaks, reflection wording
- Link stays: https://cotriply.ai/

### E. Don’t add without written OK

- Logged-in product screenshots
- Internal Figma of unpublished UI
- Customer / trip data

---

## Quick checklist

- [ ] Local preview `/work/cotriply` looks good  
- [ ] Assets committed + deployed  
- [ ] Admin JSON uploaded + Saved  
- [ ] Live page hard-refreshed  
- [ ] Optional: Faith email OK if you later add product screens  
