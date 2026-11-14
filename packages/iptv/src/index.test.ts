import { describe, expect, it } from "vitest";
import { parseM3uPlaylist } from "./index";

describe("parseM3uPlaylist", () => {
  it("parses channel names, quoted attributes and groups", () => {
    const playlist = [
      "#EXTM3U",
      '#EXTINF:-1 tvg-id="ct1.cz" tvg-name="ČT 1" tvg-logo="https://img.example.test/ct1.png" group-title="České",ČT 1 HD',
      "https://stream.example.test/ct1/index.m3u8"
    ].join("\n");

    const result = parseM3uPlaylist(playlist);

    expect(result.errors).toHaveLength(0);
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0]).toMatchObject({
      name: "ČT 1 HD",
      tvgId: "ct1.cz",
      tvgName: "ČT 1",
      logo: "https://img.example.test/ct1.png",
      group: "České",
      url: "https://stream.example.test/ct1/index.m3u8"
    });
  });

  it("supports multiple channels and CRLF line endings", () => {
    const playlist = [
      "#EXTM3U",
      '#EXTINF:-1 group-title="News",News One',
      "https://stream.example.test/news.m3u8",
      '#EXTINF:-1 group-title="Sport",Sport One',
      "https://stream.example.test/sport.m3u8"
    ].join("\r\n");

    const result = parseM3uPlaylist(playlist);

    expect(result.channels.map((channel) => channel.name)).toEqual(["News One", "Sport One"]);
    expect(result.channels.map((channel) => channel.group)).toEqual(["News", "Sport"]);
  });

  it("rejects non-HTTP stream URLs", () => {
    const result = parseM3uPlaylist([
      "#EXTM3U",
      "#EXTINF:-1,Local file",
      "file:///media/video.mp4"
    ].join("\n"));

    expect(result.channels).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it("rejects URLs with credentials in userinfo", () => {
    const result = parseM3uPlaylist([
      "#EXTM3U",
      "#EXTINF:-1,Private channel",
      "https://name:password@stream.example.test/live.m3u8"
    ].join("\n"));

    expect(result.channels).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("handles a UTF-8 BOM and reports a missing header", () => {
    const result = parseM3uPlaylist(
      "\uFEFF#EXTINF:-1,Channel\nhttps://stream.example.test/live.m3u8"
    );

    expect(result.channels).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("#EXTM3U"))).toBe(true);
  });

  it("does not treat directive-only rows as channel URLs", () => {
    const result = parseM3uPlaylist([
      "#EXTM3U",
      '#EXTINF:-1,Channel One',
      "#EXTVLCOPT:http-user-agent=Example",
      "https://stream.example.test/live.m3u8"
    ].join("\n"));

    expect(result.channels).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("direktiva"))).toBe(true);
  });
});
