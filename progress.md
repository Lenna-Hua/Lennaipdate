# Deployment + Admin Save Progress

## 2026-05-27 Incident Timeline
- Initial deploys failed due to missing Vite output configuration / older project output settings mismatch; deployment config was corrected.
- Admin save then failed with `FUNCTION_PAYLOAD_TOO_LARGE` on `gallery`; save flow was moved to section-by-section writes.
- Remaining failure showed one large inline base64 image in `gallery` (`The Third` item), keeping payload too large.
- Added inline media guard and `Migrate Inline Gallery Media` admin action.
- Migration then failed on oversized upload (>4 MB); added automatic inline image optimization before upload.
- Migration then failed with `Unauthorized`; fixed multipart auth handling in `api/admin/assets/index.ts` and added bearer header on multipart client uploads.
- Migration then failed with `Vercel Blob: Cannot use public access on a private store`; switched Blob writes to private mode and updated Blob read paths to authenticated fetches.
- Updated asset URL handling to serve stored Blob assets via `/api/assets/:filename` proxy.
- Re-tested, redeployed, and confirmed admin migration + save flow works.
- Promoted to production and verified aliases on `lennahua.ca` and `www.lennahua.ca`.

## 2026-05-27 — Project Archive + Production Deploy + Final QA

### Feature: Archive projects (hide from public site)
**Goal:** Temporarily hide projects from the public portfolio without deleting them.

**Data model**
- Added optional `archived?: boolean` on each project in the `projects` content section (stored in Postgres like all other project fields).
- New projects default to `archived: false`.
- JSON import in admin supports `"archived": true|false`.

**Admin UI** (`src/pages/admin.tsx`)
- Checkbox on each project: **Archive (hide from public site)**.
- Archived projects show **(archived)** in the sidebar list.
- Visibility filter buttons: **All / Active / Archived**, each with a live count badge.
- Reordering works per filter (reorder within Active or Archived without disturbing the other group).
- Selection stays stable when switching filters (auto-selects first visible project if current selection is hidden).

**Public site** (client-side filter only — API still returns full list for admin)
- `src/pages/home.tsx` — featured work excludes archived projects.
- `src/pages/work/index.tsx` — work grid and project count exclude archived.
- `src/pages/work/case-study.tsx` — archived slugs return “Project not found”; prev/next navigation skips archived projects.

**Files changed**
- `src/pages/admin.tsx`
- `src/pages/home.tsx`
- `src/pages/work/index.tsx`
- `src/pages/work/case-study.tsx`

### Production deployment (archive feature)
- Command: `npx vercel deploy --prod --yes`
- **Deployment ID:** `dpl_6Bq2HQrwmtuLgkQD3CvAvEkphGaJ`
- **Production URL:** `https://lennaipdate-jr7w4jgem-huabichnhu03-oss-projects.vercel.app`
- **Inspect:** `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/6Bq2HQrwmtuLgkQD3CvAvEkphGaJ`
- **Aliases (verified):**
  - `https://lennahua.ca`
  - `https://www.lennahua.ca`
- Pre-deploy: `pnpm typecheck` passed locally.
- Vercel production build: **Ready** (Vite + API functions).

**Note:** This deploy used the local working tree (including uncommitted changes). Git commit/push was not done in this session.

### Final QA (May 27, 2026 — evening)

#### Automated / CLI checks
| Check | Result |
|--------|--------|
| `pnpm typecheck` | Pass |
| `pnpm build` (local Windows) | Fail — missing `@rollup/rollup-win32-x64-msvc` (optional dependency / local env issue; Vercel build succeeds) |
| Production `/api/healthz` | OK — `db: connected`, `storage: vercel-blob` |
| Production `/`, `/work`, `/admin` | HTTP 200 |
| Production `/api/content?meta=1` | HTTP 200 |
| Unauthenticated asset upload | HTTP 401 (expected) |
| Unauthenticated admin content save | HTTP 401 (expected) |

#### Video upload — end-to-end test on production
Tested against `https://www.lennahua.ca`:

1. Admin login via `POST /api/admin/login`
2. Upload `video/mp4` via `POST /api/admin/assets/upload` (multipart + Bearer token)
3. Asset returned as `/api/assets/<filename>.mp4`
4. `HEAD` on served URL → **200**, `Content-Type: video/mp4`

**Result: video upload pipeline works on production.**

Test asset was deleted afterward via admin delete API (cleanup 200).

**Video upload rules (for reference)**
- Supported MIME: `video/*` (admin accepts `mp4`, `webm`, etc.)
- Max file size: **4 MB** (`MAX_ASSET_BYTES` in `api/admin/assets/index.ts`)
- Storage: Vercel Blob (private) when Cloudinary is not configured; served via `/api/assets/:filename` proxy
- UI: project cover upload, asset library, `CoverMedia` component for public cards/case studies
- If upload fails: check file size, MIME type, and admin session (re-login if token expired)

**Re-run video test locally**
```powershell
$env:ADMIN_PASSWORD="your-admin-password"
$env:API_BASE="https://www.lennahua.ca"
node scripts/test-video-upload.mjs
```
Script: `scripts/test-video-upload.mjs`

#### Bug found during QA (fix applied locally — **not yet redeployed**)
**Issue:** `replaceAsset` in `lib/assets-store.ts` passed the **proxied** client URL (`/api/assets/...`) to `replaceStoredAsset`, which needs the **raw Blob URL** for `del()`. This could break replacing videos/images in the asset library.

**Fix:** Use `row.url` (raw DB value) for `replaceStoredAsset`, keep `toAsset(row)` only for client-facing fields.

