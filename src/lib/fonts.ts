import type { Appearance, AppearancePreset, DisplayTuning } from "@/components/admin/types";

export const DEFAULT_DISPLAY_TUNING: DisplayTuning = {
  scale: 1,
  lineHeight: null,
  letterSpacing: null,
  weight: null,
  uppercase: true,
};

export function resolveDisplayTuning(appearance: Appearance): DisplayTuning {
  return { ...DEFAULT_DISPLAY_TUNING, ...(appearance.display ?? {}) };
}

export const DEFAULT_APPEARANCE: Appearance = {
  preset: "current",
  displayFont: "Big Shoulders Display",
  sansFont: "Inter",
  serifFont: "Cormorant Garamond",
  googleFamilies: [
    "Big+Shoulders+Display:wght@700;800;900",
    "Inter:wght@300;400;500;600;700",
    "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
  ],
  display: DEFAULT_DISPLAY_TUNING,
};

export type FontPresetDef = {
  id: AppearancePreset;
  label: string;
  note: string;
  displayFont: string;
  sansFont: string;
  serifFont: string;
  googleFamilies: string[];
};

export const FONT_PRESETS: FontPresetDef[] = [
  {
    id: "current",
    label: "Current",
    note: "Big Shoulders headlines, Inter body, Cormorant serif: the live site today.",
    displayFont: "Big Shoulders Display",
    sansFont: "Inter",
    serifFont: "Cormorant Garamond",
    googleFamilies: [
      "Big+Shoulders+Display:wght@700;800;900",
      "Inter:wght@300;400;500;600;700",
      "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700",
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    note: "Magazine feel: Playfair headlines, Source Sans body.",
    displayFont: "Playfair Display",
    sansFont: "Source Sans 3",
    serifFont: "Playfair Display",
    googleFamilies: [
      "Playfair+Display:ital,wght@0,500;0,700;0,900;1,500",
      "Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400",
    ],
  },
  {
    id: "geometric",
    label: "Geometric",
    note: "Sharp studio energy: Syne headlines, DM Sans body.",
    displayFont: "Syne",
    sansFont: "DM Sans",
    serifFont: "Instrument Serif",
    googleFamilies: [
      "Syne:wght@600;700;800",
      "DM+Sans:ital,wght@0,400;0,500;0,700;1,400",
      "Instrument+Serif:ital,wght@0,400;1,400",
    ],
  },
  {
    id: "scrapbook",
    label: "Scrapbook",
    note: "Softer, more handmade: Fraunces headlines, Nunito body.",
    displayFont: "Fraunces",
    sansFont: "Nunito Sans",
    serifFont: "Fraunces",
    googleFamilies: [
      "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400",
      "Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400",
    ],
  },
  {
    id: "poster",
    label: "Poster",
    note: "Loud condensed headlines: Oswald + Work Sans.",
    displayFont: "Oswald",
    sansFont: "Work Sans",
    serifFont: "Libre Baskerville",
    googleFamilies: [
      "Oswald:wght@500;600;700",
      "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",
      "Libre+Baskerville:ital,wght@0,400;0,700;1,400",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    note: "Type any Google Font family names. They load on the whole site after you Save to Site.",
    displayFont: "Big Shoulders Display",
    sansFont: "Inter",
    serifFont: "Cormorant Garamond",
    googleFamilies: DEFAULT_APPEARANCE.googleFamilies,
  },
];

export function appearanceFromPreset(id: AppearancePreset): Appearance {
  const preset = FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0]!;
  return {
    preset: id,
    displayFont: preset.displayFont,
    sansFont: preset.sansFont,
    serifFont: preset.serifFont,
    googleFamilies: [...preset.googleFamilies],
    display: { ...DEFAULT_DISPLAY_TUNING },
  };
}

/** Build a Google Fonts CSS2 URL from family query fragments. */
export function googleFontsHref(families: string[]): string {
  const unique = [...new Set(families.map((f) => f.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  const params = unique.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Best-effort family fragment from a human-readable Google Font name. */
export function familyFragmentFromName(name: string, weights = "400;600;700"): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const slug = trimmed.replace(/ /g, "+");
  return `${slug}:wght@${weights}`;
}

function titleCaseWords(name: string): string {
  return name
    .split("+")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join("+");
}

/**
 * Google Fonts rejects the whole request (HTTP 400) when a family name has the
 * wrong casing or asks for a weight the family doesn't ship, so each family
 * gets progressively looser fallbacks.
 */
export function familyCandidates(fragment: string): string[] {
  const trimmed = fragment.trim();
  if (!trimmed) return [];
  const [name, ...rest] = trimmed.split(":");
  const axes = rest.length ? `:${rest.join(":")}` : "";
  const titled = titleCaseWords(name!);
  return [...new Set([trimmed, `${titled}${axes}`, name!, titled])];
}

/**
 * Keeps one `<link>` per family (tagged with `group`) so a single bad family
 * can't block the others, retrying looser URLs when Google returns an error.
 */
export function syncGoogleFontLinks(families: string[], group: string): void {
  const wanted = [...new Set(families.map((f) => f.trim()).filter(Boolean))];
  const existing = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(`link[data-font-group="${group}"]`),
  );
  for (const link of existing) {
    if (!wanted.includes(link.dataset.fontFamily ?? "")) link.remove();
  }
  for (const family of wanted) {
    const present = existing.find((l) => l.dataset.fontFamily === family && l.isConnected);
    if (present) continue;
    const candidates = familyCandidates(family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.fontGroup = group;
    link.dataset.fontFamily = family;
    let attempt = 0;
    link.onerror = () => {
      attempt += 1;
      if (attempt < candidates.length) link.href = googleFontsHref([candidates[attempt]!]);
    };
    link.href = googleFontsHref([candidates[0]!]);
    document.head.appendChild(link);
  }
}

export function rebuildCustomFamilies(display: string, sans: string, serif: string): string[] {
  const families = [
    familyFragmentFromName(display, "500;700;800;900"),
    familyFragmentFromName(sans, "300;400;500;600;700"),
    familyFragmentFromName(serif, "400;600;700"),
  ];
  return [...new Set(families.filter(Boolean))];
}

/** CSS custom properties + `data-*` flags read by the `.font-display` overrides in index.css. */
export function applyDisplayTuning(root: HTMLElement, tuning: DisplayTuning): void {
  const set = (flag: string, prop: string, value: string | null) => {
    if (value === null) {
      root.removeAttribute(`data-display-${flag}`);
      root.style.removeProperty(prop);
    } else {
      root.setAttribute(`data-display-${flag}`, "");
      root.style.setProperty(prop, value);
    }
  };
  set("scale", "--app-display-scale", tuning.scale === 1 ? null : String(tuning.scale));
  set("leading", "--app-display-leading", tuning.lineHeight === null ? null : String(tuning.lineHeight));
  set(
    "tracking",
    "--app-display-tracking",
    tuning.letterSpacing === null ? null : `${tuning.letterSpacing}em`,
  );
  set("weight", "--app-display-weight", tuning.weight === null ? null : String(tuning.weight));
  if (tuning.uppercase) root.removeAttribute("data-display-case");
  else root.setAttribute("data-display-case", "none");
}

export function mergeAppearance(live: Partial<Appearance> | null | undefined): Appearance {
  return { ...DEFAULT_APPEARANCE, ...(live ?? {}) };
}
