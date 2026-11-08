import { useEffect } from "react";
import appearanceSeed from "@/data/appearance.json";
import homepageSeed from "@/data/homepage.json";
import { useContent } from "@/lib/use-content";
import {
  applyDisplayTuning,
  familyFragmentFromName,
  mergeAppearance,
  resolveDisplayTuning,
  syncGoogleFontLinks,
} from "@/lib/fonts";
import type { Appearance } from "@/components/admin/types";

const LEGACY_LINK_ID = "lenna-dynamic-fonts";
const SYSTEM_TITLE_FONTS = new Set(["display", "sans", "serif", ""]);

function applyAppearance(appearance: Appearance, extraTitleFont?: string) {
  const root = document.documentElement;
  const display = appearance.displayFont.trim() || "Big Shoulders Display";
  const sans = appearance.sansFont.trim() || "Inter";
  const serif = appearance.serifFont.trim() || "Cormorant Garamond";
  root.style.setProperty("--app-font-display", `'${display}', sans-serif`);
  root.style.setProperty("--app-font-sans", `'${sans}', sans-serif`);
  root.style.setProperty("--app-font-serif", `'${serif}', serif`);
  applyDisplayTuning(root, resolveDisplayTuning(appearance));

  document.getElementById(LEGACY_LINK_ID)?.remove();
  const families = [...(appearance.googleFamilies ?? [])];
  const trimmedExtra = (extraTitleFont ?? "").trim();
  if (trimmedExtra && !SYSTEM_TITLE_FONTS.has(trimmedExtra)) {
    const frag = familyFragmentFromName(trimmedExtra, "400;500;700;900");
    if (frag) families.push(frag);
  }
  syncGoogleFontLinks(families, "site");
}

/** Applies admin-chosen Google Fonts and CSS variables across the whole site. */
export function FontApplier() {
  const raw = useContent("appearance", appearanceSeed as Appearance);
  const homepage = useContent("homepage", homepageSeed) as typeof homepageSeed;
  const cardTitleFont =
    (homepage?.home as { selectedWorkTitleFont?: string } | undefined)?.selectedWorkTitleFont ?? "";
  const appearance = mergeAppearance(raw);

  useEffect(() => {
    applyAppearance(appearance, cardTitleFont);
    // Field-level deps so a new object identity from mergeAppearance does not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appearance.displayFont,
    appearance.sansFont,
    appearance.serifFont,
    (appearance.googleFamilies ?? []).join("|"),
    JSON.stringify(appearance.display ?? null),
    cardTitleFont,
  ]);

  return null;
}
