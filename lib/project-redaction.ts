/**
 * Decides what part of a case study is safe to expose without a password.
 * Shared by the public content API and the Vite build (which strips case
 * study bodies out of the bundled seed), so it must stay dependency-free.
 */

type ProjectRecord = Record<string, unknown>;

/** Enough for Work/Home cards, page meta, and the lock screen — nothing from the case study body. */
const PUBLIC_PROJECT_FIELDS = [
  "id",
  "slug",
  "title",
  "subtitle",
  "cardDescription",
  "type",
  "tags",
  "coverImage",
  "coverMime",
  "coverPoster",
  "coverPlayback",
  "hoverVideo",
  "logo",
  "cardLayout",
  "year",
  "period",
  "featured",
  "archived",
  "protected",
] as const;

function isRecord(v: unknown): v is ProjectRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isProtectedProject(project: unknown): boolean {
  return isRecord(project) && project.protected === true;
}

/** `locked` = the server needs a password; `deferred` = the body is fetched from the API at runtime. */
export function toProjectStub(project: ProjectRecord, marker: "locked" | "deferred"): ProjectRecord {
  const stub: ProjectRecord = {};
  for (const key of PUBLIC_PROJECT_FIELDS) {
    if (key in project) stub[key] = project[key];
  }
  return {
    ...stub,
    description: "",
    challenge: "",
    solution: "",
    impact: "",
    sections: [],
    [marker]: true,
  };
}

export function stripProjectSecrets(project: ProjectRecord): ProjectRecord {
  const { password: _password, locked: _locked, deferred: _deferred, ...rest } = project;
  return rest;
}

/** Public API shape: protected case studies become locked stubs; nobody gets password hashes. */
export function redactProjectsForPublic(projects: unknown): unknown {
  if (!Array.isArray(projects)) return projects;
  return projects.map((p) => {
    if (!isRecord(p)) return p;
    return isProtectedProject(p) ? toProjectStub(p, "locked") : stripProjectSecrets(p);
  });
}

/**
 * Bundled seed shape. Production builds defer every body because a case study
 * can be protected from Admin (database only) without the JSON knowing.
 */
export function redactProjectsForBundle(projects: unknown, deferAll: boolean): unknown {
  if (!Array.isArray(projects)) return projects;
  return projects.map((p) => {
    if (!isRecord(p)) return p;
    if (isProtectedProject(p)) return toProjectStub(p, "locked");
    return deferAll ? toProjectStub(p, "deferred") : stripProjectSecrets(p);
  });
}

/** True while a project in Admin is still a stub — saving it would wipe the real case study. */
export function isIncompleteProject(project: unknown): boolean {
  return isRecord(project) && (project.locked === true || project.deferred === true);
}
