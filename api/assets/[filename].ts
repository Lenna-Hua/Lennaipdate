import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { query } from "../../lib/db.js";

export const config = { maxDuration: 60 };

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

function isBlobHost(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const filename = req.query["filename"] as string;
  if (!filename) {
    res.status(400).json({ error: "Missing filename" });
    return;
  }

  try {
    // Escape LIKE wildcards (%) and (_) in filename to prevent pattern injection
    const escaped = filename.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const rows = await query<{ url: string }>(
      "SELECT url FROM assets WHERE url LIKE $1 ESCAPE '\\'",
      [`%/${escaped}`],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    const blobUrl = rows[0]!.url;
    const headers: Record<string, string> = {};
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken && isBlobHost(blobUrl)) headers["Authorization"] = `Bearer ${blobToken}`;
    if (typeof req.headers.range === "string") headers["Range"] = req.headers.range;
    if (typeof req.headers["if-none-match"] === "string") headers["If-None-Match"] = req.headers["if-none-match"];

    const response = await fetch(blobUrl, { headers });
    if (response.status === 304) {
      res.status(304).end();
      return;
    }
    if (!response.ok || !response.body) {
      res.status(response.status === 416 ? 416 : 404).json({ error: "Asset not found in storage" });
      return;
    }

    res.status(response.status);
    for (const name of PASSTHROUGH_HEADERS) {
      const value = response.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    if (!response.headers.get("content-type")) res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Stream instead of buffering: buffered function responses are capped at ~4.5 MB.
    const body = Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
    body.on("error", () => res.destroy());
    req.on("close", () => body.destroy());
    body.pipe(res);
  } catch (err) {
    console.error("[assets] serve failed", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to serve asset" });
  }
}
