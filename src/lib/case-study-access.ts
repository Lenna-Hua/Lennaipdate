const UNLOCKS_KEY = "lenna_case_unlocks";
const ADMIN_TOKEN_KEY = "lenna_admin_token";
const MAX_STORED_UNLOCKS = 20;

/** How the caller got the body: protected bodies reach admins and stored unlocks too. */
export type CaseStudyAccess = "public" | "admin" | "unlock";

export type CaseStudyResult<P> =
  | { status: "ok"; project: P; access: CaseStudyAccess }
  | { status: "locked" }
  | { status: "error"; message: string };

function readUnlocks(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    // Token format: case.<subject>.<expiryMs>.<signature>
    return parsed.filter(
      (t): t is string => typeof t === "string" && Number(t.split(".")[2]) > Date.now(),
    );
  } catch {
    return [];
  }
}

function storeUnlock(token: string) {
  try {
    const next = [token, ...readUnlocks().filter((t) => t !== token)].slice(0, MAX_STORED_UNLOCKS);
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — the unlock still works for this page view.
  }
}

function accessHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const unlocks = readUnlocks();
  if (unlocks.length > 0) headers["X-Case-Unlock"] = unlocks.join(",");
  try {
    const admin = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (admin) headers.Authorization = `Bearer ${admin}`;
  } catch {
    // Ignore — visitors without storage just won't get admin access.
  }
  return headers;
}

function readAccess(v: unknown, fallback: CaseStudyAccess): CaseStudyAccess {
  return v === "public" || v === "admin" || v === "unlock" ? v : fallback;
}

/** `asVisitor` skips the admin session and stored unlocks, so the owner can see the lock screen. */
export async function fetchCaseStudy<P>(
  slug: string,
  { asVisitor = false }: { asVisitor?: boolean } = {},
): Promise<CaseStudyResult<P>> {
  try {
    const res = await fetch(`/api/content?case=${encodeURIComponent(slug)}`, {
      headers: asVisitor ? {} : accessHeaders(),
    });
    if (res.status === 401) return { status: "locked" };
    const body = (await res.json().catch(() => ({}))) as {
      project?: P;
      access?: unknown;
      error?: string;
    };
    if (!res.ok || !body.project) {
      return { status: "error", message: body.error ?? "Couldn't load this case study." };
    }
    return { status: "ok", project: body.project, access: readAccess(body.access, "public") };
  } catch {
    return { status: "error", message: "Couldn't reach the server. Check your connection." };
  }
}

export async function unlockCaseStudy<P>(
  slug: string,
  password: string,
): Promise<{ ok: true; project: P; access: CaseStudyAccess } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      project?: P;
      token?: string;
      access?: unknown;
      error?: string;
    };
    if (!res.ok || !body.project) {
      return { ok: false, message: body.error ?? "Incorrect password" };
    }
    if (body.token) storeUnlock(body.token);
    return { ok: true, project: body.project, access: readAccess(body.access, "unlock") };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Try again." };
  }
}
