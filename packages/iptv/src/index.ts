export interface M3uChannel {
  id: string;
  name: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  logo?: string;
  group?: string;
  durationSeconds?: number;
}

export interface M3uParseResult {
  channels: M3uChannel[];
  warnings: string[];
  errors: string[];
}

function splitExtInf(value: string): { metadata: string; title: string } {
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? null : character;
      continue;
    }

    if (character === "," && !quote) {
      return {
        metadata: value.slice(0, index).trim(),
        title: value.slice(index + 1).trim()
      };
    }
  }

  return { metadata: value.trim(), title: "" };
}

function parseAttributes(value: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]*))/g;

  for (const match of value.matchAll(pattern)) {
    const key = match[1];
    const attributeValue = match[2] ?? match[3] ?? match[4] ?? "";
    if (key) attributes[key.toLowerCase()] = attributeValue;
  }

  return attributes;
}

function validateStreamUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function parseM3uPlaylist(input: string): M3uParseResult {
  const channels: M3uChannel[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const lines = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");

  let pending: {
    name: string;
    attributes: Record<string, string>;
    durationSeconds?: number;
    group?: string;
  } | null = null;

  let pendingGroup = "";
  let hasHeader = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const lineNumber = index + 1;

    if (!line) continue;

    if (line === "#EXTM3U" || line.startsWith("#EXTM3U ")) {
      hasHeader = true;
      continue;
    }

    if (line.startsWith("#EXTGRP:")) {
      pendingGroup = line.slice("#EXTGRP:".length).trim();
      continue;
    }

    if (line.startsWith("#EXTINF:")) {
      if (pending) {
        warnings.push("Řádek " + lineNumber + ": předchozí položka EXTINF neměla stream URL.");
      }

      const payload = line.slice("#EXTINF:".length);
      const split = splitExtInf(payload);
      const durationMatch = split.metadata.match(/^(-?\d+(?:\.\d+)?)/);
      const duration = durationMatch ? Number(durationMatch[1]) : undefined;
      const attributeText = durationMatch
        ? split.metadata.slice(durationMatch[0].length).trim()
        : split.metadata;
      const attributes = parseAttributes(attributeText);
      const name = split.title || attributes["tvg-name"] || attributes["tvg-id"] || "Neznámý kanál";

      pending = {
        name,
        attributes,
        ...(duration !== undefined && duration >= 0 ? { durationSeconds: duration } : {}),
        ...(attributes["group-title"] ? { group: attributes["group-title"] } : {})
      };
      pendingGroup = "";
      continue;
    }

    if (line.startsWith("#EXTVLCOPT:") || line.startsWith("#KODIPROP:")) {
      warnings.push("Řádek " + lineNumber + ": přehrávací direktiva nebyla aplikována.");
      continue;
    }

    if (line.startsWith("#")) continue;

    if (!pending) {
      warnings.push("Řádek " + lineNumber + ": URL bez předchozího EXTINF byla přeskočena.");
      continue;
    }

    if (!validateStreamUrl(line)) {
      warnings.push("Řádek " + lineNumber + ": stream URL není podporovaná HTTP(S) adresa nebo obsahuje userinfo.");
      pending = null;
      continue;
    }

    const channel: M3uChannel = {
      id: (pending.attributes["tvg-id"] || pending.name) + "-" + (channels.length + 1),
      name: pending.name,
      url: line
    };

    if (pending.attributes["tvg-id"]) channel.tvgId = pending.attributes["tvg-id"];
    if (pending.attributes["tvg-name"]) channel.tvgName = pending.attributes["tvg-name"];
    if (pending.attributes["tvg-logo"]) channel.logo = pending.attributes["tvg-logo"];

    const group = pending.group || pendingGroup;
    if (group) channel.group = group;
    if (pending.durationSeconds !== undefined) channel.durationSeconds = pending.durationSeconds;

    channels.push(channel);
    pending = null;
  }

  if (pending) {
    warnings.push("Poslední položka EXTINF nemá následující stream URL.");
  }

  if (!hasHeader) {
    warnings.push("Playlist neobsahuje hlavičku #EXTM3U. Pokračoval jsem v tolerantním režimu.");
  }

  if (channels.length === 0) {
    errors.push("V playlistu nebyl nalezen žádný platný HTTP(S) kanál.");
  }

  return { channels, warnings, errors };
}
