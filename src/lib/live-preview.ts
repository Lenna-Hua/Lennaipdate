/**
 * postMessage protocol between the admin editor and the site running inside
 * its live preview iframe. Both sides are same-origin; receivers must still
 * check `event.origin` and `event.source`.
 */

export const PREVIEW_MSG = {
  /** iframe → admin: content provider mounted, send the current draft. */
  ready: "lenna:preview-ready",
  /** iframe → admin: the preview's pathname changed (includes BASE_URL). */
  location: "lenna:preview-location",
  /** admin → iframe: replace the draft overlay. */
  draft: "lenna:preview-draft",
  /** admin → iframe: client-side navigate to a pathname (includes BASE_URL). */
  navigate: "lenna:preview-navigate",
} as const;

export type PreviewMessage =
  | { type: typeof PREVIEW_MSG.ready }
  | { type: typeof PREVIEW_MSG.location; path: string }
  | { type: typeof PREVIEW_MSG.draft; draft: unknown }
  | { type: typeof PREVIEW_MSG.navigate; path: string };

const TYPES = new Set<string>(Object.values(PREVIEW_MSG));

export function isPreviewMessage(value: unknown): value is PreviewMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string" &&
    TYPES.has((value as { type: string }).type)
  );
}

/** App base path without trailing slash, e.g. "" or "/portfolio". */
export function appBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function withBase(path: string): string {
  return `${appBasePath()}${path}`;
}

export function stripBase(pathname: string): string {
  const base = appBasePath();
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || "/";
  }
  return pathname || "/";
}
