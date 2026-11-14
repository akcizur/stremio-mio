import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { PlayableSource, PlaybackStatus } from "@mio/player-contract";

interface WebPlayerProps {
  source: PlayableSource | null;
  startAtSeconds: number;
  onProgress: (positionSeconds: number, durationSeconds: number | null) => void;
}

const statusLabels: Record<PlaybackStatus, string> = {
  idle: "Připraveno",
  loading: "Načítání streamu",
  ready: "Připraveno k přehrání",
  playing: "Přehrává se",
  paused: "Pozastaveno",
  buffering: "Načítání dat",
  ended: "Přehrávání dokončeno",
  error: "Chyba přehrávání",
  unsupported: "Nepodporovaný formát"
};

export function WebPlayer({ source, startAtSeconds, onProgress }: WebPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [message, setMessage] = useState("Vlož testovací URL a načti stream.");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let lastProgressAt = 0;
    let lastReportedPosition = 0;
    let resumePositionApplied = startAtSeconds <= 0;

    const reportProgress = (force = false) => {
      const position = video.currentTime;
      if (!Number.isFinite(position)) return;
      const now = Date.now();
      const movedBackwards = position < lastReportedPosition - 5;
      if (!force && !movedBackwards && now - lastProgressAt < 15_000) return;

      lastProgressAt = now;
      lastReportedPosition = position;
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
      onProgressRef.current(position, duration);
    };

    const applyResumePosition = () => {
      if (resumePositionApplied || startAtSeconds <= 0 || !Number.isFinite(video.duration)) return;
      video.currentTime = Math.min(startAtSeconds, Math.max(0, video.duration - 1));
      resumePositionApplied = true;
    };

    setMessage(source ? "Připravuji přehrávač…" : "Vlož testovací URL a načti stream.");
    setStatus(source ? "loading" : "idle");

    const handleLoaded = () => {
      applyResumePosition();
      setStatus("ready");
      setMessage("Stream je připraven. Stiskni přehrát.");
    };
    const handlePlaying = () => {
      setStatus("playing");
      setMessage("Video běží.");
      reportProgress(true);
    };
    const handleTimeUpdate = () => reportProgress();
    const handlePause = () => {
      if (!video.ended && video.currentTime > 0) {
        setStatus("paused");
        setMessage("Přehrávání je pozastavené.");
        reportProgress(true);
      }
    };
    const handleWaiting = () => {
      setStatus("buffering");
      setMessage("Čekám na další data streamu…");
    };
    const handleEnded = () => {
      setStatus("ended");
      setMessage("Přehrávání skončilo.");
      reportProgress(true);
    };
    const handleError = () => {
      setStatus("error");
      setMessage("Prohlížeč nedokázal stream načíst. Ověř URL, CORS a podporu kodeku.");
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("canplay", handleLoaded);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("canplay", handleLoaded);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    if (!source) return cleanup;

    if (source.kind === "dash") {
      setStatus("unsupported");
      setMessage("MPEG-DASH zatím není součástí webového PoC. Jeho podpora bude doplněna samostatným adaptérem.");
      return cleanup;
    }

    if (source.kind === "hls") {
      const nativeHls =
        video.canPlayType("application/vnd.apple.mpegurl") ||
        video.canPlayType("application/x-mpegURL");

      if (nativeHls) {
        video.src = source.uri;
      } else if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: true
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setStatus("error");
            setMessage("HLS engine ohlásil fatální chybu. Zkontroluj manifest, segmenty a CORS na zdroji.");
          }
        });
        hls.loadSource(source.uri);
        hls.attachMedia(video);
      } else {
        setStatus("unsupported");
        setMessage("Tento prohlížeč nepodporuje nativní HLS ani Media Source Extensions.");
      }
    } else {
      video.src = source.uri;
    }

    return cleanup;
  }, [source, startAtSeconds]);

  return (
    <div className="player-frame">
      <video
        ref={videoRef}
        className="player-video"
        controls
        playsInline
        preload="metadata"
        aria-label="MIO web testovací přehrávač"
      />
      <div className="player-status">
        <span className={"status-indicator status-" + status} />
        <span>{statusLabels[status]}</span>
        <span className="player-status-message">{message}</span>
      </div>
    </div>
  );
}
