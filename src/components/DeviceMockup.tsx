/**
 * DeviceMockup — wraps a screenshot in phone / tablet / laptop / browser chrome.
 * CSS frames work out of the box. Optional PNG overlays can replace them later
 * via /mockup-frames/{device}.png (see ASSET_REQUIREMENTS in DeviceMockup docs).
 */
import type { CSSProperties, ReactNode } from "react";

export type DeviceFrame = "phone" | "tablet" | "laptop" | "browser";

export const DEVICE_FRAMES: { id: DeviceFrame; label: string; aspect: string }[] = [
  { id: "phone", label: "Phone", aspect: "9 / 19.5" },
  { id: "tablet", label: "Tablet", aspect: "3 / 4" },
  { id: "laptop", label: "Laptop", aspect: "16 / 10" },
  { id: "browser", label: "Browser", aspect: "16 / 10" },
];

const BEZEL = "#1A1816";
const BEZEL_LIGHT = "#2A2622";
const SCREEN_BG = "#0A0908";

type Props = {
  frame: DeviceFrame;
  children: ReactNode;
  className?: string;
  /** Max width of the whole mockup (device chrome included). */
  maxWidth?: number | string;
};

export function DeviceMockup({
  frame,
  children,
  className = "",
  maxWidth,
}: Props) {
  if (frame === "phone") return <PhoneFrame className={className} maxWidth={maxWidth}>{children}</PhoneFrame>;
  if (frame === "tablet") return <TabletFrame className={className} maxWidth={maxWidth}>{children}</TabletFrame>;
  if (frame === "laptop") return <LaptopFrame className={className} maxWidth={maxWidth}>{children}</LaptopFrame>;
  return <BrowserFrame className={className} maxWidth={maxWidth}>{children}</BrowserFrame>;
}

function Screen({
  children,
  aspect,
  radius = 0,
}: {
  children: ReactNode;
  aspect: string;
  radius?: number;
}) {
  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ aspectRatio: aspect, borderRadius: radius }}
    >
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: SCREEN_BG }}>
        <div className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
          {children}
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({
  children,
  className,
  maxWidth = 280,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number | string;
}) {
  const wrap: CSSProperties = { maxWidth, width: "100%", margin: "0 auto" };
  return (
    <div className={`flex flex-col items-center ${className}`} style={wrap}>
      <div
        className="relative w-full p-[10px] shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        style={{
          background: `linear-gradient(145deg, ${BEZEL_LIGHT}, ${BEZEL})`,
          borderRadius: 36,
          border: "1px solid #3A3530",
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute left-1/2 top-[18px] z-10 h-[22px] w-[90px] -translate-x-1/2 rounded-full"
          style={{ background: BEZEL }}
          aria-hidden
        />
        <Screen aspect="9 / 19.5" radius={26}>
          {children}
        </Screen>
      </div>
    </div>
  );
}

function TabletFrame({
  children,
  className,
  maxWidth = 420,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number | string;
}) {
  const wrap: CSSProperties = { maxWidth, width: "100%", margin: "0 auto" };
  return (
    <div className={`flex flex-col items-center ${className}`} style={wrap}>
      <div
        className="relative w-full p-[14px] shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
        style={{
          background: `linear-gradient(145deg, ${BEZEL_LIGHT}, ${BEZEL})`,
          borderRadius: 28,
          border: "1px solid #3A3530",
        }}
      >
        <div
          className="absolute left-1/2 top-[10px] z-10 h-[8px] w-[8px] -translate-x-1/2 rounded-full"
          style={{ background: "#4A4540" }}
          aria-hidden
        />
        <Screen aspect="3 / 4" radius={16}>
          {children}
        </Screen>
      </div>
    </div>
  );
}

function LaptopFrame({
  children,
  className,
  maxWidth = 720,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number | string;
}) {
  const wrap: CSSProperties = { maxWidth, width: "100%", margin: "0 auto" };
  return (
    <div className={`flex flex-col items-center ${className}`} style={wrap}>
      <div
        className="relative w-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        style={{
          background: BEZEL,
          borderRadius: "12px 12px 0 0",
          border: "1px solid #3A3530",
          borderBottom: "none",
          padding: "10px 10px 0",
        }}
      >
        <div className="mb-2 flex justify-center">
          <div className="h-[6px] w-[6px] rounded-full bg-[#4A4540]" aria-hidden />
        </div>
        <Screen aspect="16 / 10" radius={2}>
          {children}
        </Screen>
      </div>
      {/* Base / hinge */}
      <div
        className="relative h-[14px] w-[108%]"
        style={{
          background: `linear-gradient(180deg, ${BEZEL_LIGHT}, ${BEZEL})`,
          borderRadius: "0 0 10px 10px",
          border: "1px solid #3A3530",
          borderTop: "none",
        }}
      />
      <div
        className="h-[8px] w-[118%]"
        style={{
          background: BEZEL,
          borderRadius: "0 0 16px 16px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

function BrowserFrame({
  children,
  className,
  maxWidth = 800,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number | string;
}) {
  const wrap: CSSProperties = { maxWidth, width: "100%", margin: "0 auto" };
  return (
    <div className={`flex flex-col ${className}`} style={wrap}>
      <div
        className="overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
        style={{
          background: BEZEL,
          borderRadius: 12,
          border: "1px solid #3A3530",
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ background: BEZEL_LIGHT, borderBottom: "1px solid #3A3530" }}
        >
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#E07B39]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#C8A96E]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#5A9E6F]/70" />
          </div>
          <div
            className="ml-2 flex-1 truncate rounded-md px-3 py-1 text-[10px] tracking-wide text-[#8A8278]"
            style={{ background: "#0A0908" }}
          >
            https://
          </div>
        </div>
        <Screen aspect="16 / 10" radius={0}>
          {children}
        </Screen>
      </div>
    </div>
  );
}

export function isDeviceFrame(value: unknown): value is DeviceFrame {
  return value === "phone" || value === "tablet" || value === "laptop" || value === "browser";
}
