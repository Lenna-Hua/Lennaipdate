import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminRequest } from "../../lib/admin-auth.js";
import { handleCors } from "../../lib/cors.js";
import {
  listMessages,
  setMessageRead,
  deleteMessage,
} from "../../lib/messages-store.js";

export const config = { maxDuration: 15 };

function readToken(req: VercelRequest): string | undefined {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.toLowerCase().startsWith("bearer ")) {
    return h.slice(7).trim();
  }
  return undefined;
}

function requireAdmin(req: VercelRequest): boolean {
  return isAdminRequest({ token: readToken(req) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.method === "GET") {
    try {
      const messages = await listMessages();
      res.json({ messages });
    } catch (err) {
      console.error("[admin] list messages failed", err);
      res.status(500).json({ error: "Failed to load messages" });
    }
    return;
  }

  if (req.method === "PATCH") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const read = body.read !== false;
    if (!id) {
      res.status(400).json({ error: "Missing message id" });
      return;
    }
    try {
      const updated = await setMessageRead(id, Boolean(read));
      if (!updated) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json({ ok: true, message: updated });
    } catch (err) {
      console.error("[admin] update message failed", err);
      res.status(500).json({ error: "Failed to update message" });
    }
    return;
  }

  if (req.method === "POST") {
    const op = typeof req.query["op"] === "string" ? req.query["op"] : "";
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id = typeof req.query["id"] === "string"
      ? req.query["id"]
      : (typeof body.id === "string" ? body.id : "");
    if (!id) {
      res.status(400).json({ error: "Missing message id" });
      return;
    }
    if (op === "read") {
      const read = body.read !== false;
      try {
        const updated = await setMessageRead(id, Boolean(read));
        if (!updated) {
          res.status(404).json({ error: "Message not found" });
          return;
        }
        res.json({ ok: true, message: updated });
      } catch (err) {
        console.error("[admin] update message failed", err);
        res.status(500).json({ error: "Failed to update message" });
      }
      return;
    }
    if (op === "delete") {
      try {
        const removed = await deleteMessage(id);
        if (!removed) {
          res.status(404).json({ error: "Message not found" });
          return;
        }
        res.json({ ok: true });
      } catch (err) {
        console.error("[admin] delete message failed", err);
        res.status(500).json({ error: "Failed to delete message" });
      }
      return;
    }
    res.status(400).json({ error: "Unknown message operation" });
    return;
  }

  if (req.method === "DELETE") {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : (req.query["id"] as string | undefined) ?? "";
    if (!id) {
      res.status(400).json({ error: "Missing message id" });
      return;
    }
    try {
      const removed = await deleteMessage(id);
      if (!removed) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] delete message failed", err);
      res.status(500).json({ error: "Failed to delete message" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
