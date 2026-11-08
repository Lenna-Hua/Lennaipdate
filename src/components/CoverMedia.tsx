import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Play } from "lucide-react";
import { SafeImage } from "@/components/SafeImage";
import {
  backgroundEmbedUrl,
  canPlayInBackground,
  embedAspect,
  embedCommandMessage,
  embedProviderLabel,
  embedHandshakeMessages,
  embedThumbnail,
  parseVideoEmbed,
  readEmbedPlayback,
  type VideoEmbed,
} from "@/lib/video-embed";

/** Detect video URLs — extension, data URI, Cloudinary, or stored mime hint. */
export function isVideo(src: string, mimeHint?: string): boolean {
  if (!src) return false;
  if (mimeHint?.startsWith("video/")) return true;
  if (src.startsWith("data:video")) return true;
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(src)) return true;
  if (/res\.cloudinary\.com/i.test(src) && /\/video\/upload\//i.test(src)) return true;
  return false;
}

/** Video file or a YouTube / Vimeo link that can loop in the cover. */
export function isPlayableCover(src: string, mimeHint?: string): boolean {
  if (isVideo(src, mimeHint)) return true;
  const embed = parseVideoEmbed(src);
  return Boolean(embed && canPlayInBackground(embed));
}

/** A still image for places that can't play video (entry page previews, lock screen). */
export function coverStillSrc(src: string, mimeHint?: string, poster?: string): string {
  if (poster?.trim()) return poster.trim();
  const embed = parseVideoEmbed(src);
  if (embed) return embedThumbnail(embed) ?? "";
  return isVideo(src, mimeHint) ? "" : src;
}

/**
 * How a video cover plays.
 * - "loop": muted loop while on screen.
 * - "hover": paused on the first frame (or poster) until `active`; touch devices play while on screen.
 */
export type CoverPlayback = "loop" | "hover";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCanHover() {
  const [canHover] = useState(
    () => typeof window === "undefined" || window.matchMedia("(hover: hover)").matches,
  );
  return canHover;
}

type PlayStateOptions = {
  playback?: CoverPlayback;
  active?: boolean;
  allowPlay?: boolean;
  ignoreReducedMotion?: boolean;
};

/**
 * Plays only while visible, honoring hover playback and reduced motion.
 * `warm` ignores hover: true whenever the cover may play at all.
 */
function usePlayGate(
  ref: React.RefObject<Element | null>,
  { playback = "loop", active = false, allowPlay = true, ignoreReducedMotion = false }: PlayStateOptions,
) {
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const canHover = useCanHover();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  const warm = allowPlay && inView && (!reducedMotion || ignoreReducedMotion);
  const wantsPlay = playback === "loop" || active || !canHover;
  return { warm, shouldPlay: warm && wantsPlay };
}

interface CoverVideoProps extends PlayStateOptions {
  src: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
  onPlayingChange?: (playing: boolean) => void;
  onError?: () => void;
}

/** Muted cover video that only spends CPU/bandwidth while visible. */
export const CoverVideo = forwardRef<HTMLVideoElement, CoverVideoProps>(function CoverVideo(
  { src, label, className, style, poster, onPlayingChange, onError, ...playState },
  forwardedRef,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement);
  const { shouldPlay } = usePlayGate(videoRef, playState);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldPlay) {
      void v.play().catch(() => {
        /* autoplay blocked — first frame / poster stays visible */
      });
    } else {
      v.pause();
    }
  }, [shouldPlay, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
      className={className}
      style={style}
      onPlay={() => onPlayingChange?.(true)}
      onPause={() => onPlayingChange?.(false)}
      onError={onError}
    />
  );
});

/** Re-send the event subscription until the player reports playback (it ignores early messages). */
const HANDSHAKE_INTERVAL_MS = 400;
const HANDSHAKE_TRIES = 25;
/**
 * YouTube overlays its title and play/pause controls for a few seconds every time playback
 * starts or resumes, even with controls=0 — keep the poster on top until they fade.
 */
const YOUTUBE_SETTLE_MS = 3000;

