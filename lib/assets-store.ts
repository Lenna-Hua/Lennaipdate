import crypto from "crypto";
import path from "path";
import { del } from "@vercel/blob";
import { query } from "./db.js";
import { storeAsset, replaceStoredAsset } from "./asset-storage-adapter.js";

export type Asset = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type Row = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: string | number;
  width: number | null;
  height: number | null;
  created_at: string | Date;
};

function toAsset(r: Row): Asset {
  const toIso = (v: string | Date): string =>
    typeof v === "string" ? v : v.toISOString();
  const toClientUrl = (rawUrl: string): string => {
    if (!/^https?:\/\//i.test(rawUrl)) return rawUrl;
    return `/api/assets/${encodeURIComponent(path.basename(rawUrl))}`;
  };
  return {
    id: r.id,
    url: toClientUrl(r.url),
    filename: r.filename,
    mime: r.mime,
    size: Number(r.size),
    width: r.width,
    height: r.height,
    createdAt: toIso(r.created_at),
  };
}

export function assetType(mime: string): "image" | "gif" | "video" | "other" {
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

export async function listAssets(opts?: {
  limit?: number;
  offset?: number;
  type?: "image" | "gif" | "video" | "all";
  search?: string;
}): Promise<{ assets: Asset[]; total: number }> {
  const rows = await query<Row>(
    `SELECT id, url, filename, mime, size, width, height, created_at
     FROM assets ORDER BY created_at DESC`,
  );
  let assets = rows.map(toAsset);
  const type = opts?.type ?? "all";
  if (type !== "all") {
    assets = assets.filter((a) => assetType(a.mime) === type);
  }
  const search = (opts?.search ?? "").trim().toLowerCase();
  if (search) {
    assets = assets.filter((a) => a.filename.toLowerCase().includes(search));
  }
  const total = assets.length;
  const offset = Math.max(0, opts?.offset ?? 0);
  const limit = Math.max(1, Math.min(opts?.limit ?? 100, 200));
  return { assets: assets.slice(offset, offset + limit), total };
}

export async function uploadAsset(input: {
  buffer: Buffer;
  filename: string;
  mime: string;
  width?: number | null;
  height?: number | null;
}): Promise<Asset> {
  const url = await storeAsset(input.buffer, input.filename, input.mime);
  const id = crypto.randomUUID();
  const rows = await query<Row>(
    `INSERT INTO assets (id, url, filename, mime, size, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, url, filename, mime, size, width, height, created_at`,
    [id, url, input.filename || "upload", input.mime, input.buffer.length, input.width ?? null, input.height ?? null],
  );
  return toAsset(rows[0]!);
}

/** Record a blob that the browser already uploaded directly to storage. */
export async function registerAsset(input: {
  url: string;
  filename: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
}): Promise<Asset> {
  const id = crypto.randomUUID();
  const rows = await query<Row>(
    `INSERT INTO assets (id, url, filename, mime, size, width, height)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, url, filename, mime, size, width, height, created_at`,
    [id, input.url, input.filename || "upload", input.mime, input.size, input.width ?? null, input.height ?? null],
  );
  return toAsset(rows[0]!);
}

export async function replaceAsset(
  id: string,
  input: { buffer: Buffer; mime: string; width?: number | null; height?: number | null },
): Promise<Asset | null> {
  const existing = await query<Row>(
    "SELECT id, url, filename, mime, size, width, height, created_at FROM assets WHERE id = $1",
    [id],
  );
  if (existing.length === 0) return null;
  const row = existing[0]!;
  const old = toAsset(row);

  const newUrl = await replaceStoredAsset(input.buffer, row.url, input.mime);

  const rows = await query<Row>(
    `UPDATE assets
     SET url = $1, mime = $2, size = $3, width = $4, height = $5
     WHERE id = $6
     RETURNING id, url, filename, mime, size, width, height, created_at`,
    [newUrl, input.mime, input.buffer.length, input.width ?? old.width, input.height ?? old.height, id],
  );
  return rows.length > 0 ? toAsset(rows[0]!) : null;
}

export async function renameAsset(id: string, filename: string): Promise<Asset | null> {
  const trimmed = (filename || "").trim().slice(0, 200);
  if (!trimmed) return null;
  const rows = await query<Row>(
    `UPDATE assets SET filename = $1 WHERE id = $2
     RETURNING id, url, filename, mime, size, width, height, created_at`,
    [trimmed, id],
  );
  return rows.length > 0 ? toAsset(rows[0]!) : null;
}

export async function removeAsset(id: string): Promise<boolean> {
  const rows = await query<{ url: string }>(
    "DELETE FROM assets WHERE id = $1 RETURNING url",
    [id],
  );
  if (rows.length === 0) return false;
  try {
    await del(rows[0]!.url);
  } catch {
    /* ignore */
  }
  return true;
}
