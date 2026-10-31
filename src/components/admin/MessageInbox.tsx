/**
 * MessageInbox — displays contact form submissions with read/unread, reply, and delete.
 */
import { useEffect, useState } from "react";
import type { ContactMessage } from "./types";
import { formatDate } from "./shared";

export function InboxEditor({
  sessionToken,
  messages,
  loading,
  error,
  onRefresh,
  onUpdate,
  onDelete,
}: {
  sessionToken: string;
  messages: ContactMessage[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onUpdate: (m: ContactMessage) => void;
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    messages[0]?.id ?? null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  // Keep a valid selection as the list changes (after delete or refresh).
  useEffect(() => {
    if (selectedId && messages.some((m) => m.id === selectedId)) return;
    setSelectedId(messages[0]?.id ?? null);
  }, [messages, selectedId]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const callMessageEndpoint = async (
    id: string,
    action: "read" | "delete",
    body: Record<string, unknown> = {},
  ): Promise<{ ok: boolean; data: { message?: ContactMessage; error?: string } }> => {
    const url = `${import.meta.env.BASE_URL}api/admin/messages/${encodeURIComponent(id)}/${action}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: ContactMessage;
      error?: string;
    };
    return { ok: res.ok, data };
  };

  const handleToggleRead = async (m: ContactMessage) => {
    setBusyId(m.id);
    try {
      const next = !m.readAt;
      const { ok, data } = await callMessageEndpoint(m.id, "read", { read: next });
      if (ok && data.message) onUpdate(data.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (m: ContactMessage) => {
    if (!window.confirm(`Delete this message from ${m.name}? This cannot be undone.`)) {
      return;
    }
    setBusyId(m.id);
    try {
      const { ok } = await callMessageEndpoint(m.id, "delete");
      if (ok) onDelete(m.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Inbox</h2>
          <p className="text-[color:var(--adm-muted)] text-sm mt-1">
            Messages submitted through the contact form. Newest first.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-2 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {error && (
        <div className="text-red-400 text-sm border border-red-900/40 bg-red-950/20 px-3 py-2">
          {error}
        </div>
      )}
      {!loading && messages.length === 0 && !error ? (
        <div className="text-[color:var(--adm-muted)] text-sm border border-dashed border-[color:var(--adm-line-strong)] p-8 text-center">
          No messages yet. Submissions to the contact form will appear here.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ul className="border border-[color:var(--adm-line)] divide-y divide-[color:var(--adm-line)] max-h-[60vh] overflow-y-auto">
            {messages.map((m) => {
              const unread = !m.readAt;
              const active = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left px-3 py-3 flex flex-col gap-1 transition-colors ${
                      active ? "bg-[color:var(--adm-subtle)]" : "hover:bg-[color:var(--adm-surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm truncate ${unread ? "text-[color:var(--adm-text)] font-medium" : "text-[color:var(--adm-muted)]"}`}
                      >
                        {m.name || "(no name)"}
                      </span>
                      {unread && (
                        <span className="text-[10px] uppercase tracking-widest bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] px-1.5 py-0.5">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[color:var(--adm-muted)] truncate">{m.email}</div>
                    <div className="text-xs text-[color:var(--adm-faint)] truncate">
                      {m.message.slice(0, 70)}
                      {m.message.length > 70 ? "…" : ""}
                    </div>
                    <div className="text-[10px] text-[color:var(--adm-faint)] uppercase tracking-widest">
                      {formatDate(m.createdAt)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border border-[color:var(--adm-line)] p-4 md:p-6 min-h-[300px]">
            {selected ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[color:var(--adm-text)] font-medium">{selected.name}</div>
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-[color:var(--adm-accent)] text-sm hover:underline break-all"
                    >
                      {selected.email}
                    </a>
                    <div className="text-xs text-[color:var(--adm-muted)] mt-1">
                      {formatDate(selected.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent("Re: your message")}`}
                      className="bg-[color:var(--adm-accent)] text-[color:var(--adm-on-accent)] px-3 py-2 hover:bg-[color:var(--adm-accent-hover)] transition-colors text-xs uppercase tracking-widest font-medium"
                    >
                      Reply
                    </a>
                    <button
                      onClick={() => handleToggleRead(selected)}
                      disabled={busyId === selected.id}
                      className="border border-[color:var(--adm-line-strong)] text-[color:var(--adm-muted)] px-3 py-2 hover:border-[color:var(--adm-accent)] hover:text-[color:var(--adm-accent)] transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      Mark {selected.readAt ? "Unread" : "Read"}
                    </button>
                    <button
                      onClick={() => handleDelete(selected)}
                      disabled={busyId === selected.id}
                      className="border border-red-900/60 text-red-400 px-3 py-2 hover:bg-red-950/30 transition-colors text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="border-t border-[color:var(--adm-line)] pt-4">
                  <div className="text-[color:var(--adm-muted)] text-xs uppercase tracking-widest mb-2">
                    Message
                  </div>
                  <div className="text-[color:var(--adm-text)] whitespace-pre-wrap break-words">
                    {selected.message}
                  </div>
                </div>
                {(selected.ip || selected.userAgent) && (
                  <div className="border-t border-[color:var(--adm-line)] pt-3 text-[10px] text-[color:var(--adm-faint)] uppercase tracking-widest space-y-1">
                    {selected.ip && <div>IP: {selected.ip}</div>}
                    {selected.userAgent && (
                      <div className="break-all normal-case tracking-normal">
                        UA: {selected.userAgent}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[color:var(--adm-muted)] text-sm">Select a message to view it.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
