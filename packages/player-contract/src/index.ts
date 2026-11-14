export type MediaKind = "hls" | "dash" | "file";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error"
  | "unsupported";

export type TrackKind = "audio" | "subtitle" | "video";

export interface PlayableSource {
  id: string;
  uri: string;
  kind: MediaKind;
  title?: string;
  mimeType?: string;
}

export interface PlayerTrack {
  id: string;
  kind: TrackKind;
  label: string;
  language?: string;
  selected: boolean;
}

export interface PlayerSnapshot {
  status: PlaybackStatus;
  currentTime: number;
  duration: number | null;
  volume: number;
  muted: boolean;
  tracks: PlayerTrack[];
  error?: string;
}

export interface PlayerCapabilities {
  hls: boolean;
  dash: boolean;
  externalSubtitles: boolean;
  audioTrackSelection: boolean;
  subtitleTrackSelection: boolean;
  pictureInPicture: boolean;
  hardwareAcceleration: "unknown" | "platform-managed" | "explicit";
}

export type PlayerEvent =
  | { type: "status"; status: PlaybackStatus }
  | { type: "time"; currentTime: number; duration: number | null }
  | { type: "tracks"; tracks: PlayerTrack[] }
  | { type: "error"; message: string };

export interface PlayerAdapter {
  open(source: PlayableSource): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(positionSeconds: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getSnapshot(): PlayerSnapshot;
  getCapabilities(): PlayerCapabilities;
  subscribe(listener: (event: PlayerEvent) => void): () => void;
  dispose(): Promise<void>;
}

export type PlayableUrlResult =
  | { ok: true; source: PlayableSource }
  | { ok: false; error: string };

export function parsePlayableUrl(input: string): PlayableUrlResult {
  const value = input.trim();

  if (!value) {
    return { ok: false, error: "Nejdříve vlož URL streamu." };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "URL nemá platný formát." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Webový test přehrávače přijímá pouze HTTP a HTTPS URL." };
  }

  if (!url.hostname || url.username || url.password) {
    return { ok: false, error: "URL musí obsahovat hostitele a nesmí obsahovat přihlašovací údaje." };
  }

  const path = url.pathname.toLowerCase();
  const kind: MediaKind = path.endsWith(".m3u8")
    ? "hls"
    : path.endsWith(".mpd")
      ? "dash"
      : "file";

  return {
    ok: true,
    source: {
      id: url.href,
      uri: url.href,
      kind
    }
  };
}
