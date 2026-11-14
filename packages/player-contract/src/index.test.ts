import { describe, expect, it } from "vitest";
import { parsePlayableUrl } from "./index";

describe("parsePlayableUrl", () => {
  it("rejects an empty input", () => {
    expect(parsePlayableUrl(" ").ok).toBe(false);
  });

  it("accepts HTTPS HLS manifests", () => {
    const result = parsePlayableUrl("https://media.example.test/live/index.m3u8");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source.kind).toBe("hls");
      expect(result.source.uri).toBe("https://media.example.test/live/index.m3u8");
    }
  });

  it("detects MPEG-DASH manifests", () => {
    const result = parsePlayableUrl("https://media.example.test/movie/manifest.mpd");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source.kind).toBe("dash");
  });

  it("treats other HTTP media URLs as direct files", () => {
    const result = parsePlayableUrl("https://media.example.test/movie.mp4?token=demo");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.source.kind).toBe("file");
  });

  it("rejects non-web protocols", () => {
    expect(parsePlayableUrl("javascript:alert(1)").ok).toBe(false);
    expect(parsePlayableUrl("file:///etc/passwd").ok).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(parsePlayableUrl("https://user:secret@media.example.test/video.mp4").ok).toBe(false);
  });
});
