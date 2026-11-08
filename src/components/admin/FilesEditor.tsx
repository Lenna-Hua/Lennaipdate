/**
 * Files editor — resume PDF upload and management.
 */
import { useState } from "react";
import type { Files } from "./types";
import { resolveResumeUrl } from "@/lib/resume-url";

export function FilesEditor({
  data,
  onChange,
  sessionToken,
}: {
  data: Files;
  onChange: (next: Files) => void;
  sessionToken: string;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const resume = data.resume ?? { url: "", filename: "", updatedAt: "" };
  const previewHref = resolveResumeUrl(resume);
  const updatedLabel = (resume.updatedAt ?? "").trim()
    ? new Date(resume.updatedAt).toLocaleString()
    : "Bundled with site (never replaced)";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!sessionToken) {
      setStatus("error");
      setErrorMsg("Session expired: please log out and back in.");
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setStatus("error");
      setErrorMsg("Please choose a PDF file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setStatus("error");
      setErrorMsg("PDF must be 3 MB or smaller.");
      return;
    }
    setStatus("uploading");
    setErrorMsg("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const url = `${import.meta.env.BASE_URL}api/admin/resume`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ dataUrl, filename: file.name }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        filename?: string;
        updatedAt?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? `Upload failed (${res.status}).`);
      }
      onChange({
        ...data,
        resume: {
          url: body.url,
          filename: body.filename ?? file.name,
          updatedAt: body.updatedAt ?? new Date().toISOString(),
        },
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl text-[color:var(--adm-text)]">Resume PDF</h2>
        <p className="text-[color:var(--adm-muted)] text-sm">
          Replaces the file behind the "Download Resume" button on the About page. The public link stays the same so old links keep working.
        </p>
      </section>

      <div className="border border-[color:var(--adm-line)] p-5 flex flex-col gap-3 bg-[color:var(--adm-input)]">
        <div className="flex flex-col gap-1">
          <span className="text-[color:var(--adm-faint)] text-[10px] uppercase tracking-widest">Current file</span>
          <span className="text-[color:var(--adm-text)] text-sm">{(resume.filename ?? "").trim() || "Lenna_Hua_Resume.pdf"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[color:var(--adm-faint)] text-[10px] uppercase tracking-widest">Last updated</span>
          <span className="text-[color:var(--adm-muted)] text-sm">{updatedLabel}</span>
        </div>
        {previewHref && (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--adm-accent)] text-sm uppercase tracking-widest hover:underline self-start"
          >
            ↗ Preview / download
          </a>
        )}
      </div>

      <label className="flex items-center justify-center gap-3 cursor-pointer px-6 py-4 border-2 border-dashed border-[color:var(--adm-line-strong)] hover:border-[color:var(--adm-accent)] transition-colors rounded text-[color:var(--adm-muted)] text-sm uppercase tracking-widest">
        <span>{status === "uploading" ? "Uploading…" : "↑ Upload new resume PDF (max 3 MB)"}</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={status === "uploading"}
          onChange={handleUpload}
        />
      </label>

      {status === "success" && (
        <p className="text-[color:var(--adm-accent)] text-sm">
          Resume replaced. Click <strong>Save to Site</strong> to record the new metadata.
        </p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg || "Upload failed."}</p>
      )}
    </div>
  );
}