interface EmbedCoverProps extends PlayStateOptions {
  embed: VideoEmbed;
  label: string;
  /** Sizing classes for the wrapper; it must have a definite width and height. */
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
  /** Background player sound (YouTube only). Defaults to muted. */
  muted?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

/**
 * YouTube / Vimeo background player cropped to fill its box like object-cover.
 * Instagram has no background mode, so it renders the poster only.
 */
export function EmbedCover({
  embed,
  label,
  className,
  style,
  poster,
  muted = true,
  onPlayingChange,
  ...playState
}: EmbedCoverProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { warm, shouldPlay } = usePlayGate(wrapRef, playState);
  const src = backgroundEmbedUrl(embed);
  const isYouTube = embed.provider === "youtube";
  /** YouTube keeps running under the poster while visible so hover reveals skip its overlay. */
  const running = isYouTube ? warm : shouldPlay;
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  /** The player answered a postMessage, so commands will be heard. */
  const [apiReady, setApiReady] = useState(false);
  /** Frames are actually moving — a broken, private, or unsupported video never gets here and keeps its poster. */
  const [progressed, setProgressed] = useState(false);
  const [settled, setSettled] = useState(false);
  const still = poster?.trim() || embedThumbnail(embed);

  useEffect(() => {
    if (running && src) setMounted(true);
  }, [running, src]);

  const embedRef = useRef(embed);
  embedRef.current = embed;

  useEffect(() => {
    if (!mounted) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const playback = readEmbedPlayback(embedRef.current, e.data);
      if (!playback) return;
      setApiReady(true);
      if (playback.playing) setProgressed(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mounted]);

  useEffect(() => {
    if (!loaded || progressed || !src) return;
    const origin = new URL(src).origin;
    const messages = embedHandshakeMessages(embedRef.current);
    let tries = 0;
    let timer = 0;
    const handshake = () => {
      const win = iframeRef.current?.contentWindow;
      if (win) for (const m of messages) win.postMessage(m, origin);
      if (++tries >= HANDSHAKE_TRIES) window.clearInterval(timer);
    };
    timer = window.setInterval(handshake, HANDSHAKE_INTERVAL_MS);
    handshake();
    return () => window.clearInterval(timer);
  }, [loaded, progressed, src]);

  useEffect(() => {
    if (!progressed || !running) {
      setSettled(false);
      return undefined;
    }
    if (!isYouTube) {
      setSettled(true);
      return undefined;
    }
    const t = window.setTimeout(() => setSettled(true), YOUTUBE_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [progressed, running, isYouTube]);

  useEffect(() => {
    if (!isYouTube && loaded && running && !settled) {
      const t = window.setTimeout(() => setSettled(true), 800);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [isYouTube, loaded, running, settled]);

  const playMessage = embedCommandMessage(embed, running ? "play" : "pause");
  const soundMessage = embedCommandMessage(embed, muted ? "mute" : "unmute");

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (apiReady && win && src && playMessage) win.postMessage(playMessage, new URL(src).origin);
  }, [playMessage, apiReady, src]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (apiReady && win && src && soundMessage) win.postMessage(soundMessage, new URL(src).origin);
  }, [soundMessage, apiReady, src]);

  const playing = mounted && shouldPlay;
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  const aspect = embedAspect(embed);
  const showStill = !(settled && shouldPlay);

  return (
    <div
      ref={wrapRef}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      className={className}
      style={{ position: "relative", overflow: "hidden", containerType: "size", ...style }}
    >
      {mounted && src ? (
        <iframe
          ref={iframeRef}
          src={src}
          title={label || `${embedProviderLabel(embed)} video`}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={() => setLoaded(true)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `max(100%, ${(aspect * 100).toFixed(3)}cqh)`,
            height: `max(100%, ${(100 / aspect).toFixed(3)}cqw)`,
            transform: "translate(-50%, -50%)",
            border: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: showStill ? 1 : 0, pointerEvents: "none" }}
      >
        {still ? (
          <SafeImage src={still} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center gap-2 text-white/80 text-xs uppercase tracking-widest font-sans"
            style={{ background: "linear-gradient(150deg, #1f1b17, #0d0b09)" }}
          >
            <Play className="w-4 h-4 fill-current" />
            {embedProviderLabel(embed)} video
          </div>
        )}
      </div>
    </div>
  );
}

interface CoverMediaProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  /** When the URL has no extension (e.g. /api/assets/…), use stored mime from the library. */
  mimeHint?: string;
  /** Video covers: still frame shown before the video loads or while paused. */
  poster?: string;
  playback?: CoverPlayback;
  /** Video covers with "hover" playback: true while the parent card is hovered/focused. */
  active?: boolean;
  /** Video covers: never play (show the poster / first frame). */
  paused?: boolean;
}

export function CoverMedia({
  src,
  alt,
  className,
  style,
  loading = "lazy",
  mimeHint,
  poster,
  playback,
  active,
  paused = false,
}: CoverMediaProps) {
  const embed = parseVideoEmbed(src);
  if (embed) {
    return (
      <EmbedCover
        embed={embed}
        label={alt}
        className={className}
        style={style}
        poster={poster}
        playback={playback}
        active={active}
        allowPlay={!paused}
      />
    );
  }
  if (isVideo(src, mimeHint)) {
    return (
      <CoverVideo
        src={src}
        label={alt}
        className={className}
        style={style}
        poster={poster}
        playback={playback}
        active={active}
        allowPlay={!paused}
      />
    );
  }
  return <SafeImage src={src} alt={alt} className={className} style={style} loading={loading} />;
}