**To ship fix:** `npx vercel deploy --prod --yes`

#### Manual UI checklist (recommended after changes)
1. Admin → Projects → archive a project → **Save to Site** → confirm it disappears from `/work`.
2. Admin → Projects → cover → upload a short `.mp4` under 4 MB → confirm preview plays.
3. Save project → open case study on public site → confirm cover video autoplays (muted loop).
4. Admin → Projects → filter **Archived** → confirm count badges and list match.

---

## Current Status (June 1, 2026 — extended)
- Production is live and healthy.
- Production domain: `https://lennahua.ca` and `https://www.lennahua.ca`.
- Admin save flow is stable (section-by-section writes, private Blob, proxied asset URLs).
- Gallery migration + save path works against private Blob configuration.
- **Project archive** is live on production (hide from public, keep in admin).
- **Video upload** verified working on production (≤ 4 MB, `video/mp4` tested).
- **`replaceAsset` URL fix** deployed to production.
- **Vercel compliance audit completed** — all critical and warning issues resolved:
  - Added `pg`, `cloudinary`, `resend` to root package.json dependencies
  - Removed Windows-specific native packages (`@rollup/rollup-win32-x64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`, `lightningcss-win32-x64-msvc`)
  - Removed unused Replit Vite plugins
  - Added `.nvmrc` pinning Node 22 (required for `import ... with { type: "json" }` syntax)
  - Updated deprecated `api.bodyParser` config to flat `bodyParser` format
  - Added `maxDuration` config to all API routes
  - Cleaned up `pnpm-workspace.yaml` (removed Replit catalog entries, trimmed workspace packages)
- **0 npm audit vulnerabilities** — all 12 fixed via pnpm overrides (`minimatch`, `undici`, `smol-toml`, `ajv`)
- **PinterestCard redesigned** — modern glassmorphism with ombre gradient grain, glow effects, grain texture overlay
- **Admin preflight check panel** — scans all content sections for:
  - Per-section payload sizes with 3.5 MB warn threshold (Vercel limit ~4.5 MB)
  - Inline base64 media across gallery AND projects (not just gallery)
  - Storage backend detection (Cloudinary vs Vercel Blob)
  - All-clear / issues-found status indicator
- **Migration dry-run mode** — previews which gallery inline media files would be migrated without uploading, showing file names and sizes
- **Lockfile cleanup** — switched `--no-frozen-lockfile` to `--frozen-lockfile` in vercel.json (lockfile regenerated and cross-platform compatible)

## Latest Deployments
- **Comprehensive review: security, accessibility, performance, bugs (June 1, 2026)**
  - URL: `https://lennaipdate-i0n91c9kv-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/G17ukLj5MGRrMzPjUCBRi4GkL53t`
  - Aliases: `https://lennahua.ca`, `https://www.lennahua.ca`
  - 24 files changed: security hardening, a11y focus traps, reduced-motion, lazy admin, memoization
- **Preflight panel + dry-run migration + frozen-lockfile (June 1, 2026)**
  - URL: `https://lennaipdate-m2p4zr0pf-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/FxPH4oU8NVdL1zYPem9P26eHUpEC`
  - Aliases: `https://lennahua.ca`, `https://www.lennahua.ca`
- **PinterestCard glassmorphism redesign (June 1, 2026)**
  - URL: `https://lennaipdate-ih23cj3k9-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/9SJCDfqcQDG3qxQsTrBPxCvQFSXk`
  - Aliases: `https://lennahua.ca`, `https://www.lennahua.ca`
- **Vulnerability fixes + audit deploy (June 1, 2026)**
  - URL: `https://lennaipdate-6ekd4qiqv-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/4BHzxu59mo6bPz2dg3U6h1kbGBcX`
- **Build fix + replaceAsset deploy (June 1, 2026)**
  - URL: `https://lennaipdate-ddf092q0o-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/2uXuAsXeGML9XcmQABgHCToN19Ub`
- **Archive feature production deploy (May 27, 2026)**
  - URL: `https://lennaipdate-jr7w4jgem-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/6Bq2HQrwmtuLgkQD3CvAvEkphGaJ`

## Architecture Notes
- Live content is stored in Postgres (`DATABASE_URL`) via `api/admin/content` and `lib/content-store.ts`.
- Assets are stored via Cloudinary (if configured) or Vercel Blob fallback.
- Seed JSON files in `src/data` are fallback/bootstrap data, not primary storage.
- Current Blob store is configured as **private** access.
- **Archived projects:** stored in DB with `archived: true`; filtered on the client for public pages only (admin still loads full `projects` section).

## Important Changes Already Made
- Added `vercel.json` with Vite output config and compatibility rewrites.
- Added `.vercelignore` to exclude backup/export/artifact folders from deployments.
- Consolidated API routes to reduce serverless function count.
- Added better admin save error visibility.
- Added DB-aware `api/healthz`.
- Added `api/content?meta=1` and periodic client refresh in `src/lib/use-content.tsx`.
- Admin now saves content section-by-section (`/api/admin/content?section=...`) to reduce request payload size.
- Added inline-media detection for gallery before save to block hidden base64 payloads with actionable messages.
- Added `Migrate Inline Gallery Media` admin action to upload inline `data:` media and rewrite to hosted URLs.
- Migration now auto-optimizes oversized inline images before upload to fit the asset upload limit.
- Fixed admin asset upload auth path:
  - `api/admin/assets/index.ts` now authenticates multipart requests correctly.
  - client multipart uploads include `Authorization: Bearer <token>`.
