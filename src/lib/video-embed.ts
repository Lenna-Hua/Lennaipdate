/**
 * YouTube / Vimeo / Instagram links used as project covers.
 * Every iframe host here must also be in `frame-src` (and thumbnails in `img-src`) in vercel.json.
 */

export type VideoEmbed =
  | { provider: "youtube"; id: string; portrait: boolean }
  | { provider: "vimeo"; id: string; hash?: string }
  | { provider: "instagram"; code: string; kind: "p" | "reel" | "tv" };

export type EmbedCommand = "play" | "pause" | "mute" | "unmute";

function toUrl(src: string): URL | null {
  try {
    return new URL(src.trim());
  } catch {
    return null;
  }
}

const YT_ID = /^[\w-]{11}$/;

function parseYouTube(url: URL): VideoEmbed | null {
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? { provider: "youtube", id, portrait: false } : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
  const v = url.searchParams.get("v");
  if (v && YT_ID.test(v)) return { provider: "youtube", id: v, portrait: false };
  const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
  if (!m) return null;
  return { provider: "youtube", id: m[2], portrait: m[1] === "shorts" };
}

function parseVimeo(url: URL): VideoEmbed | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  const m = url.pathname.match(/\/(\d+)(?:\/([\da-f]+))?\/?$/i);
  if (!m) return null;
  const hash = url.searchParams.get("h") ?? m[2];
  return { provider: "vimeo", id: m[1], ...(hash ? { hash } : {}) };
}

function parseInstagram(url: URL): VideoEmbed | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "instagram.com") return null;
  const m = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/);
  if (!m) return null;
  const kind = m[1] === "p" ? "p" : m[1] === "tv" ? "tv" : "reel";
  return { provider: "instagram", code: m[2], kind };
}

export function parseVideoEmbed(src: string | undefined): VideoEmbed | null {
  if (!src || !/^https?:\/\//i.test(src.trim())) return null;
  const url = toUrl(src);
  if (!url) return null;
  return parseYouTube(url) ?? parseVimeo(url) ?? parseInstagram(url);
}

/** Width / height of the provider's player frame. */
export function embedAspect(embed: VideoEmbed): number {
  if (embed.provider === "youtube") return embed.portrait ? 9 / 16 : 16 / 9;
  if (embed.provider === "instagram") return 4 / 5;
  return 16 / 9;
}

/** True when the provider can run as a muted, chrome-free background loop. */
export function canPlayInBackground(embed: VideoEmbed): boolean {
  return embed.provider !== "instagram";
}

/** Muted, looping, control-free player for covers. Null when the provider can't do that (Instagram). */
export function backgroundEmbedUrl(embed: VideoEmbed): string | null {
  if (embed.provider === "youtube") {
    const p = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      playlist: embed.id,
      controls: "0",
      playsinline: "1",
      rel: "0",
      disablekb: "1",
      iv_load_policy: "3",
      enablejsapi: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${embed.id}?${p}`;
  }
  if (embed.provider === "vimeo") {
    const p = new URLSearchParams({
      background: "1",
      autoplay: "1",
      loop: "1",
      muted: "1",
      dnt: "1",
      ...(embed.hash ? { h: embed.hash } : {}),
    });
    return `https://player.vimeo.com/video/${embed.id}?${p}`;
  }
  return null;
}

/** Full player with controls and sound, for the lightbox. */
export function playerEmbedUrl(embed: VideoEmbed): string {
  if (embed.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${embed.id}?autoplay=1&playsinline=1&rel=0`;
  }
  if (embed.provider === "vimeo") {
    const h = embed.hash ? `&h=${embed.hash}` : "";
    return `https://player.vimeo.com/video/${embed.id}?autoplay=1&dnt=1${h}`;
  }
  return `https://www.instagram.com/${embed.kind}/${embed.code}/embed/`;
}

/** Provider thumbnail that needs no API call (YouTube only). */
export function embedThumbnail(embed: VideoEmbed): string | undefined {
  if (embed.provider === "youtube") return `https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg`;
  return undefined;
}

export function embedProviderLabel(embed: VideoEmbed): string {
  return embed.provider === "youtube" ? "YouTube" : embed.provider === "vimeo" ? "Vimeo" : "Instagram";
}

/** postMessage payload for the background player; null when the provider has no API for it. */
export function embedCommandMessage(embed: VideoEmbed, command: EmbedCommand): string | null {
  if (embed.provider === "youtube") {
    const func = { play: "playVideo", pause: "pauseVideo", mute: "mute", unmute: "unMute" }[command];
    return JSON.stringify({ event: "command", func, args: [] });
  }
  if (embed.provider === "vimeo") {
    if (command === "play") return JSON.stringify({ method: "play" });
    if (command === "pause") return JSON.stringify({ method: "pause" });
    return null;
  }
  return null;
}

/** Messages that ask the player to start reporting playback events back to the page. */
export function embedHandshakeMessages(embed: VideoEmbed): string[] {
  if (embed.provider === "youtube") return [JSON.stringify({ event: "listening", id: "cover" })];
  if (embed.provider === "vimeo") {
    return [
      JSON.stringify({ method: "addEventListener", value: "timeupdate" }),
      JSON.stringify({ method: "addEventListener", value: "playProgress" }),
    ];
  }
  return [];
}

type PlayerMessage = {
  event?: string;
  info?: number | { currentTime?: number; playerState?: number } | null;
  data?: { seconds?: number } | null;
};

function readPlayerMessage(raw: unknown): PlayerMessage | null {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" ? (raw as PlayerMessage) : null;
}

/** Parses a postMessage from the player iframe. `null` when it isn't a player message. */
export function readEmbedPlayback(embed: VideoEmbed, raw: unknown): { playing: boolean } | null {
  const msg = readPlayerMessage(raw);
  if (!msg?.event) return null;
  if (embed.provider === "youtube") {
    if (msg.event === "onStateChange") return { playing: msg.info === 1 };
    if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
      return { playing: msg.info.playerState === 1 || (msg.info.currentTime ?? 0) > 0 };
    }
    return { playing: false };
  }
  if (embed.provider === "vimeo") {
    if (msg.event === "timeupdate" || msg.event === "playProgress") {
      return { playing: (msg.data?.seconds ?? 0) > 0 };
    }
    return { playing: false };
  }
  return null;
}

/** Sound toggle on the hero is only offered where the background player reliably unmutes. */
export function embedSupportsSound(embed: VideoEmbed): boolean {
  return embed.provider === "youtube";
}
