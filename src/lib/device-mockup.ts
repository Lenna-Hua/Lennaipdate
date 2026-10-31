/** Device frames + layouts for case-study "mockup" sections. */

export type MockupDevice = "phone" | "tablet" | "tablet-landscape" | "laptop" | "browser";

/**
 * single   — one device, centered
 * row      — devices side by side, same size
 * cluster  — center device large, neighbours smaller and overlapping
 * floating — tilted devices scattered on a dark stage with depth blur
 * set      — laptop + tablet + phone together (responsive showcase)
 */
export type MockupLayout = "single" | "row" | "cluster" | "floating" | "set";

/** Per-screen tweaks, kept index-aligned with `screens`. */
export type ScreenMeta = {
  /** Frame used in the device set; detected from the screenshot shape on import. */
  device?: MockupDevice;
  /** Image zoom inside the screen, % (100–200). */
  zoom?: number;
  /**
   * Vertical focus of the image, % (0 = top, 100 = bottom). Tall screens rest
   * here when not interactive; interactive ones scroll from the top.
   */
  y?: number;
  /** Device size in the device set, % of its default (50–150). */
  size?: number;
};

/** Screen opening as % of the frame image (measured from the PNG's transparent hole). */
export type ScreenRect = { left: number; top: number; width: number; height: number };

export type DeviceFrameSpec = {
  label: string;
  /** Frame PNG with a transparent screen; omitted for CSS-drawn devices. */
  src?: string;
  /** Frame width / height. */
  aspect: number;
  screen: ScreenRect;
  /** Recommended screenshot export size (2x). */
  exportSize: [number, number];
  landscape: boolean;
};

export const DEVICE_FRAMES: Record<MockupDevice, DeviceFrameSpec> = {
  phone: {
    label: "Phone",
    src: "/mockups/phone.png",
    aspect: 736 / 1494,
    screen: { left: 5.707, top: 2.744, width: 88.587, height: 94.378 },
    exportSize: [1170, 2532],
    landscape: false,
  },
  tablet: {
    label: "Tablet",
    src: "/mockups/tablet.png",
    aspect: 888 / 1138,
    screen: { left: 7.545, top: 5.975, width: 84.91, height: 88.137 },
    exportSize: [1536, 2048],
    landscape: false,
  },
  "tablet-landscape": {
    label: "Tablet (landscape)",
    src: "/mockups/tablet-landscape.png",
    aspect: 1138 / 888,
    screen: { left: 5.975, top: 7.545, width: 88.137, height: 84.91 },
    exportSize: [2048, 1536],
    landscape: true,
  },
  laptop: {
    label: "Laptop",
    src: "/mockups/laptop.png",
    aspect: 2000 / 1245,
    screen: { left: 12.1, top: 2.249, width: 77.9, height: 81.285 },
    exportSize: [1558 * 2, 1012 * 2],
    landscape: true,
  },
  browser: {
    label: "Browser",
    aspect: 16 / 10.6,
    screen: { left: 0, top: 5.66, width: 100, height: 94.34 },
    exportSize: [1440, 900],
    landscape: true,
  },
};

export const MOCKUP_DEVICES = Object.keys(DEVICE_FRAMES) as MockupDevice[];

export const MOCKUP_LAYOUTS: { value: MockupLayout; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "row", label: "Row" },
  { value: "cluster", label: "Cluster" },
  { value: "floating", label: "Floating (tilted)" },
  { value: "set", label: "Device set" },
];

export const MOCKUP_BACKGROUNDS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "#1B1D2A", label: "Navy" },
  { value: "#0A0908", label: "Ink" },
  { value: "#F4EFE6", label: "Cream" },
  { value: "#3B5BDB", label: "Blue" },
];

export const FLOATING_DEFAULT_BG = "#1B1D2A";

export function isMockupDevice(v: unknown): v is MockupDevice {
  return typeof v === "string" && v in DEVICE_FRAMES;
}

export function isMockupLayout(v: unknown): v is MockupLayout {
  return MOCKUP_LAYOUTS.some((l) => l.value === v);
}

/**
 * Pick the frame whose screen shape is closest to a screenshot's width / height.
 * Full-page (scrolling) screenshots are tall at any size, so very tall images
 * fall back to width: phone exports stay under ~1300px wide.
 */
export function detectDevice(width: number, height: number): MockupDevice {
  const r = width / height;
  if (r < 0.62) return width >= 1400 ? "laptop" : "phone";
  if (r < 1) return "tablet";
  if (r < 1.42) return "tablet-landscape";
  return "laptop";
}

/** Size class a device fills in the device set. */
export function setSlotOf(device: MockupDevice): "big" | "mid" | "small" {
  if (device === "phone") return "small";
  if (device === "tablet" || device === "tablet-landscape") return "mid";
  return "big";
}

/** Sensible layout for the imported screens; mixed device shapes → device set. */
export function defaultLayout(device: MockupDevice, count: number, devices: MockupDevice[] = []): MockupLayout {
  if (new Set(devices.map(setSlotOf)).size > 1) return "set";
  if (count <= 1) return "single";
  if (DEVICE_FRAMES[device].landscape) return count === 2 ? "row" : "cluster";
  return count >= 4 ? "floating" : "cluster";
}