- Updated storage adapter for private Blob stores:
  - `lib/asset-storage-adapter.ts` writes Blob objects with `access: "private"`.
  - `api/assets/[filename].ts` reads private Blob with `BLOB_READ_WRITE_TOKEN`.
  - `lib/assets-store.ts` returns proxied client URLs (`/api/assets/:filename`) for stored blob URLs.
  - `lib/resume-storage.ts` aligned to private Blob writes and token-authenticated reads.
- **Project archive** (May 27, 2026):
  - `archived` flag on projects; admin checkbox + All/Active/Archived filters with counts.
  - Public pages hide archived projects; direct case-study URLs for archived slugs show not found.
- **Asset replace fix** (local, pending deploy):
  - `lib/assets-store.ts` — `replaceAsset` uses raw Blob URL for storage delete/replace.

## Validation Completed
1. Verified preview deploys repeatedly after each patch.
2. Verified typecheck passes after archive + QA changes.
3. Verified admin migration button appears in latest preview.
4. Verified error progression and root causes from real UI reports:
   - `FUNCTION_PAYLOAD_TOO_LARGE`
   - migration upload `Unauthorized`
   - Blob private/public mismatch
5. Verified production deployment reached `Ready` (archive deploy).
6. Verified production aliases include `lennahua.ca` and `www.lennahua.ca`.
7. Verified production video upload: login → upload mp4 → serve via `/api/assets/...` with `video/mp4`.
8. Verified archive feature deployed to production aliases.

## If Save Still Fails
- Capture exact error text shown in admin UI.
- Check Vercel logs for:
  - `POST /api/admin/content`
  - `POST /api/admin/assets`
- Most likely causes:
  - Missing/invalid env vars (`DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`)
  - Missing/invalid storage/env setup (`BLOB_READ_WRITE_TOKEN`, or incomplete Cloudinary envs)
  - Residual inline base64 media in gallery payload

## If Video Upload Fails
- Files over **4 MB** upload straight from the browser to Vercel Blob (`?op=client-token` then `?op=register` on `/api/admin/assets`) because Vercel Functions reject request bodies over ~4.5 MB with **413**. Videos are capped at **100 MB**, images at **4 MB**.
- `413` on upload → the client is still on the old function-only path; hard-refresh admin after deploy.
- Direct upload blocked in the console → `connect-src` in `vercel.json` must include `https://vercel.com`.
- Replacing an existing asset still goes through the function → max **4 MB**; upload larger files as a new asset.
- Unsupported type → use `mp4` or `webm`.
- `Unauthorized` → log out and back into admin (refresh Bearer token).
- Preview works in admin but not on site → **Save to Site** after setting cover URL.
- Check Vercel logs: `POST /api/admin/assets` or `/api/admin/assets/upload` (rewrites to same handler).

## Next Technical Mitigation (if needed)
- ~~Add a preflight check panel in admin~~ ✓ Done
- ~~Add a migration dry-run mode~~ ✓ Done
- Add telemetry/log correlation IDs to admin save + migration requests for faster incident tracing.
- Push all local commits to origin/main.
- 15 commits ahead of origin/main (as of June 2, 2026).
- ~~Switch `--no-frozen-lockfile` to `--frozen-lockfile`~~ ✓ Done

---

## Project Cards Redesign (June 2, 2026)
- **Interactive showcase style** — image fills the entire card, text reveals on hover
- Removed glassmorphism, ombre gradients, grain texture, outer glow blur
- Bottom gradient overlay intensifies on hover
- Top badges (type + year) always visible with backdrop-blur
- Title peeks at bottom, description + tags slide up on hover/focus
- **Mixed/variable sizing** — featured projects span 2 columns (16:10), regular cards 4:5
- Focus-visible support for keyboard navigation
- Reduced-motion: content always visible, no transitions
- Removed framer-motion dependency from card (CSS transitions only)
- Files: `PinterestCard.tsx`, `work/index.tsx`, `home.tsx`

## Admin Refactor (June 2, 2026)
- **admin.tsx: 1806 → 1149 lines** (36% reduction)
- Extracted 14 modular components into `src/components/admin/`:
  - `types.ts`, `shared.tsx`, `TagsManager.tsx`, `ProjectEditor.tsx`
  - `GalleryEditor.tsx`, `MessageInbox.tsx`, `PreflightCheck.tsx`, `AssetLibrary.tsx`
  - `AboutEditor.tsx`, `ExperienceEditor.tsx`, `EducationEditor.tsx`
  - `IdentityContactEditor.tsx`, `FilesEditor.tsx`, `HomepageEditor.tsx`
- Cleaned up unused imports in admin.tsx

---

## Project Review + Fixes (June 1, 2026 — comprehensive audit)

### Security Fixes
- **Removed token from query strings** — admin tokens no longer accepted via `?token=...` (was leaking in server logs, browser history, referrer headers)
- **Removed raw password fallback** — `isAdminRequest` no longer accepts raw password on every admin API request; only the login endpoint verifies passwords
- **Fixed LIKE pattern injection** — escaped `%` and `_` wildcards in `api/assets/[filename].ts` SQL queries
- **Added rate limiting** — contact form now has in-memory rate limiter (5 requests/IP/minute)

### Critical Bug Fixes
- **Fixed viewport meta** — removed `maximum-scale=1` that blocked user zoom (WCAG 1.4.4 failure)
- **Improved admin save error messages** — partial save failures now show which sections were already committed
- **Fixed studio detail prev/next** — now only navigates among `kind: "big"` items (small artworks use modal)
- **Fixed shallow merge in loadDraft** — admin draft loading now does per-section deep merge to preserve new default fields
- **Fixed nested `<a>` links** — removed `<Link>` wrapper from PinterestCard (card already renders as `<a>`)

