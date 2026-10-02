# Cotriply — Admin upload package

**Full update guide:** [`HOW-TO-UPDATE-cotriply.md`](./HOW-TO-UPDATE-cotriply.md)

## Files

- [`cotriply-case-study-upload.json`](./cotriply-case-study-upload.json) — import into Admin
- [`../case-study-drafts/cotriply-full-case-study.md`](../case-study-drafts/cotriply-full-case-study.md) — full draft + NDA notes
- Images live in `public/case-studies/cotriply/`

## NDA reminder

Reviewed Lenna’s Cotriply NDA (April 2026). Portfolio visuals are **public cotriply.ai / Ivory Luxe marketing only**. Do not add internal dashboards, customer data, unpublished Figma, or proprietary specs without **written** Client consent. Feature-level internship bullets are resume-level; get a short email OK from Faith before expanding.

## How to upload

1. Open portfolio Admin (e.g. `https://lennahua.ca/admin` or local `/admin`).
2. Go to **Work** → create project **Cotriply** if needed (slug `cotriply`), or select it.
3. Click **Upload JSON / TXT** and choose `cotriply-case-study-upload.json`.
4. Confirm meta + sections look right.
5. Set **cover image** when you have an approved asset.
6. **Save** so Neon DB updates.

> The `_readme` key is documentation only. Admin import ignores unknown fields.

## See more detail

| `visibility` | Meaning | Count |
|---|---|---|
| `"always"` | Default skim | **7** |
| `"detail"` | After **See more detail** | **2** |

### Skim (always)

1. Context  
2. Problem vs. Design Goal  
3. My role  
4. Booking & account workflows  
5. Travel Essentials  
6. Access controls & ops touchpoints  
7. Impact & reflection  

### Extra (detail)

1. Public product snapshot  
2. Visuals to add  

## Assets

Create folder when ready:

```text
public/case-studies/cotriply/
```

Then add `image` sections (or set `coverImage`) pointing at `/case-studies/cotriply/...`. Until then, the case study is text-first so nothing shows as broken.

## Local seed

The project is also seeded in `src/data/projects.json` and `lib/data/projects.json` for local preview at `/work/cotriply`. Prefer Admin **Save to Site** for production Neon sync after upload.
