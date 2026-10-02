# Habiganize — Admin upload package

## File

[`habiganize-case-study-upload.json`](./habiganize-case-study-upload.json)

## How to upload

1. Open portfolio Admin (e.g. `https://lennahua.ca/admin` or local `/admin`).
2. Go to **Work** → select project **Habiganize** (slug `habiganize`).
3. Click **Upload JSON / TXT** and choose `habiganize-case-study-upload.json`.
4. Confirm details + sections look right (see visibility below).
5. **Save** so Neon DB updates.

> The `_readme` key at the top of the JSON is documentation only. Admin import ignores unknown fields — if anything looks odd, you can delete `_readme` before upload; it is safe either way.

## See more detail (important)

This case study is **two-tier** inside one `sections` array:

| `visibility` | Meaning | Count |
|---|---|---|
| `"always"` | Shown in the default ~5 min skim | **8** |
| `"detail"` | Shown only after **See more detail** | **14** |

### Skim (always)

1. The Problem
2. The Retention Cliff
3. The Bet
4. The Care Loop
5. Core Loop
6. Design & Platform
7. Shipped Product
8. Outcomes

### Extra after See more (detail)

1. The Pitch
2. The 25-Second Version
3. Research & The User
4. The Care Economy
5. Design System in Figma
6. Figma → Production
7. Branded Down to Sign-Up
8. Early Explorations
9. One Product, Four Surfaces
10. Information Architecture
11. Meet the Companions
12. Try It Live
13. Product & Business Decisions
14. Validation & What's Next

Do **not** remove `visibility` from sections when editing — without it, everything shows at once and the See more button may hide.

## Assets (must already be on the site)

Paths in this JSON are relative (e.g. `/case-studies/habiganize/promo.webm`).  
They live in `public/case-studies/habiganize/` in the Lennaipdate repo. Deploy the portfolio (or confirm those files are live) before/after uploading content, or images/video will 404.

## Regenerating this export

```bash
node scripts/export-habiganize-upload.mjs
```
