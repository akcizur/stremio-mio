import { describe, expect, it } from "vitest";
import { getChannelFavoriteKey, migrateLegacyIptvPlaylist, parseM3uPlaylist, parseXmltv } from "./index";

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
      "#EXTINF:-1,Channel One",
      "#EXTVLCOPT:http-user-agent=Example",
      "https://stream.example.test/live.m3u8"
    ].join("\n"));

    expect(result.channels).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("direktiva"))).toBe(true);
  });
});

describe("parseXmltv", () => {
  it("parses channels and programmes with their timezone offsets", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE tv SYSTEM "xmltv.dtd">
      <tv>
        <channel id="ct1.cz">
          <display-name lang="cs">ČT 1</display-name>
          <icon src="https://img.example.test/ct1.png" />
        </channel>
        <programme start="20261114180000 +0100" stop="20261114190000 +0100" channel="ct1.cz">
          <title lang="cs">Události</title>
          <desc>Večerní zpravodajství</desc>
          <category>News</category>
        </programme>
      </tv>`;

    const result = parseXmltv(xml);

    expect(result.errors).toHaveLength(0);
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0]).toMatchObject({
      id: "ct1.cz",
      displayName: "ČT 1",
      icon: "https://img.example.test/ct1.png"
    });
    expect(result.programmes).toHaveLength(1);
    expect(result.programmes[0]).toMatchObject({
      channelId: "ct1.cz",
      title: "Události",
      description: "Večerní zpravodajství",
      categories: ["News"],
      language: "cs",
      start: Date.UTC(2026, 10, 14, 17, 0, 0),
      stop: Date.UTC(2026, 10, 14, 18, 0, 0)
    });
    expect(result.warnings).toContain("Externí XMLTV DTD byla ignorována; MIO ji nenačítá.");
  });

  it("rejects internal DTD entity declarations", () => {
    const result = parseXmltv('<!DOCTYPE tv [<!ENTITY x "boom">]><tv></tv>');
    expect(result.errors[0]).toContain("entity deklarace");
  });

  it("rejects XML payloads above the size limit", () => {
    const result = parseXmltv("<tv>" + "x".repeat(20 * 1024 * 1024) + "</tv>");
    expect(result.errors[0]).toContain("20 MB");
  });

  it("rejects invalid XML", () => {
    const result = parseXmltv("<tv><channel></tv>");
    expect(result.errors[0]).toContain("validní XML");
  });

  it("rejects ambiguous timestamps", () => {
    const xml = `<tv>
      <programme start="20261114180000" stop="20261114190000" channel="ct1">
        <title>Programme</title>
      </programme>
    </tv>`;
    const result = parseXmltv(xml);
    expect(result.programmes).toHaveLength(0);
    expect(result.warnings[0]).toContain("Přeskočeno 1 pořadů");
  });
});

describe("getChannelFavoriteKey", () => {
  it("uses a normalized TVG ID so favourites survive playlist URL changes", () => {
    expect(getChannelFavoriteKey({
      tvgId: " CT1.CZ ",
      url: "https://stream-one.example.test/live.m3u8"
    })).toBe("tvg:ct1.cz");

    expect(getChannelFavoriteKey({
      tvgId: "ct1.cz",
      url: "https://stream-two.example.test/live.m3u8"
    })).toBe("tvg:ct1.cz");
  });

  it("falls back to a normalized stream URL when the TVG ID is missing", () => {
    expect(getChannelFavoriteKey({
      url: "https://STREAM.example.test:443/live.m3u8"
    })).toBe("url:https://stream.example.test/live.m3u8");
  });
});

describe("migrateLegacyIptvPlaylist", () => {
  it("preserves the existing playlist data and assigns a stable legacy ID", () => {
    const legacy = {
      name: "old-favourites.m3u",
      updatedAt: 1_700_000_000_000,
      channels: [{
        id: "channel-1",
        name: "Channel One",
        url: "https://stream.example.test/live.m3u8"
      }]
    };

    const migrated = migrateLegacyIptvPlaylist(legacy);

    expect(migrated).toEqual({
      ...legacy,
      id: "legacy-" + legacy.updatedAt.toString(36)
    });
    expect(migrateLegacyIptvPlaylist(legacy).id).toBe(migrated.id);
  });
});
