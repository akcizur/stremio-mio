import { describe, expect, it } from "vitest";
import { sortLibraryEntries, sortPlaybackHistory, type LibraryEntry, type PlaybackHistoryEntry } from "./index";

const entries: LibraryEntry[] = [
  {
    id: "older",
    title: "Older title",
    subtitle: "Drama",
    mediaType: "movie",
    addedAt: 100,
    isFavorite: true,
    playbackPositionSeconds: 0
  },
  {
    id: "newer",
    title: "Newer title",
    subtitle: "Sci-fi",
    mediaType: "series",
    addedAt: 300,
    isFavorite: true,
    playbackPositionSeconds: 25
  },
  {
    id: "middle",
    title: "Middle title",
    subtitle: "Mystery",
    mediaType: "episode",
    addedAt: 200,
    isFavorite: false,
    playbackPositionSeconds: 0
  }
];

describe("sortLibraryEntries", () => {
  it("sorts newest entries first without mutating the original array", () => {
    const sorted = sortLibraryEntries(entries);

    expect(sorted.map((entry) => entry.id)).toEqual(["newer", "middle", "older"]);
    expect(entries.map((entry) => entry.id)).toEqual(["older", "newer", "middle"]);
  });
});


describe("sortPlaybackHistory", () => {
  const history: PlaybackHistoryEntry[] = [
    { id: "older", title: "Older stream", uri: "https://one.example/live.m3u8", kind: "hls", lastPlayedAt: 100, positionSeconds: 30, durationSeconds: 300 },
    { id: "newer", title: "Newer stream", uri: "https://two.example/movie.mp4", kind: "file", lastPlayedAt: 300, positionSeconds: 90, durationSeconds: 900 },
    { id: "middle", title: "Middle stream", uri: "https://three.example/live.m3u8", kind: "hls", lastPlayedAt: 200, positionSeconds: 0, durationSeconds: null }
  ];

  it("sorts most recently played streams first without mutating input", () => {
    const sorted = sortPlaybackHistory(history);
    expect(sorted.map((entry) => entry.id)).toEqual(["newer", "middle", "older"]);
    expect(history.map((entry) => entry.id)).toEqual(["older", "newer", "middle"]);
  });
});
