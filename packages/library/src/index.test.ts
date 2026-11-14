import { describe, expect, it } from "vitest";
import { sortLibraryEntries, type LibraryEntry } from "./index";

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
