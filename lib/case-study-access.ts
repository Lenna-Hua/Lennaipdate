import crypto from "crypto";
import { signPayload } from "./admin-auth.js";

const UNLOCK_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const HASH_PREFIX = "scrypt$";
const SHARED_SUBJECT = "shared";

type ProjectRecord = Record<string, unknown>;

export type PasswordCheck = "ok" | "wrong" | "unconfigured";

export function isHashedPassword(v: unknown): v is string {
  return typeof v === "string" && v.startsWith(HASH_PREFIX);
}

export function hashCaseStudyPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(plain, salt, 32).toString("base64url");
  return `${HASH_PREFIX}${salt}$${hash}`;
}

function verifyHashedPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.slice(HASH_PREFIX.length).split("$");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length === 0) return false;
  const actual = crypto.scryptSync(plain, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/** Digest both sides so the comparison never leaks the shared password's length. */
function sharedPasswordMatches(plain: string, shared: string): boolean {
  const a = crypto.createHash("sha256").update(plain).digest();
  const b = crypto.createHash("sha256").update(shared).digest();
  return crypto.timingSafeEqual(a, b);
}

function customPassword(project: ProjectRecord): string | null {
  return isHashedPassword(project.password) ? project.password : null;
}

function sharedPassword(): string | null {
  const v = process.env.CASE_STUDY_PASSWORD;
  return v && v.length > 0 ? v : null;
}

export function checkCaseStudyPassword(project: ProjectRecord, provided: string): PasswordCheck {
  const custom = customPassword(project);
  if (custom) return verifyHashedPassword(provided, custom) ? "ok" : "wrong";
  const shared = sharedPassword();
  if (!shared) return "unconfigured";
  return sharedPasswordMatches(provided, shared) ? "ok" : "wrong";
}

/**
 * Shared-password unlocks cover every case study that uses the shared password;
 * custom-password unlocks cover only that slug.
 */
function unlockSubject(project: ProjectRecord): string {
  return customPassword(project) ? `slug:${String(project.slug)}` : SHARED_SUBJECT;
}

/** Changing the password invalidates every token issued under the old one. */
function passwordFingerprint(project: ProjectRecord): string {
  const source = customPassword(project) ?? sharedPassword() ?? "";
  return crypto.createHash("sha256").update(source).digest("base64url").slice(0, 16);
}

export function issueUnlockToken(project: ProjectRecord): string {
  const subject = Buffer.from(unlockSubject(project)).toString("base64url");
  const exp = Date.now() + UNLOCK_TTL_MS;
  const sig = signPayload(`case.${subject}.${exp}.${passwordFingerprint(project)}`);
  return `case.${subject}.${exp}.${sig}`;
}

function tokenUnlocks(project: ProjectRecord, token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "case") return false;
  const [, subject, expStr, sig] = parts as [string, string, string, string];
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (Buffer.from(subject, "base64url").toString() !== unlockSubject(project)) return false;
  let expected: string;
  try {
    expected = signPayload(`case.${subject}.${expStr}.${passwordFingerprint(project)}`);
  } catch {
    return false;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hasUnlockToken(project: ProjectRecord, tokens: string[]): boolean {
  return tokens.some((t) => tokenUnlocks(project, t));
}

/**
 * Hash any plain-text passwords Admin sent. Existing hashes pass through
 * untouched, and an empty value means "use the shared password".
 */
export function hashProjectPasswords(projects: unknown): unknown {
  if (!Array.isArray(projects)) return projects;
  return projects.map((p) => {
    if (typeof p !== "object" || p === null || Array.isArray(p)) return p;
    const project = p as ProjectRecord;
    const { password, ...rest } = project;
    if (typeof password !== "string" || password.trim() === "") return rest;
    if (isHashedPassword(password)) return project;
    return { ...rest, password: hashCaseStudyPassword(password) };
  });
}