### Accessibility Hardening
- **Added focus traps** to lightbox, ArtworkModal, and mobile menu overlay
- **Added `role="dialog"` and `aria-modal="true"`** to all modals and overlays
- **Added `prefers-reduced-motion` support** — CSS media query disables all animations, PageTransition respects `useReducedMotion()`
- **Fixed entry page semantics** — added `<main>` landmark, visually hidden `<h1>`, skip link
- **Added `aria-label` to Navbar `<nav>`**
- **Added `aria-live` region** to work page filter (announces result count to screen readers)
- **Added `aria-hidden`** to all decorative divs in PinterestCard
- **Fixed heading hierarchy** — case study sections now use `<h2>` instead of `<h3>` (was skipping h1 → h3)
- **Added required field indicators** — contact form labels now show asterisk with sr-only "(required)"
- **Added `aria-label` to CoverMedia video elements**
- **Fixed color contrast** — added `BRAND_TEXT` variants for text on light backgrounds (WCAG AA compliant)
- **Default `loading="lazy"` on CoverMedia** — images now lazy load by default

### Performance Optimizations
- **Lazy loaded admin page** — `React.lazy()` + `Suspense` splits admin from public bundle
- **Fixed CustomCursor re-renders** — now uses refs + `requestAnimationFrame` instead of `useState`
- **Removed dead dependencies** — `@tanstack/react-query`, `date-fns`, `react-icons` removed from package.json
- **Added manual chunks** — vite.config.ts now splits `vendor-react`, `vendor-motion`, `vendor-icons`
- **Memoized PinterestCard** — wrapped in `React.memo`
- **Memoized computed values** — `featuredProjects`, `splitName`, `buildStats`, filtered lists all use `useMemo`
- **Fixed O(n²) findIndex** — work/index.tsx and home.tsx now use pre-computed `Map` for project index lookups
- **Removed unused QueryClientProvider** — React Query was installed but never used

### Files Changed (24 files)
- `api/admin/assets/index.ts` — removed query string token
- `api/admin/content/index.ts` — removed query string token
- `api/admin/messages.ts` — removed query string token
- `api/assets/[filename].ts` — escaped LIKE wildcards
- `api/contact.ts` — added rate limiting
- `index.html` — removed maximum-scale=1
- `lib/admin-auth.ts` — removed raw password fallback
- `package.json` — removed dead dependencies
- `src/App.tsx` — lazy admin, fixed CustomCursor, removed React Query
- `src/components/CoverMedia.tsx` — added lazy loading default, aria-label on video
- `src/components/PinterestCard.tsx` — wrapped in memo, added aria-hidden
- `src/components/layout/Navbar.tsx` — added focus trap, aria-label, refs
- `src/components/layout/PageTransition.tsx` — added reduced motion support
- `src/index.css` — added prefers-reduced-motion media query
- `src/lib/brand.ts` — added BRAND_TEXT for accessible text colors
- `src/pages/admin.tsx` — fixed loadDraft merge, improved save error messages
- `src/pages/contact.tsx` — added required field indicators
- `src/pages/entry.tsx` — added main landmark, h1, skip link
- `src/pages/home.tsx` — memoized values, fixed findIndex, fixed contrast
- `src/pages/studio-detail.tsx` — fixed prev/next to only navigate big items
- `src/pages/studio.tsx` — added focus trap to ArtworkModal
- `src/pages/work/case-study.tsx` — added focus trap, fixed heading hierarchy
- `src/pages/work/index.tsx` — memoized values, fixed findIndex, added aria-live, fixed contrast
- `vite.config.ts` — added manual chunks for code splitting

---

## Editorial UI Redesign — huyml.co-inspired (Oct 31, 2026)

