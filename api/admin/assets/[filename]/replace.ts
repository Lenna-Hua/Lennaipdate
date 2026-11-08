import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs";
import { isAdminRequest } from "../../../../lib/admin-auth.js";
import { handleCors } from "../../../../lib/cors.js";
import { removeAsset, renameAsset, replaceAsset } from "../../../../lib/assets-store.js";
import {
  MAX_VIDEO_ASSET_BYTES,
  maxAssetBytesForMime,
  formatMaxMb,
} from "../../../../lib/asset-limits.js";

export const config = { bodyParser: false, maxDuration: 30 };

const isAllowedAssetMime = (mime: string): boolean =>
  mime.startsWith("image/") || mime.startsWith("video/");

const intField = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return null;
};

type MultipartFields = Record<string, string | string[] | undefined>;
type MultipartFile = {
  mimetype?: string;
  size?: number;
  filepath: string;
  originalFilename?: string | null;
};
type MultipartFiles = Record<string, MultipartFile | MultipartFile[] | undefined>;

function parseMultipart(req: VercelRequest): Promise<{
  fields: MultipartFields;
  files: MultipartFiles;
}> {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: MAX_VIDEO_ASSET_BYTES });
    form.parse(req as unknown as Parameters<typeof form.parse>[0], (err: unknown, fields: unknown, files: unknown) => {
      if (err) reject(err);
      else resolve({ fields: fields as MultipartFields, files: files as MultipartFiles });
    });
  });
}

function firstStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  const raw = await readRawBody(req);
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  // Read Authorization header early — before any body parsing — so we can reject
  // unauthenticated multipart uploads without writing temp files to disk.
  // The token may also be embedded in multipart fields (legacy path), which is
  // checked again below after parsing if no header token was supplied.
  const headerToken = typeof req.headers["authorization"] === "string" &&
    req.headers["authorization"].startsWith("Bearer ")
    ? req.headers["authorization"].slice(7)
    : undefined;
  if (headerToken !== undefined && !isAdminRequest({ token: headerToken })) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = req.query["filename"] as string;
  const action = typeof req.query["action"] === "string" ? req.query["action"] : "replace";
  const contentType = req.headers["content-type"] ?? "";

  if (contentType.includes("multipart/form-data")) {
    let parsed: { fields: MultipartFields; files: MultipartFiles };
    try {
      parsed = await parseMultipart(req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload parse failed";
      const isTooBig = msg.toLowerCase().includes("maxfilesize") || msg.toLowerCase().includes("too large");
      res.status(isTooBig ? 413 : 400).json({ error: isTooBig ? `File is too large (max ${formatMaxMb(MAX_VIDEO_ASSET_BYTES)} MB).` : msg });
      return;
    }

    const token = firstStr(parsed.fields["token"]) || firstStr(parsed.fields["sessionPassword"]);
    if (!isAdminRequest({ token })) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fileEntry = parsed.files["file"];
    const file = Array.isArray(fileEntry) ? fileEntry[0] : fileEntry;
    if (!file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const mime = (file.mimetype ?? "").toLowerCase();
    if (!isAllowedAssetMime(mime)) {
      res.status(400).json({ error: `Unsupported file type: ${mime}` });
      return;
    }
    if ((file.size ?? 0) === 0) {
      res.status(400).json({ error: "Uploaded file is empty." });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(file.filepath);
    } catch {
      res.status(500).json({ error: "Failed to read uploaded file." });
      return;
    }
    const maxBytes = maxAssetBytesForMime(mime);
    if (buffer.length > maxBytes) {
      res.status(413).json({ error: `File is too large (max ${formatMaxMb(maxBytes)} MB).` });
      return;
    }

    try {
      const updated = await replaceAsset(id, {
        buffer,
        mime,
        width: intField(firstStr(parsed.fields["width"])),
        height: intField(firstStr(parsed.fields["height"])),
      });
      if (!updated) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }
      res.json({ ok: true, asset: updated });
    } catch (err) {
      console.error("[admin] replace asset failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to replace asset" });
    }
    return;
  }

  const body = await readJsonBody(req);
  const tokenVal = req.headers["authorization"]?.startsWith("Bearer ")
    ? req.headers["authorization"].slice(7)
    : (typeof body.token === "string" ? body.token : "");
  if (!isAdminRequest({ token: tokenVal })) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (action === "rename") {
    const filename = typeof body.filename === "string" ? body.filename : "";
    if (!filename.trim()) {
      res.status(400).json({ error: "Filename cannot be empty." });
      return;
    }
    try {
      const updated = await renameAsset(id, filename);
      if (!updated) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }
      res.json({ ok: true, asset: updated });
    } catch (err) {
      console.error("[admin] rename asset failed", err);
      res.status(500).json({ error: "Failed to rename asset" });
    }
    return;
  }

  if (action === "delete") {
    try {
      const removed = await removeAsset(id);
      if (!removed) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] delete asset failed", err);
      res.status(500).json({ error: "Failed to delete asset" });
    }
    return;
  }

  const dataUrl = body.dataUrl;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    res.status(400).json({ error: "Expected multipart/form-data with a `file` field, or JSON with `dataUrl`." });
    return;
  }
  const m = /^data:([^;,]+)(?:;charset=[^;,]+)?(?:;base64)?,(.*)$/i.exec(dataUrl);
  if (!m) { res.status(400).json({ error: "Could not decode upload." }); return; }
  const mime = m[1]!.toLowerCase();
  const isBase64 = /;base64,/i.test(dataUrl.slice(0, dataUrl.indexOf(",") + 1));
  const buffer = isBase64 ? Buffer.from(m[2]!, "base64") : Buffer.from(decodeURIComponent(m[2]!), "utf8");
  if (!isAllowedAssetMime(mime)) { res.status(400).json({ error: `Unsupported file type: ${mime}` }); return; }
  if (buffer.length === 0) { res.status(400).json({ error: "Uploaded file is empty." }); return; }
  const maxBytes = maxAssetBytesForMime(mime);
  if (buffer.length > maxBytes) { res.status(413).json({ error: `File is too large (max ${formatMaxMb(maxBytes)} MB).` }); return; }

  try {
    const updated = await replaceAsset(id, {
      buffer,
      mime,
      width: intField(body.width),
      height: intField(body.height),
    });
    if (!updated) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.json({ ok: true, asset: updated });
  } catch (err) {
    console.error("[admin] replace asset failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to replace asset" });
  }
}
