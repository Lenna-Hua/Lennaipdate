import { put } from "@vercel/blob";
import { query } from "./db.js";

const RESUME_BLOB_KEY = "resume/Lenna_Hua_Resume.pdf";
const RESUME_DB_SECTION = "files_blob_resume";
/** The blob is private; browsers must go through this proxy route. */
export const RESUME_PUBLIC_PATH = "/api/files/resume.pdf";
/** Uploads are base64 JSON, and Vercel caps request bodies at 4.5 MB. */
export const RESUME_MAX_BYTES = 3 * 1024 * 1024;

export type StoredResume = {
  url: string;
  filename: string;
  updatedAt: string;
};

export async function saveResume(buf: Buffer, userFilename: string): Promise<StoredResume> {
  const blob = await put(RESUME_BLOB_KEY, buf, {
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });
  const updatedAt = new Date().toISOString();
  await query(
    `INSERT INTO content_sections (name, data, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [RESUME_DB_SECTION, JSON.stringify({ filename: userFilename, url: blob.url, updatedAt })],
  );
  return { url: RESUME_PUBLIC_PATH, filename: userFilename, updatedAt };
}

export type ResumeBlob = {
  buffer: Buffer;
  contentType: string;
  filename: string;
} | null;

export async function readResumeBlob(): Promise<ResumeBlob> {
  try {
    const rows = await query<{ data: { filename?: string; url?: string } }>(
      "SELECT data FROM content_sections WHERE name = $1",
      [RESUME_DB_SECTION],
    );
    if (rows.length === 0 || !rows[0]?.data?.url) return null;
    const { url, filename = "Lenna_Hua_Resume.pdf" } = rows[0].data;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(url!, {
      headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : undefined,
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: "application/pdf",
      filename,
    };
  } catch {
    return null;
  }
}