### Goal
Change the public site's UI, layout, interaction structure and display to feel close to
[huyml.co/playground](https://huyml.co/playground), while keeping **admin and all site functions unchanged**.
Inspiration only — no code, images, fonts or copy copied from huyml.co (that site is built in Framer).

### Reference analysis (huyml.co)
- Light grey background (#ECECEC), near-black type, square corners, lots of whitespace.
- Fonts: BT Grotesk + BT Glyphius (paid, Burntype), F37 Bolton (trial). Not used here — we keep the admin-chosen fonts.
- Fixed chrome: vertical "HUYML©" wordmark on the left edge; text menu (WORK / ABOUT / → PLAYGROUND / CONTACT, arrow marks the current page); audio toggle; live local clock ("HCMC, 15:26"); "For inquiries" email.
- Intro curtain: black screen showing the page name, then lifts away.
- Playground page: sticky left column with a giant item counter ("83") + short blurb; right side is a 4-column masonry whose columns scroll at different speeds (parallax); clicking a tile opens a dimmed lightbox with Previous / Next.
- Homepage (one project at a time, "01 /19", colour swatches): **rejected by Lenna — not used.**

### Decisions
| Topic | Decision |
|---|---|
| Workflow | Branch `redesign/editorial-ui` in the same repo + Vercel preview URL (not a duplicated repo). Merge to `main` when done. |
| Theme | Keep colours and fonts from admin **Appearance** (CSS variables) and the light/dark toggle; only layout + interaction change. |
| Interactions | Intro curtain, parallax masonry + lightbox, clock + email in top bar, Lenis smooth scroll. Not doing: sound effects, huyml-style one-project homepage. |
| Homepage | Same layout as Playground: sticky intro column + parallax masonry of featured work. |

Why not a duplicated repo: the Preview environment already has `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, so a branch preview needs no API/env setup; a separate repo would diverge from `main` and be painful to merge.

### Step 1 — Committed pending work on `main` (local only, not pushed)
- Commit `63dfa6b` — `feat: case study password lock, device mockups, video embeds, studio tabs and admin editor refresh` (60 files, work from earlier sessions that had never been committed since Oct 23):
  - Password-protected case studies + server-side redaction (`CaseStudyLock.tsx`, `lib/case-study-access.ts`, `src/lib/case-study-access.ts`, `lib/project-redaction.ts`, `api/content.ts`, `lib/content-store.ts`, `lib/admin-auth.ts`).
  - Device mockup frames (`DeviceMockup.tsx`, `src/lib/device-mockup.ts`, `MockupSectionEditor.tsx`, `public/mockups/*.png`).
  - YouTube / Vimeo / Instagram embeds (`src/lib/video-embed.ts`), `MediaPrepModal.tsx`, `media-guidelines.ts`, large `CoverMedia.tsx` rewrite.
  - Studio tabs (`StudioTabEditor.tsx`, `gallery-migration.ts`), admin editor refresh (`admin.tsx`, `ProjectEditor.tsx`), plan doc `docs/admin-uxfolio-redesign-plan.md`.
  - CSP in `vercel.json`: **only added** hosts (`img-src` + `https://i.ytimg.com`; `frame-src` + `youtube-nocookie.com`, `player.vimeo.com`, `instagram.com`). No `img-src` host removed (`framerusercontent.com` still present).
- Intentionally **not** committed: `tmp-mockup-preview/` (scratch screenshots/tsconfigs), `docs/matt-pocock-skills-guide.md` (personal notes).
- ⚠️ Pushing `main` deploys these features to production — test them on localhost / the preview first.

### Step 2 — Redesign on branch `redesign/editorial-ui` (commit `fa07afd`, pushed)
**New files**
- `src/components/layout/SiteChrome.tsx` — replaces `Navbar` + `BottomNav`. Desktop: vertical wordmark rail (identity name + role/year), top bar with text menu (→ marks active), Theme switch (Light/Dark), "Based in {city}" live clock, "For inquiries" email. Mobile: compact bar + full-screen "Menu" overlay with focus trap, Esc to close, scroll lock.
- `src/components/layout/IntroCurtain.tsx` — first-visit curtain showing the landing section name (Home/Work/Studio/About…), once per session (`sessionStorage` key `lenna-intro-seen`); skipped on `/admin` and for reduced-motion users.
- `src/lib/smooth-scroll.tsx` — Lenis provider (`SmoothScroll`, `useLenis`, `scrollPageTo`, `useScrollLock`). Disabled on `/admin` and for reduced motion; `allowNestedScroll` + `prevent` for dialogs / `[data-lenis-prevent]`.
- `src/components/ParallaxMasonry.tsx` — 2 / 3 / 4 columns (mobile / ≥768px / ≥1280px), round-robin distribution, column drift `[0, -220, -80, -320]px` driven by page `scrollY` over the grid's height (columns aligned at load). Hover reveals title + meta (always visible on touch). Items with `href` navigate; others call `onOpen` (lightbox). Drift off in lite/reduced motion.
- `src/components/MediaLightbox.tsx` — portalled to `document.body` (must sit above SiteChrome); Previous / Next, ←/→/Esc keys, focus returns on close, scroll lock, "03 / 06" counter, optional "All images →" link, supports image / video / embeds.
- `src/components/layout/SplitShowcase.tsx` — sticky intro column + content column, `BigCount` (giant counter in `--primary`), `TextLink`.

**Changed files**
- `src/App.tsx` — `WithLayout` uses `SiteChrome`; removed `Navbar`, `BottomNav`, `Y2KBackdrop`, `CustomCursor`; wrapped routes in `SmoothScroll`; added `IntroCurtain`; `ScrollManager` scrolls via Lenis (`scrollPageTo`). Grain overlay kept.
- `src/components/layout/PageTransition.tsx` — padding moved to `WithLayout`, max width 1800px.
- `src/index.css` — `--rail-w: 4.5rem`, `--chrome-h: 4rem` (mobile) / `9.5rem` (≥768px).
- `src/pages/home.tsx` — sticky column (eyebrow, name, count of featured work + "Selected Work" label, intro, stats, CTA links) + masonry. Grid = hero media (if set) → featured projects (→ case study) → featured studio "big" items → small artworks (→ lightbox, only when "Show studio band" is on). About block below.
- `src/pages/studio.tsx` — sticky column (eyebrow, heading, artwork count, intro, blurb) + masonry of small artworks + lightbox; Play / KernGame section kept below; "Show grid" background kept.
- `package.json` / `pnpm-lock.yaml` — added `lenis@^1.3.27` (pnpm also pruned stale lock entries).

**Admin fields still driving the public UI**
Homepage: eyebrow, intro, hero media/alt/mime, primary/secondary CTA, Selected Work heading + link label, Show studio band, Studio link label, About eyebrow/heading/CTA. Studio: eyebrow, heading, intro, artworks heading/eyebrow/blurb, Show grid, Show play + play copy. Projects `featured` / `archived`, gallery `kind` / `archived` / `featured`. Appearance fonts + theme.

**Removed / no longer has effect**
- Bottom nav, Y2K backdrop, custom cursor, rotating "VIEW WORK" badge, hero stat pills, FloatingDecor/StudioDecor on Home/Studio (component files still exist — easy to restore).
- Admin Studio toggles **Show decor** and **artworks card size** no longer change anything.
- Homepage now shows **all** featured projects (previous limit of 6 removed).
- Studio artworks blurb copy still says "Scroll horizontally…" in the live DB — update it in admin (seed/fallback defaults were changed in Step 3).
- Clock time zone is hard-coded to `America/Toronto` (`TIME_ZONE` in `SiteChrome.tsx`).

### Verification
- `pnpm build` passes.
- Real typecheck (see note below) — no errors in new code.
- Localhost checks: desktop 1440px + mobile 390px, no horizontal overflow; intro curtain shows and lifts; lightbox opens, ←/→ step, Esc closes, Lenis stops while open; `/admin` loads with no chrome, no Lenis, no intro.
- 3 artworks ("Spatial Campaign Mockup", "Editorial Layout Study", "Animation Still") show the dino fallback **on localhost only** — their covers are `/api/assets/...`, which only Vercel serves.
- Work, About and case-study pages render inside the new chrome but still use the old visual style. → Done in Step 3.

### Step 3 — Restyled the remaining pages (Oct 31, 2026, uncommitted)
Started by merging `main` into the branch (`cacf867`, no conflicts); `pnpm typecheck` + `pnpm build` passed before any edits.

Shared language for every page: square corners, ruled sections (`border-t`), small uppercase labels on the left, big black display headings, underlined text links, outline buttons; colours only from theme tokens (`foreground`, `muted-foreground`, `primary`, `border`, `muted`) so admin **Appearance** + Light/Dark keep working. The hard-coded `#1F67F1` / BRAND colours are gone from these pages.

**New shared pieces** (`src/components/layout/SplitShowcase.tsx`)
- `SPLIT_COLUMNS` (left column width used everywhere so edges line up), `Eyebrow` (small label, `tone="primary"` option), `EditorialSection` (ruled section: label + heading left, content right; optional sticky left column), `ArrowOption` (text toggle with the same "→ marks the current one" as the menu, optional count), `TextLink` gained `external` / `download`, `TEXT_LINK_CLASS` exported.

**Pages / components**
- `src/pages/work/index.tsx` — `SplitShowcase`: sticky column with "Work", big count of the filtered projects, filters as an arrow text menu with per-filter counts, **Grid / Index** view switch (saved in `localStorage` key `work-view`; replaces the old 1/2/3-columns switch `work-columns`). Grid = 2-column editorial tiles (number, title, year, type, description; horizontal `cardLayout` still spans 2 columns). Index = numbered rows (title, type, year) with a cover preview that follows the cursor (desktop only). Kept: filters + `aria-live`, hover video (650 ms delay), "hover" cover playback + play badge, Protected badge, gallery "big" items not yet migrated, logo marquee. Removed: cursor-following decorative icons.
- `src/pages/work/case-study.tsx` — presentation only; data loading, password lock, skim/full detail, mockups, embeds, video sections, row grouping unchanged.
  - Hero on the split grid: left = "← All work", "Case study 05 / 08", meta list (Role, Users, Methods, Year/Period, Disciplines), author line + socials as text links; right = big uppercase title, subtitle, bullets, **"View live site ↗"** outline button (replaces the fixed rotating `RotatingLiveBadge`, same `liveUrl`).
  - Cover + media blocks: no rounded corners; "Expand" hint; cover play/sound controls restyled.
  - Contents list: sticky left column, numbered rows, `→` on the active section; clicking scrolls through Lenis (`scrollPageTo`). `[id^="cs-"]` sections get `scroll-margin-top: calc(var(--chrome-h) + 1rem)` in `index.css` so the top bar never covers a heading (Lenis honours scroll-margin).
  - Text blocks: ruled heading, large summary, "—" bullet lists; Problem / Solution as two ruled columns (Solution rule in primary); fallback Overview / Impact restyled the same way.
  - Image lightbox (zoom, focus trap, Esc kept) now uses the theme backdrop and text buttons like `MediaLightbox`; uses `useScrollLock` (stops Lenis) instead of `body.style.overflow`.
  - "See more detail" / "Show less" + CTA links as outline buttons; Previous / Next as a large "Keep reading" pager; loading / error / not-found states restyled.
- `src/components/CaseStudyLock.tsx` — same split layout as the case study; underline password field, outline Unlock button. Logic unchanged.
- `src/pages/about.tsx` — Intro (sticky "About" + portrait left; lead paragraph large, other paragraphs in 2 columns, stats, "Download resume ↓", "Get in touch →" which scrolls to `#contact` via Lenis). Capabilities, Experience (sticky label, period | role / company / bullets rows — replaces the stacked sticky cards), Community & Volunteer (cards with thumbnail switcher kept), Education (rows with GPA + honors) — all `EditorialSection`. Removed `FloatingDecor` here.
- `src/components/ContactSection.tsx` — `EditorialSection` "Let's Talk" with availability dot; info as label/value rows (Inquiries, Phone, Location, Elsewhere); underline form fields, outline "Send message" button. `/api/contact` call, statuses, privacy link unchanged; still `id="contact"` (`/contact` redirect works).
- `src/components/layout/Footer.tsx` — big "For inquiries" email, name + role + tagline, Menu / Contact / Elsewhere columns, baseline with © + Privacy + Terms + **Back to top ↑** (Lenis).
- `src/pages/studio-detail.tsx` — same split hero as case studies (meta list, big title, description, outline link button); cover + images open the shared **`MediaLightbox`** (portalled, Previous / Next across cover + all images, counter); "Keep browsing" pager. Redirect-to-Work logic unchanged.
- `src/components/LogoMarquee.tsx` — bleed margins match the new page padding (`-mx-5 md:-mx-8`), ruled top, small label.
- Seed / fallback copy: `artworksBlurb` default no longer says "Scroll horizontally" (`src/data/studio.json`, `lib/data/studio.json`, `src/lib/studio-content.ts`).

**No longer used by public pages** (files kept): `PinterestCard` component (only `cardSpanClass` + its type are still imported), `RotatingLiveBadge`, `FloatingDecor` (still used by `/preview/visual-redesign`).

**Verification (localhost)**
- `pnpm typecheck` 0 errors; `pnpm build` passes; no unused locals in the edited files.
- Desktop 1024px: Work grid + index (cursor preview appears at the pointer), case study `/work/duolingo-behavior` (hero, sticky contents with active arrow, scroll lands below the top bar), About (intro, experience, education, contact, footer).
- Mobile 390px: `/work`, `/work/duolingo-behavior`, `/about` — no horizontal overflow.
- Localhost-only gaps (same as before): About portrait seed path `/migrated/…jpg` isn't in `public/`, and Studio detail images are `/api/assets/…` → fallbacks, so the Studio-detail lightbox must be checked on the Vercel preview.

### Step 4 — Studied the huyml.co/about illustration + motion prototype (Oct 31, 2026, uncommitted)
**What huyml.co/about does** (inspected live; their `.riv` files were read once for structure and deleted — not used)
- It's a **Rive** animation (`@rive-app/canvas`, WASM, 2D canvas), built in the Rive editor from Figma artwork — not React/CSS.
- Concept: a self-portrait head with its cap popping off, personal objects bursting out (plant, cats, 8-ball, watch, game pad, laptop, noodles, SOTD award); each object matches a red "fact" line beside it; giant faint birth year behind.
- One state machine, 5 layers: idle loop (lid + objects bob/rotate), hover on/off (objects burst further), a click trigger + animation per object, a `mobile inview` state (plays on scroll because touch has no hover), and `hovertext` / `contact` inputs (likely: hovering a fact line triggers its object — inferred from names, not verified).
- Lessons for Lenna's About: an illustration that tells facts instead of a static portrait; three motion tiers (rest → hover → click surprise); text ↔ object linked both ways; a separate scroll-driven mobile behaviour.

**Prototype** — `/preview/fact-burst` (not in the menu), placeholder art + copy
- `src/components/FactBurst.tsx` — generic `FactBurst({ facts: { id, label, Icon }[], backdrop? })`, framer-motion only (no new dependency):
  - Stage = placeholder vessel (open box with a face + floating lid, SVG, theme colours) + items on an arc above it; backdrop word sized to the stage width.
  - Idle: lid and each item float on their own seeded loop (different duration/phase).
  - Hover (mouse): lid pops off to the side, speed lines fan out of the opening, items spread to a wider arc with a stagger, and follow the pointer at different depths (spring parallax).
  - Click an item: bounce/wiggle keyframes. Hover/focus a fact line → its item scales up in `primary`, others dim; hovering an item highlights its line.
  - Touch (`hover: none`): stage opens while ≥55% in view. Reduced motion: no loops, no parallax, instant state changes.
- `src/pages/preview/fact-burst.tsx` — 8 placeholder facts from existing About content with lucide icons; route added in `App.tsx`.
- Verified on localhost: idle, hover-open, linked highlight (desktop 1024px); mobile 390px opens on scroll, no horizontal overflow. `pnpm typecheck` + `pnpm build` pass.
- Open decisions: Lenna's own drawing (portrait + objects, PNG/SVG layers or a Rive file), final fact copy, and whether facts/images move into admin (About).

### Preview deployment
- Branch: `redesign/editorial-ui` @ `fa07afd`
- URL: `https://lennaipdate-e8gt60bid-huabichnhu03-oss-projects.vercel.app` (state READY)
- Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/2J71zRfJtukRBmCaLb7N7mv8XzEc`
- ⚠️ Preview uses the **same `DATABASE_URL` as production** — browse only; do not edit/delete content in the preview's `/admin`. To test admin safely, set a separate Preview `DATABASE_URL` (e.g. a Neon branch).

### Issues found along the way (and fixes)
- **`pnpm typecheck` checked nothing** — `tsconfig.json` has `"files": []`, so it always "passed". Earlier "typecheck passed" notes in this file are not meaningful.
  - ✅ **Fixed on `main` in `9a50310`** — `fix: make typecheck cover src, api and lib and resolve type errors`:
    - New `tsconfig.app.json` (all of `src`, DOM + `vite/client`, `@/` + `@assets/` paths) and `tsconfig.server.json` (`api/**`, `lib/*.ts`, Node types).
    - `typecheck` script is now `tsc -p tsconfig.app.json && tsc -p tsconfig.server.json`.
    - `tsconfig.json` left untouched on purpose — Vercel's `@vercel/node` builder reads it for `api/` functions.
    - Fixed the 20 pre-existing errors: `Variants` typing in `ContactSection.tsx` / `about.tsx`; `useContent(section)` overload without fallback (`use-content.tsx`) for `HrAssistant.tsx`; explicit early return in HrAssistant focus effect; `pickerCallbackRef` in `admin.tsx` now accepts `(url, { mime })`.
    - The real check also caught 3 errors in the old `home.tsx` (`heroMedia*` missing from the seed type) → added empty `heroMedia` / `heroMediaAlt` / `heroMediaMime` to `src/data/homepage.json` (same empty values the admin writes when hero media is cleared). Done in the JSON, not `home.tsx`, so it can't conflict with the redesigned `home.tsx`.
    - `pnpm typecheck` → 0 errors (src + api/lib); `pnpm build` passes.
- **Vercel env vars**
  - ✅ `DATABASE_URL` switched to **Sensitive** via the Vercel API (value and Production + Preview targets unchanged; applies from the next deploy).
  - ⚠️ **Still open — needs Lenna:** production key is misspelled `CASE_STUDY_PASSWOR` (code reads `CASE_STUDY_PASSWORD`). Vercel refuses to rename a Sensitive variable and its value can't be read back, so it must be re-entered by hand:
    1. Vercel → `lennaipdate` → Settings → Environment Variables → **Add** `CASE_STUDY_PASSWORD` (Sensitive, Production + Preview) with the shared case-study password.
    2. Delete `CASE_STUDY_PASSWOR`.
    - CLI alternative: `vercel env add CASE_STUDY_PASSWORD production --sensitive` (and again for `preview`), then `vercel env rm CASE_STUDY_PASSWOR production`.
    - Not urgent for the live site: the password-lock feature is only in `main` locally (not deployed yet). Must be done **before pushing `main`**.

### Conflict check: `main` ↔ `redesign/editorial-ui`
- Trial merge with `git merge-tree --write-tree main redesign/editorial-ui` → **clean, no conflicts** (no commit created).
- Only overlapping file: `package.json` (`main` changed the `typecheck` script, redesign added `lenis`) — auto-merges.
- `main` touches: `package.json`, `ContactSection.tsx`, `HrAssistant.tsx`, `homepage.json`, `use-content.tsx`, `about.tsx`, `admin.tsx`, `tsconfig.app.json`, `tsconfig.server.json`.
- Redesign touches: `package.json`, `pnpm-lock.yaml`, `App.tsx`, `MediaLightbox.tsx`, `ParallaxMasonry.tsx`, `IntroCurtain.tsx`, `PageTransition.tsx`, `SiteChrome.tsx`, `SplitShowcase.tsx`, `index.css`, `smooth-scroll.tsx`, `home.tsx`, `studio.tsx`.

### Production deploy (Oct 31, 2026)
- Pushed `main` (`6626ab9..9a50310`) → Vercel production `dpl_AvC9K1Hz6z64B4skgaUsSsawDWrD` — **READY**.
  - URL: `https://lennaipdate-nqjoaryzc-huabichnhu03-oss-projects.vercel.app`
  - Inspect: `https://vercel.com/huabichnhu03-oss-projects/lennaipdate/AvC9K1Hz6z64B4skgaUsSsawDWrD`
- Post-deploy checks on `https://www.lennahua.ca`:
  - `/api/healthz` → `{"status":"ok"}`.
  - CSP check: `/work/duolingo-behavior` → 11/11 `framerusercontent.com` images loaded, 0 `SafeImage` fallbacks.
  - `/work/best-buy-analysis` shows "Project not found" — expected, it is **archived** in the live DB (also archived: freshii, Quiet-Circle, beaverbuild, ttc, art-creative-gallery, habiganizea).
- Pushed while `CASE_STUDY_PASSWOR` was still misspelled. Safe because the lock fails closed (`"unconfigured"` → stays redacted, never exposed) and no live project has protection turned on yet. Fix the env var before enabling "Password protect" on any case study.

### Step 5 — Restored Backdrop, Grain & Floating Elements (Nov 2, 2026, uncommitted)
- Restored `<Y2KBackdrop />` inside `WithLayout` in `src/App.tsx`:
  - Ambient color orbs (light pastels / dark neon glow) with cursor parallax.
  - Animated drifting grain texture layer (`<feTurbulence>` filter with multiply blend mode).
  - Floating decorative elements drifting in the background (hearts, butterflies, smileys, flowers, lightning, CDs, wireframe, tilted glass tiles, twinkling sparkles).
  - Preserved `calmBackdrop` option for long-reading case study routes (`/work/:slug`, `/work/:slug/full`) so long text remains clean and legible while keeping the ambient orbs and grain.
- Restored section `<FloatingDecor />` (rotating dashed orbital rings, floating dots, sparkle stars) on:
  - `src/pages/home.tsx` (behind SplitShowcase)
  - `src/pages/about.tsx` (inside the profile intro section)
  - `src/pages/studio.tsx` (behind the SplitShowcase, along with `StudioDecor` when enabled)
- Verification: `pnpm typecheck` 0 errors; `pnpm build` passed.

### Git state (Nov 2, 2026)
- `main` @ `9a50310` (on top of `63dfa6b`) — **pushed, live on production**.
- `redesign/editorial-ui` @ `cacf867` (merge of `main` into `fa07afd`) — **local only, not pushed yet**; preview URL above still shows `fa07afd`.
- Uncommitted on the redesign branch: Step 3 page restyles + this `progress.md` (held back until Lenna approves the redesign).
- Untracked: `tmp-mockup-preview/` (scratch tsconfigs/screenshots), `docs/matt-pocock-skills-guide.md` — do not commit.

### Next steps
1. Lenna: re-create `CASE_STUDY_PASSWORD` on Vercel and delete `CASE_STUDY_PASSWOR` (see above).
2. Lenna reviews the restyled Work / case study / About / Studio detail / Footer on localhost (`pnpm dev`) and gives feedback for Home / Studio too.
3. Commit Step 3 on `redesign/editorial-ui`, push → check the new preview (desktop + phone), incl. the Studio-detail lightbox and a Framer-image case study.
4. Update the Studio artworks blurb in admin (production admin — preview shares the DB).
5. When approved: merge `redesign/editorial-ui` → `main`, push, verify production (hard-refresh a Framer-image case study per the CSP rule).
