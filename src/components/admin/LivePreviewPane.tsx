/**
 * Live preview — the real public site in an iframe, fed the unsaved admin
 * draft on every edit. Nothing here publishes; Save to Site still does that.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ContentData } from "./types";
import {
  PREVIEW_MSG,
  isPreviewMessage,
  stripBase,
  withBase,
  type PreviewMessage,
} from "@/lib/live-preview";

export type PreviewPage = { label: string; path: string; group: string };

type Device = "desktop" | "tablet" | "mobile";

const DEVICES: { id: Device; label: string; width: number; Icon: LucideIcon }[] = [
  { id: "desktop", label: "Desktop", width: 1440, Icon: Monitor },
  { id: "tablet", label: "Tablet", width: 834, Icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, Icon: Smartphone },
];

const DRAFT_DEBOUNCE_MS = 120;

const frameUrl = (path: string) => `${withBase(path)}?preview=1`;

export function LivePreviewPane({
  draft,
  path,
  onPathChange,
  pages,
  onOpenTab,
  onClose,
}: {
  draft: ContentData;
  path: string;
  onPathChange: (path: string) => void;
  pages: PreviewPage[];
  onOpenTab: (path: string) => void;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [frameSrc, setFrameSrc] = useState(() => frameUrl(path));
  const [frameKey, setFrameKey] = useState(0);

  const framePathRef = useRef(path);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onPathChangeRef = useRef(onPathChange);
  onPathChangeRef.current = onPathChange;

  const post = (msg: PreviewMessage) => {
    frameRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      if (!isPreviewMessage(e.data)) return;
      if (e.data.type === PREVIEW_MSG.ready) {
        setReady(true);
        post({ type: PREVIEW_MSG.draft, draft: draftRef.current });
      } else if (e.data.type === PREVIEW_MSG.location) {
        const next = stripBase(e.data.path);
        framePathRef.current = next;
        onPathChangeRef.current(next);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(
      () => post({ type: PREVIEW_MSG.draft, draft }),
      DRAFT_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [draft, ready]);

  useEffect(() => {
    if (path === framePathRef.current) return;
    framePathRef.current = path;
    if (ready) {
      post({ type: PREVIEW_MSG.navigate, path: withBase(path) });
    } else {
      setFrameSrc(frameUrl(path));
    }
  }, [path, ready]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reload = () => {
    setReady(false);
    setFrameSrc(frameUrl(framePathRef.current));
    setFrameKey((k) => k + 1);
  };

  const deviceWidth = DEVICES.find((d) => d.id === device)!.width;
  const scale = size.w > 0 ? Math.min(1, size.w / deviceWidth) : 1;
  const frameHeight = size.h / scale;
  const offsetX = Math.max(0, (size.w - deviceWidth * scale) / 2);

  const groups = pages.reduce<Record<string, PreviewPage[]>>((acc, page) => {
    (acc[page.group] ??= []).push(page);
    return acc;
  }, {});
  const knownPath = pages.some((p) => p.path === path);

  return (
    <div className="flex flex-col h-full border border-[#272421] bg-[#141210] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#272421] flex-wrap">
        <span className="flex items-center gap-2 text-[#8A8278] text-xs uppercase tracking-widest whitespace-nowrap">
          <span
            className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-400" : "bg-[#4A4540] animate-pulse"}`}
            aria-hidden
          />
          {ready ? "Live" : "Loading"}
        </span>

        <select
          value={path}
          onChange={(e) => onPathChange(e.target.value)}
          aria-label="Preview page"
          className="min-w-0 flex-1 bg-[#0A0908] border border-[#3A3530] text-[#F2EDE5] text-sm px-2 py-1 focus:outline-none focus:border-[#C8A96E]"
        >
          {!knownPath && <option value={path}>{path}</option>}
          {Object.entries(groups).map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((page) => (
                <option key={page.path} value={page.path}>
                  {page.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center border border-[#3A3530]" role="group" aria-label="Device">
          {DEVICES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              title={label}
              aria-label={label}
              aria-pressed={device === id}
              className={`p-1.5 transition-colors ${
                device === id
                  ? "bg-[#C8A96E]/15 text-[#C8A96E]"
                  : "text-[#8A8278] hover:text-[#F2EDE5]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={reload}
          title="Reload preview"
          aria-label="Reload preview"
          className="p-1.5 text-[#8A8278] hover:text-[#F2EDE5] transition-colors"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpenTab(path)}
          title="Open draft in new tab"
          aria-label="Open draft in new tab"
          className="p-1.5 text-[#8A8278] hover:text-[#F2EDE5] transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Hide live preview"
          aria-label="Hide live preview"
          className="p-1.5 text-[#8A8278] hover:text-[#F2EDE5] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={viewportRef} className="relative flex-1 min-h-0 overflow-hidden bg-[#0A0908]">
        {size.w > 0 && (
          <iframe
            key={frameKey}
            ref={frameRef}
            src={frameSrc}
            title="Live site preview"
            className={`absolute top-0 border-0 bg-background ${
              device === "desktop" ? "" : "shadow-[0_0_0_1px_#3A3530]"
            }`}
            style={{
              left: offsetX,
              width: deviceWidth,
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        )}
      </div>

      <p className="px-3 py-1.5 border-t border-[#272421] text-[#4A4540] text-[11px]">
        Unsaved draft — updates as you type. Click Save to Site to publish.
      </p>
    </div>
  );
}
