export type ResumeMeta = { url?: string; filename?: string; updatedAt?: string };

const RESUME_PROXY_PATH = "api/files/resume.pdf";
const BUNDLED_RESUME = "Lenna_Hua_Resume.pdf";

/**
 * Uploaded resumes live in a private Vercel Blob store, so their raw blob URLs
 * return 403 in the browser. They must be served through the
 * `/api/files/resume.pdf` proxy instead.
 */
export function resolveResumeUrl(resume: ResumeMeta | undefined): string {
  const base = import.meta.env.BASE_URL;
  const raw = (resume?.url ?? "").trim();
  if (!raw) return base + BUNDLED_RESUME;

  const isUploaded =
    /\.blob\.vercel-storage\.com\//i.test(raw) || raw.replace(/^\/+/, "").startsWith(RESUME_PROXY_PATH);
  if (isUploaded) {
    const version = Date.parse(resume?.updatedAt ?? "");
    return base + RESUME_PROXY_PATH + (Number.isFinite(version) ? `?v=${version}` : "");
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return base + raw.replace(/^\/+/, "");
}
