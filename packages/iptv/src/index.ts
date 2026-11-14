import { XMLParser, XMLValidator } from "fast-xml-parser";

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

export interface XmltvChannel {
  id: string;
  displayName: string;
  icon?: string;
}

export interface XmltvProgramme {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  categories: string[];
  start: number;
  stop: number;
  language?: string;
}

export interface XmltvParseResult {
  channels: XmltvChannel[];
  programmes: XmltvProgramme[];
  warnings: string[];
  errors: string[];
}

export interface EpochRange {
  start: number;
  end: number;
}

export function getLocalDayRange(dateValue: string): EpochRange | null {
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const startDate = new Date(year, month - 1, day);
  if (startDate.getFullYear() !== year || startDate.getMonth() !== month - 1 || startDate.getDate() !== day) return null;
  const endDate = new Date(year, month - 1, day + 1);
  return { start: startDate.getTime(), end: endDate.getTime() };
}

export interface StoredIptvPlaylist {
  id: string;
  name: string;
  updatedAt: number;
  channels: M3uChannel[];
  isDemo?: boolean;
}

export type LegacyStoredIptvPlaylist = Omit<StoredIptvPlaylist, "id">;

export function migrateLegacyIptvPlaylist(
  playlist: LegacyStoredIptvPlaylist
): StoredIptvPlaylist {
  return {
    ...playlist,
    id: "legacy-" + Math.max(0, playlist.updatedAt).toString(36)
  };
}

export interface StoredXmltvGuide {
  name: string;
  updatedAt: number;
  channels: XmltvChannel[];
  programmes: XmltvProgramme[];
  isDemo?: boolean;
}

export interface DemoIptvData {
  playlist: StoredIptvPlaylist;
  guide: StoredXmltvGuide;
}

export const DEMO_HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export function createDemoIptvData(now = Date.now()): DemoIptvData {
  const timestamp = Number.isFinite(now) ? now : Date.now();
  const channelId = "mio.demo.cinema";
  const channelName = "MIO Demo Cinema";
  const interval = 30 * 60_000;
  const firstStart = Math.floor(timestamp / interval) * interval - interval;
  const sampleProgrammes = [
    { title: "MIO Cinema · Ukázkový přenos", category: "Film", description: "Veřejná ukázka HLS přehrávání. Nejde o skutečné televizní vysílání." },
    { title: "Player Lab · Adaptivní stream", category: "Technologie", description: "Testovací pořad pro ověření načítání manifestu a přehrávání HLS." },
    { title: "MIO Cinema · Obraz a zvuk", category: "Film", description: "Ukázková položka programu navázaná na veřejný testovací stream." },
    { title: "MIO Lab · Přepnutí kvality", category: "Technologie", description: "Časová osa EPG a detail pořadu fungují nad lokálními demonstračními daty." },
    { title: "MIO Cinema · Večerní projekce", category: "Film", description: "Veřejný HLS vzorek může být kdykoli nahrazen vlastním M3U playlistem." },
    { title: "MIO Lab · Test přehrávače", category: "Technologie", description: "Ukázka detailu programu, připomínky a spuštění stanice." },
    { title: "MIO Cinema · Další ukázka", category: "Film", description: "Demonstrační EPG se při další návštěvě aktualizuje podle lokálního času." },
    { title: "MIO Lab · Závěrečný blok", category: "Technologie", description: "Jde o vzorová metadata, nikoli o redakční televizní program." },
    { title: "MIO Cinema · Noční projekce", category: "Film", description: "Ukázkový záznam EPG pro horizontální i celodenní navigaci." },
    { title: "MIO Lab · Volný test", category: "Technologie", description: "Přehraj stream nebo nahraj vlastní soubor M3U a XMLTV." }
  ];

  const channel: M3uChannel = {
    id: "mio-demo-cinema-1",
    name: channelName,
    tvgId: channelId,
    tvgName: channelName,
    url: DEMO_HLS_URL,
    group: "Demo · VOD"
  };

  const programmes = sampleProgrammes.map((sample, index) => {
    const start = firstStart + index * interval;
    return {
      id: channelId + ":" + start + ":" + sample.title,
      channelId,
      title: sample.title,
      categories: [sample.category],
      description: sample.description,
      start,
      stop: start + interval
    };
  });

  return {
    playlist: {
      id: "mio-demo-playlist",
      name: "MIO Demo · Cinema",
      updatedAt: timestamp,
      channels: [channel],
      isDemo: true
    },
    guide: {
      name: "MIO Demo · EPG",
      updatedAt: timestamp,
      channels: [{ id: channelId, displayName: channelName }],
      programmes,
      isDemo: true
    }
  };
}

