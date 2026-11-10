import avatarFront from "@/assets/avatar/avatar-front.png";
import outfitBody from "@/assets/avatar/avatar-outfit-body.png";

export { avatarFront, outfitBody };

/** Large intro artwork, fetched by the gate in parallel with the sequence chunk. Smaller pieces inline into that chunk. */
export const PRELOAD_IMAGES = [avatarFront, outfitBody];

export const SEEN_KEY = "lenna-intro-seen";
export const HEM_H = 18;

const SECTION_LABELS: Record<string, string> = {
  "": "Home",
  home: "Home",
  work: "Work",
  studio: "Studio",
  about: "About",
  privacy: "Privacy",
  terms: "Terms",
};

export function sectionLabel(path: string) {
  const first = path.split("/").filter(Boolean)[0] ?? "";
  return SECTION_LABELS[first] ?? "Portfolio";
}

export function shouldShowIntro(path: string) {
  if (path.startsWith("/admin")) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}
