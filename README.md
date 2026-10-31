# Lenna Portfolio — Vercel Standalone

A self-contained Vite + React portfolio site with Vercel Serverless Functions for the API and PostgreSQL for persistence. Ready to deploy to Vercel with no monorepo tooling required.

---

## Local Development

### 1. Clone and install

```bash
git clone <your-repo-url>
cd <repo-name>
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values (see the file for descriptions of each variable).

For local dev you need at minimum:
- `DATABASE_URL` — a Postgres connection string (Neon free tier works great)
- `ADMIN_PASSWORD` — any string 8+ chars
- `ADMIN_TOKEN_SECRET` — any random string 8+ chars

To enable image uploads locally (and required on Vercel):
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — all three must be set together

### 3. Run the dev server

```bash
npm run dev
```

The frontend runs at http://localhost:5173. For the API functions to work locally you'll need the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel dev
```

`vercel dev` runs both the Vite frontend and the serverless functions at http://localhost:3000.

---

## Deploying to Vercel

### 1. Provision a Postgres database

Use any Postgres provider that gives you a `DATABASE_URL`:
- **Neon** (recommended free tier): https://neon.tech
- **Supabase**: https://supabase.com
- **Vercel Postgres**: In your Vercel project dashboard → Storage → Create Database

### 2. Set up Cloudinary for image storage

Images and other assets are stored in Cloudinary (required on Vercel where the local filesystem is ephemeral):

1. Create a free account at https://cloudinary.com
2. Go to your Dashboard to find your **Cloud Name**, **API Key**, and **API Secret**
3. Add all three as environment variables (see step 4 below)

### 3. Connect your repo to Vercel

1. Push this directory to a GitHub repository
2. Go to https://vercel.com → Add New Project → Import your repo
3. Vercel will auto-detect Vite — the defaults are correct (output dir: `dist`)

### 4. Add environment variables in Vercel

In your Vercel project → Settings → Environment Variables, add:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `ADMIN_PASSWORD` | Yes | Min 8 chars — protects the /admin panel |
| `ADMIN_TOKEN_SECRET` | Yes | Min 8 chars — signs admin session tokens |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name for asset storage |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `RESEND_API_KEY` | No | Enables email notifications from contact form |
| `CONTACT_TO_EMAIL` | No | Override contact-form recipient email |
| `CASE_STUDY_PASSWORD` | No | Shared password for case studies marked "Password protect" in Admin. A case study with its own custom password ignores it. Changing it signs out every visitor who unlocked with the old one. |

### 5. Deploy

Click **Deploy** in Vercel or push to your main branch. The database tables are created automatically on first API request.

---

## Migrating existing assets

If you have uploaded assets in the Replit environment, you'll need to re-upload them through the Admin panel after deploying. The database content (text, projects, etc.) is migrated by re-saving each section in the Admin → Content editor.

---

## Architecture

- **Frontend**: Vite + React, Tailwind v4, shadcn/ui, framer-motion, wouter
- **API**: Vercel Serverless Functions (Node.js) under `api/`
- **Database**: PostgreSQL — tables are auto-created on first run
- **Assets**: Cloudinary — images/videos stored and served from Cloudinary CDN
- **Resume**: stored via asset API and served at `/api/files/resume.pdf`
- **Admin auth**: HMAC-signed tokens (30-day expiry, no sessions needed)