export interface EpgReminder {
  id: string;
  playlistId: string;
  programmeId: string;
  channelId: string;
  channelName: string;
  title: string;
  start: number;
  stop: number;
  createdAt: number;
  notificationsEnabled: boolean;
  notifiedAt: number | null;
}

export function getChannelFavoriteKey(channel: Pick<M3uChannel, "tvgId" | "url">): string {
  const tvgId = channel.tvgId?.trim();
  if (tvgId) return "tvg:" + tvgId.toLocaleLowerCase("en-US");
  return "url:" + new URL(channel.url).href;
}

export function getEpgMappingKey(
  playlistId: string,
  channel: Pick<M3uChannel, "tvgId" | "url">
): string {
  return "playlist:" + encodeURIComponent(playlistId) + ":" + getChannelFavoriteKey(channel);
}

export function resolveEpgChannelId(
  playlistId: string,
  channel: Pick<M3uChannel, "tvgId" | "url">,
  mappings: Record<string, string>,
  availableXmltvIds: ReadonlySet<string>
): string | undefined {
  const manualId = mappings[getEpgMappingKey(playlistId, channel)];
  if (manualId && availableXmltvIds.has(manualId)) return manualId;
  if (channel.tvgId && availableXmltvIds.has(channel.tvgId)) return channel.tvgId;
  return undefined;
}

export function getEpgReminderId(playlistId: string, channelId: string, start: number): string {
  return "playlist:" + encodeURIComponent(playlistId) +
    ":channel:" + encodeURIComponent(channelId) +
    ":start:" + Math.trunc(start);
}

export function sortEpgReminders(reminders: EpgReminder[]): EpgReminder[] {
  return [...reminders].sort((left, right) =>
    left.start - right.start || left.createdAt - right.createdAt
  );
}

export function isEpgReminderDue(reminder: EpgReminder, now: number, leadMinutes = 5): boolean {
  const leadMs = Math.max(0, Number.isFinite(leadMinutes) ? leadMinutes : 5) * 60_000;
  return reminder.notifiedAt === null &&
    reminder.start > now &&
    reminder.stop > reminder.start &&
    now >= reminder.start - leadMs;
}

function sanitizeEpgReminders(value: unknown): EpgReminder[] {
  if (!Array.isArray(value)) return [];
  const valid = value.filter((item): item is EpgReminder => {
    if (!item || typeof item !== "object") return false;
    const reminder = item as Partial<EpgReminder>;
    return typeof reminder.id === "string" && reminder.id.length > 0 &&
      typeof reminder.playlistId === "string" && reminder.playlistId.length > 0 &&
      typeof reminder.programmeId === "string" &&
      typeof reminder.channelId === "string" && reminder.channelId.length > 0 &&
      typeof reminder.channelName === "string" &&
      typeof reminder.title === "string" && reminder.title.length > 0 &&
      typeof reminder.start === "number" && Number.isFinite(reminder.start) &&
      typeof reminder.stop === "number" && Number.isFinite(reminder.stop) &&
      reminder.stop > reminder.start &&
      typeof reminder.createdAt === "number" && Number.isFinite(reminder.createdAt) &&
      typeof reminder.notificationsEnabled === "boolean" &&
      (reminder.notifiedAt === null ||
        (typeof reminder.notifiedAt === "number" && Number.isFinite(reminder.notifiedAt)));
  });
  const unique = new Map(valid.map((reminder) => [reminder.id, reminder]));
  return sortEpgReminders([...unique.values()]);
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
    if (pending.attributes["tvg-logo"] && validateStreamUrl(pending.attributes["tvg-logo"])) {
      channel.logo = pending.attributes["tvg-logo"];
    }

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

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const text = asRecord(value)["#text"];
    return typeof text === "string" || typeof text === "number" ? String(text).trim() : "";
  }
  return "";
}

function attribute(value: unknown, name: string): string {
  const field = asRecord(value)["@_" + name];
  return typeof field === "string" || typeof field === "number" ? String(field).trim() : "";
}

function parseXmltvTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour) ||
    date.getUTCMinutes() !== Number(minute) ||
    date.getUTCSeconds() !== Number(second)
  ) return null;

  if (!sign || !offsetHour || !offsetMinute) return null;

  const hours = Number(offsetHour);
  const minutes = Number(offsetMinute);
  if (hours > 14 || minutes > 59) return null;

  const offset = (hours * 60 + minutes) * 60_000 * (sign === "+" ? 1 : -1);
  return timestamp - offset;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  maxNestedTags: 32
});

