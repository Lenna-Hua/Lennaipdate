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