export function parseXmltv(input: string): XmltvParseResult {
  const channels: XmltvChannel[] = [];
  const programmes: XmltvProgramme[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (input.length > 20 * 1024 * 1024) {
    return { channels, programmes, warnings, errors: ["XMLTV soubor překračuje limit 20 MB."] };
  }

  let xml = input.replace(/^\uFEFF/, "").trim();
  if (!xml) {
    return { channels, programmes, warnings, errors: ["XMLTV soubor je prázdný."] };
  }

  if (/<!ENTITY\b/i.test(xml) || /<!DOCTYPE\b[^>]*\[/i.test(xml)) {
    return {
      channels,
      programmes,
      warnings,
      errors: ["XMLTV obsahuje vlastní DTD/entity deklarace, které MIO z bezpečnostních důvodů nepřijímá."]
    };
  }

  if (/<!DOCTYPE\b/i.test(xml)) {
    const externalDoctype = /<!DOCTYPE\s+tv\s+(?:SYSTEM\s+["'][^"']+["']|PUBLIC\s+["'][^"']+["']\s+["'][^"']+["'])\s*>/i;
    if (!externalDoctype.test(xml)) {
      return { channels, programmes, warnings, errors: ["Nepodporovaná DOCTYPE deklarace v XMLTV."] };
    }
    xml = xml.replace(externalDoctype, "");
    warnings.push("Externí XMLTV DTD byla ignorována; MIO ji nenačítá.");
  }

  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    const detail = typeof validation === "object" && "err" in validation
      ? String(validation.err?.msg ?? "neznámá chyba")
      : "neplatná XML struktura";
    return { channels, programmes, warnings, errors: ["XMLTV není validní XML: " + detail] };
  }

  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return { channels, programmes, warnings, errors: ["XMLTV se nepodařilo bezpečně parsovat."] };
  }

  const root = asRecord(asRecord(parsed).tv);
  if (Object.keys(root).length === 0) {
    return { channels, programmes, warnings, errors: ["V XML souboru nebyl nalezen kořenový element tv."] };
  }

  for (const rawChannel of asArray(root.channel)) {
    const channelId = attribute(rawChannel, "id");
    if (!channelId) {
      warnings.push("Kanál bez atributu id byl přeskočen.");
      continue;
    }

    const displayNames = asArray(asRecord(rawChannel)["display-name"])
      .map(textValue)
      .filter(Boolean);
    const displayName = displayNames[0] || channelId;
    const icon = attribute(asArray(asRecord(rawChannel).icon)[0], "src");
    const channel: XmltvChannel = { id: channelId, displayName };
    if (icon && validateStreamUrl(icon)) channel.icon = icon;
    channels.push(channel);
  }

  let skippedProgrammes = 0;

  for (const rawProgramme of asArray(root.programme)) {
    const channelId = attribute(rawProgramme, "channel");
    const startText = attribute(rawProgramme, "start");
    const stopText = attribute(rawProgramme, "stop");
    const start = parseXmltvTimestamp(startText);
    const stop = parseXmltvTimestamp(stopText);
    const titleNode = asArray(asRecord(rawProgramme).title)[0];
    const title = textValue(titleNode);

    if (!channelId || start === null || stop === null || stop <= start || !title) {
      skippedProgrammes += 1;
      continue;
    }

    const descriptionNode = asArray(asRecord(rawProgramme).desc)[0];
    const description = textValue(descriptionNode);
    const categories = asArray(asRecord(rawProgramme).category).map(textValue).filter(Boolean);
    const language = attribute(titleNode, "lang");
    const programme: XmltvProgramme = {
      id: channelId + ":" + start + ":" + title,
      channelId,
      title,
      categories,
      start,
      stop
    };

    if (description) programme.description = description;
    if (language) programme.language = language;
    programmes.push(programme);
  }

  if (skippedProgrammes > 0) {
    warnings.push("Přeskočeno " + skippedProgrammes + " pořadů s neúplnými nebo neplatnými údaji.");
  }

  channels.sort((a, b) => a.displayName.localeCompare(b.displayName, "cs"));
  programmes.sort((a, b) => a.start - b.start);

  if (channels.length === 0 && programmes.length === 0) {
    errors.push("XMLTV neobsahuje žádné použitelné kanály ani pořady.");
  }

  return { channels, programmes, warnings, errors };
}

export class IptvLocalRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async initializeDemoDataIfEmpty(): Promise<void> {
    const initialized = await this.get<boolean>("demo-data-initialized");
    const [playlists, guide] = await Promise.all([this.loadPlaylists(), this.loadGuide()]);

    if (initialized !== true && playlists.length === 0 && !guide) {
      const demo = createDemoIptvData();
      await this.savePlaylist(demo.playlist);
      await this.saveGuide(demo.guide);
      await this.saveActivePlaylistId(demo.playlist.id);
    } else {
      const hasDemoPlaylist = playlists.some((playlist) => playlist.isDemo);
      const demoGuideIsStale = guide?.isDemo === true && Date.now() - guide.updatedAt > 6 * 60 * 60_000;
      if (hasDemoPlaylist && demoGuideIsStale) {
        await this.saveGuide(createDemoIptvData().guide);
      }
    }

    if (initialized !== true) await this.put("demo-data-initialized", true);
  }

  async loadPlaylists(): Promise<StoredIptvPlaylist[]> {
    const stored = await this.get<unknown>("playlists");
    if (Array.isArray(stored)) {
      return stored.filter((item): item is StoredIptvPlaylist => (
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as StoredIptvPlaylist).id === "string" &&
        typeof (item as StoredIptvPlaylist).name === "string" &&
        Array.isArray((item as StoredIptvPlaylist).channels)
      ));
    }

    // One-time migration from the original single-playlist storage key.
    const legacy = await this.get<LegacyStoredIptvPlaylist>("playlist");
    if (!legacy || !Array.isArray(legacy.channels)) return [];

    const migrated = migrateLegacyIptvPlaylist(legacy);
    await this.put("playlists", [migrated]);
    await this.remove("playlist");
    return [migrated];
  }

  async savePlaylist(value: StoredIptvPlaylist): Promise<void> {
    const playlists = await this.loadPlaylists();
    const existingIndex = playlists.findIndex((playlist) => playlist.id === value.id);
    const updated = [...playlists];
    if (existingIndex >= 0) updated[existingIndex] = value;
    else updated.push(value);
    updated.sort((left, right) => right.updatedAt - left.updatedAt);
    await this.put("playlists", updated);
  }

  async removePlaylist(id: string): Promise<void> {
    const playlists = await this.loadPlaylists();
    await this.put("playlists", playlists.filter((playlist) => playlist.id !== id));
  }

  async loadActivePlaylistId(): Promise<string | null> {
    return this.get<string>("active-playlist");
  }

  async saveActivePlaylistId(id: string | null): Promise<void> {
    if (id) await this.put("active-playlist", id);
    else await this.remove("active-playlist");
  }

  async loadGuide(): Promise<StoredXmltvGuide | null> {
    return this.get<StoredXmltvGuide>("guide");
  }

  async saveGuide(value: StoredXmltvGuide): Promise<void> {
    await this.put("guide", value);
  }

  async loadFavoriteChannelKeys(): Promise<string[]> {
    const stored = await this.get<unknown>("favorite-channels");
    return Array.isArray(stored)
      ? stored.filter((key): key is string => typeof key === "string" && key.length > 0)
      : [];
  }

  async saveFavoriteChannelKeys(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
    await this.put("favorite-channels", uniqueKeys);
  }

  async loadEpgMappings(): Promise<Record<string, string>> {
    const stored = await this.get<unknown>("epg-mappings");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    return Object.fromEntries(
      Object.entries(stored as Record<string, unknown>)
        .filter(([key, value]) => key.length > 0 && typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, (value as string).trim()])
    );
  }

  async saveEpgMappings(mappings: Record<string, string>): Promise<void> {
    const sanitized = Object.fromEntries(
      Object.entries(mappings)
        .filter(([key, value]) => key.length > 0 && typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, value.trim()])
    );
    await this.put("epg-mappings", sanitized);
  }

  async loadEpgReminders(): Promise<EpgReminder[]> {
    return sanitizeEpgReminders(await this.get<unknown>("epg-reminders"));
  }

  async saveEpgReminders(reminders: EpgReminder[]): Promise<void> {
    await this.put("epg-reminders", sanitizeEpgReminders(reminders));
  }

  async clearGuide(): Promise<void> {
    await this.remove("guide");
  }

  private database(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("Toto prostředí nepodporuje IndexedDB."));
    }
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("mio-iptv", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("records")) {
          database.createObjectStore("records", { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error("IPTV úložiště se nepodařilo otevřít."));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("IPTV úložiště blokuje jiná verze aplikace."));
      };
    });
    return this.databasePromise;
  }

  private async get<T>(id: string): Promise<T | null> {
    const database = await this.database();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("records", "readonly");
      const request = transaction.objectStore("records").get(id);
      let result: T | null = null;
      request.onsuccess = () => {
        const record = request.result as { value: T } | undefined;
        result = record?.value ?? null;
      };
      request.onerror = () => reject(request.error ?? new Error("Čtení IPTV úložiště selhalo."));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("Čtení IPTV úložiště selhalo."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Čtení IPTV úložiště bylo přerušeno."));
    });
  }

  private async put<T>(id: string, value: T): Promise<void> {
    const database = await this.database();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("records", "readwrite");
      transaction.objectStore("records").put({ id, value });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Zápis IPTV úložiště selhal."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Zápis IPTV úložiště byl přerušen."));
    });
  }

  private async remove(id: string): Promise<void> {
    const database = await this.database();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("records", "readwrite");
      transaction.objectStore("records").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Mazání IPTV úložiště selhalo."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Mazání IPTV úložiště bylo přerušeno."));
    });
  }
}
