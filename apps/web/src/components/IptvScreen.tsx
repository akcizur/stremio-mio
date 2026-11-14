import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { EpgGrid } from "./EpgGrid";
import {
  IptvLocalRepository,
  getChannelFavoriteKey,
  getEpgMappingKey,
  getEpgReminderId,
  isEpgReminderDue,
  sortEpgReminders,
  resolveEpgChannelId,
  parseM3uPlaylist,
  parseXmltv,
  type EpgReminder,
  type M3uChannel,
  type XmltvProgramme,
  type StoredIptvPlaylist,
  type StoredXmltvGuide
} from "@mio/iptv";

interface IptvScreenProps {
  onPlay: (channel: M3uChannel) => void;
}

const iptvRepository = new IptvLocalRepository();

export function IptvScreen({ onPlay }: IptvScreenProps) {
  const [playlists, setPlaylists] = useState<StoredIptvPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Všechny skupiny");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState<StoredXmltvGuide | null>(null);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(() => new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [epgMappings, setEpgMappings] = useState<Record<string, string>>({});
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, string>>({});
  const [guideWarnings, setGuideWarnings] = useState<string[]>([]);
  const [guideError, setGuideError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reminders, setReminders] = useState<EpgReminder[]>([]);
  const [reminderError, setReminderError] = useState("");
  const [reminderNotice, setReminderNotice] = useState("");
  const notifiedReminderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    iptvRepository.initializeDemoDataIfEmpty()
      .then(() => Promise.all([
      iptvRepository.loadPlaylists(),
      iptvRepository.loadActivePlaylistId(),
      iptvRepository.loadGuide(),
      iptvRepository.loadFavoriteChannelKeys(),
      iptvRepository.loadEpgMappings(),
      iptvRepository.loadEpgReminders()
      ]))
      .then(([storedPlaylists, storedActiveId, storedGuide, storedFavoriteKeys, storedEpgMappings, storedReminders]) => {
        if (cancelled) return;
        setPlaylists(storedPlaylists);
        const selected = storedPlaylists.find((playlist) => playlist.id === storedActiveId) ?? storedPlaylists[0] ?? null;
        setActivePlaylistId(selected?.id ?? null);
        if (selected && selected.id !== storedActiveId) {
          void iptvRepository.saveActivePlaylistId(selected.id);
        }
        if (storedGuide) setGuide(storedGuide);
        setFavoriteKeys(new Set(storedFavoriteKeys));
        setEpgMappings(storedEpgMappings);
        setReminders(storedReminders);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Lokální IPTV data se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!isReady) return;
    const due = reminders.filter((reminder) =>
      isEpgReminderDue(reminder, now) && !notifiedReminderIds.current.has(reminder.id)
    );
    if (due.length === 0) return;

    const dueIds = new Set(due.map((reminder) => reminder.id));
    due.forEach((reminder) => notifiedReminderIds.current.add(reminder.id));
    const updated = reminders.map((reminder) =>
      dueIds.has(reminder.id) ? { ...reminder, notifiedAt: now } : reminder
    );
    setReminders(updated);
    void iptvRepository.saveEpgReminders(updated).catch((cause: unknown) => {
      setReminderError(cause instanceof Error ? cause.message : "Stav připomínek se nepodařilo uložit.");
    });

    const notificationTitles: string[] = [];
    for (const reminder of due) {
      notificationTitles.push(reminder.title);
      if (!reminder.notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") continue;
      try {
        new Notification("Za chvíli začíná: " + reminder.title, {
          body: reminder.channelName + " · " + new Date(reminder.start).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
          tag: reminder.id
        });
      } catch {
        // In-app reminder state is still updated when browser notifications are unavailable.
      }
    }
    setReminderNotice(notificationTitles.join(", ") + (notificationTitles.length === 1 ? " začíná za chvíli." : " začínají za chvíli."));
  }, [isReady, now, reminders]);


  const activePlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === activePlaylistId) ?? null,
    [playlists, activePlaylistId]
  );
  const channels = activePlaylist?.channels ?? [];
  const playlistName = activePlaylist?.name ?? "";

  const groups = useMemo(
    () => Array.from(new Set(channels.map((channel) => channel.group).filter((group): group is string => Boolean(group)))).sort((a, b) => a.localeCompare(b, "cs")),
    [channels]
  );

  const visibleChannels = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("cs-CZ");

    return channels.filter((channel) => {
      const matchesSearch = !normalized || (
        channel.name + " " + (channel.tvgId ?? "") + " " + (channel.group ?? "")
      ).toLocaleLowerCase("cs-CZ").includes(normalized);
      const matchesGroup = selectedGroup === "Všechny skupiny" || channel.group === selectedGroup;
      const matchesFavorite = !favoritesOnly || favoriteKeys.has(getChannelFavoriteKey(channel));
      return matchesSearch && matchesGroup && matchesFavorite;
    });
  }, [channels, search, selectedGroup, favoritesOnly, favoriteKeys]);

  const guideByChannel = useMemo(() => {
    const map = new Map<string, XmltvProgramme[]>();
    for (const programme of guide?.programmes ?? []) {
      const existing = map.get(programme.channelId) ?? [];
      existing.push(programme);
      map.set(programme.channelId, existing);
    }
    return map;
  }, [guide]);

  const guideChannelOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const channel of guide?.channels ?? []) names.set(channel.id, channel.displayName);
    for (const programme of guide?.programmes ?? []) {
      if (!names.has(programme.channelId)) names.set(programme.channelId, programme.channelId);
    }
    return [...names.entries()]
      .map(([id, displayName]) => ({ id, displayName }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, "cs"));
  }, [guide]);

  const guideChannelIds = useMemo(
    () => new Set(guideChannelOptions.map((item) => item.id)),
    [guideChannelOptions]
  );

  function getResolvedGuideChannelId(channel: M3uChannel): string | undefined {
    if (!activePlaylistId) return undefined;
    return resolveEpgChannelId(activePlaylistId, channel, epgMappings, guideChannelIds);
  }

  const guideMatchedCount = useMemo(
    () => channels.filter((channel) => {
      const channelId = getResolvedGuideChannelId(channel);
      return Boolean(channelId && guideByChannel.has(channelId));
    }).length,
    [channels, guideByChannel, guideChannelIds, epgMappings, activePlaylistId]
  );

  const favoriteChannelCount = useMemo(
    () => channels.filter((channel) => favoriteKeys.has(getChannelFavoriteKey(channel))).length,
    [channels, favoriteKeys]
  );

  const activeReminders = useMemo(
    () => activePlaylistId
      ? sortEpgReminders(reminders.filter((reminder) => reminder.playlistId === activePlaylistId && reminder.stop > now))
      : [],
    [reminders, activePlaylistId, now]
  );

  async function toggleFavorite(channel: M3uChannel) {
    const key = getChannelFavoriteKey(channel);
    const nextKeys = new Set(favoriteKeys);
    if (nextKeys.has(key)) nextKeys.delete(key);
    else nextKeys.add(key);

    try {
      await iptvRepository.saveFavoriteChannelKeys([...nextKeys]);
      setFavoriteKeys(nextKeys);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Oblíbené kanály se nepodařilo uložit.");
    }
  }

  async function toggleEpgReminder(channel: M3uChannel, programme: XmltvProgramme) {
    if (!activePlaylistId) return;
    const id = getEpgReminderId(activePlaylistId, programme.channelId, programme.start);
    const exists = reminders.some((reminder) => reminder.id === id);

    if (exists) {
      const updated = reminders.filter((reminder) => reminder.id !== id);
      try {
        await iptvRepository.saveEpgReminders(updated);
        setReminders(updated);
        setReminderError("");
        setReminderNotice("Připomínka pořadu „" + programme.title + "“ byla zrušena.");
      } catch (cause) {
        setReminderError(cause instanceof Error ? cause.message : "Připomínku se nepodařilo zrušit.");
      }
      return;
    }

    if (programme.stop <= Date.now() || programme.stop <= programme.start) {
      setReminderError("Na odvysílaný nebo neplatný pořad už nelze nastavit připomínku.");
      return;
    }

    let notificationsEnabled = false;
    if (typeof Notification !== "undefined") {
      try {
        const permission = Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
        notificationsEnabled = permission === "granted";
      } catch {
        notificationsEnabled = false;
      }
    }

    const reminder: EpgReminder = {
      id,
      playlistId: activePlaylistId,
      programmeId: programme.id,
      channelId: programme.channelId,
      channelName: channel.name,
      title: programme.title,
      start: programme.start,
      stop: programme.stop,
      createdAt: Date.now(),
      notificationsEnabled,
      notifiedAt: null
    };
    const updated = sortEpgReminders([...reminders, reminder]);
    try {
      await iptvRepository.saveEpgReminders(updated);
      setReminders(updated);
      setReminderError("");
      setReminderNotice(notificationsEnabled
        ? "Připomínka nastavena. Prohlížeč zobrazí upozornění pět minut před začátkem, pokud MIO zůstane otevřené."
        : "Připomínka uložena. Automatická oznámení nejsou povolena; kontrola probíhá pouze v otevřeném MIO.");
    } catch (cause) {
      setReminderError(cause instanceof Error ? cause.message : "Připomínku se nepodařilo uložit.");
    }
  }

  async function removeEpgReminder(id: string) {
    const updated = reminders.filter((reminder) => reminder.id !== id);
    try {
      await iptvRepository.saveEpgReminders(updated);
      setReminders(updated);
      notifiedReminderIds.current.delete(id);
      setReminderError("");
    } catch (cause) {
      setReminderError(cause instanceof Error ? cause.message : "Připomínku se nepodařilo odebrat.");
    }
  }

  async function saveChannelEpgMapping(channel: M3uChannel, value: string) {
    if (!activePlaylistId) return;
    const normalized = value.trim();
    if (normalized && !guideChannelIds.has(normalized)) {
      setGuideError("XMLTV ID nebylo nalezeno. Vyber ID z nabídky našeptávače.");
      return;
    }

    const key = getEpgMappingKey(activePlaylistId, channel);
    const automaticId = channel.tvgId && guideChannelIds.has(channel.tvgId) ? channel.tvgId : "";
    const nextMappings = { ...epgMappings };

    if (!normalized || normalized === automaticId) delete nextMappings[key];
    else nextMappings[key] = normalized;

    try {
      await iptvRepository.saveEpgMappings(nextMappings);
      setEpgMappings(nextMappings);
      setMappingDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setGuideError("");
    } catch (cause) {
      setGuideError(cause instanceof Error ? cause.message : "EPG párování se nepodařilo uložit.");
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Playlist je větší než povolených 10 MB.");
      return;
    }

    try {
      const result = parseM3uPlaylist(await file.text());
      setWarnings(result.warnings);
      if (result.errors.length > 0) {
        setError(result.errors.join(" "));
        return;
      }

      const record: StoredIptvPlaylist = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "playlist-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        name: file.name,
        updatedAt: Date.now(),
        channels: result.channels
      };
      await iptvRepository.savePlaylist(record);
      const updated = [record, ...playlists];
      setPlaylists(updated);
      setActivePlaylistId(record.id);
      await iptvRepository.saveActivePlaylistId(record.id);
      setSelectedGroup("Všechny skupiny");
      setSearch("");
      setFavoritesOnly(false);
      setWarnings(result.warnings);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Soubor se nepodařilo přečíst nebo uložit.");
    }
  }

  async function importGuide(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setGuideError("XMLTV soubor je větší než povolených 20 MB.");
      return;
    }

    try {
      const result = parseXmltv(await file.text());
      setGuideWarnings(result.warnings);
      if (result.errors.length > 0) {
        setGuideError(result.errors.join(" "));
        return;
      }

      const record: StoredXmltvGuide = {
        name: file.name,
        updatedAt: Date.now(),
        channels: result.channels,
        programmes: result.programmes
      };
      await iptvRepository.saveGuide(record);
      setGuide(record);
      setMappingDrafts({});
      setGuideError("");
    } catch (cause) {
      setGuideError(cause instanceof Error ? cause.message : "XMLTV soubor se nepodařilo přečíst nebo uložit.");
    }
  }

  async function activatePlaylist(id: string) {
    const selected = playlists.find((playlist) => playlist.id === id);
    if (!selected) return;

    try {
      await iptvRepository.saveActivePlaylistId(id);
      setActivePlaylistId(id);
      setSelectedGroup("Všechny skupiny");
      setSearch("");
      setFavoritesOnly(false);
      setMappingDrafts({});
      setWarnings([]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playlist se nepodařilo přepnout.");
    }
  }

  async function removeActivePlaylist() {
    if (!activePlaylist) return;

    try {
      await iptvRepository.removePlaylist(activePlaylist.id);
      const remaining = playlists.filter((playlist) => playlist.id !== activePlaylist.id);
      const next = remaining[0] ?? null;
      await iptvRepository.saveActivePlaylistId(next?.id ?? null);
      setPlaylists(remaining);
      setActivePlaylistId(next?.id ?? null);
      setSelectedGroup("Všechny skupiny");
      setSearch("");
      setFavoritesOnly(false);
      setMappingDrafts({});
      setWarnings([]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Playlist se nepodařilo odebrat.");
    }
  }

  async function clearGuide() {
    try {
      await iptvRepository.clearGuide();
      setGuide(null);
      setGuideWarnings([]);
      setGuideError("");
    } catch (cause) {
      setGuideError(cause instanceof Error ? cause.message : "EPG se nepodařilo odebrat.");
    }
  }

  function getProgramme(channel: M3uChannel): { current?: XmltvProgramme; next?: XmltvProgramme } {
    const guideChannelId = getResolvedGuideChannelId(channel);
    if (!guideChannelId) return {};
    const programmes = guideByChannel.get(guideChannelId) ?? [];
    const current = programmes.find((programme) => programme.start <= now && programme.stop > now);
    const next = programmes.find((programme) => programme.start >= (current?.stop ?? now));
    return {
      ...(current ? { current } : {}),
      ...(next ? { next } : {})
    };
  }

  const epgChannels = useMemo(
    () => visibleChannels.flatMap((channel) => {
      const guideChannelId = getResolvedGuideChannelId(channel);
      return guideChannelId ? [{ ...channel, tvgId: guideChannelId }] : [];
    }),
    [visibleChannels, guideChannelIds, epgMappings, activePlaylistId]
  );

  return (
    <div className="page-stack iptv-view">
      <div className="page-heading-row">
        <div>
          <span className="section-kicker">LOKÁLNÍ IPTV · M3U / XMLTV</span>
          <h1>Živé vysílání</h1>
          <p>Spravuj vlastní playlist, kanály a programový průvodce. Data zůstávají v tomto zařízení.</p>
        </div>
        <span className="status-pill"><span /> {channels.length} KANÁLŮ</span>
      </div>

      <section className="iptv-import-card">
        <div className="iptv-import-copy">
          <span className="section-kicker">PLAYLIST MANAGER</span>
          <h2>{playlistName || "Připojit playlist"}{activePlaylist?.isDemo && <span className="iptv-demo-tag">FUNKČNÍ DEMO</span>}</h2>
          <p>{isReady
            ? playlists.length + " uložených playlistů · data zůstávají v tomto zařízení"
            : "Načítám lokální úložiště…"}</p>
        </div>
        <div className="iptv-import-actions">
          {playlists.length > 0 && (
            <select
              className="iptv-playlist-select"
              value={activePlaylistId ?? ""}
              onChange={(event) => void activatePlaylist(event.target.value)}
              aria-label="Vybrat aktivní playlist"
            >
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} · {playlist.channels.length} kanálů
                </option>
              ))}
            </select>
          )}
          <label className="button-primary file-picker">
            Přidat M3U playlist <span>＋</span>
            <input type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl" onChange={importFile} />
          </label>
          {activePlaylist && (
            <button className="small-button" onClick={() => void removeActivePlaylist()}>
              Odebrat aktuální
            </button>
          )}
        </div>
      </section>

      {error && <p className="form-message" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <details className="iptv-warnings">
          <summary>{warnings.length} upozornění při importu playlistu</summary>
          <ul>{warnings.slice(0, 20).map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          {warnings.length > 20 && <p>Zobrazeno prvních 20 upozornění.</p>}
        </details>
      )}

      <section className="iptv-guide-card">
        <div className="iptv-guide-copy">
          <span className="section-kicker">PROGRAMOVÝ PRŮVODCE · XMLTV</span>
          <h2>{guide?.name || "EPG zatím není načtené"}</h2>
          <p>{guide ? guide.programmes.length.toLocaleString("cs-CZ") + " pořadů · " + guideMatchedCount + " spárovaných kanálů" : "Importuj XMLTV feed pro zobrazení aktuálního a následujícího pořadu u kanálů."}</p>
        </div>
        <div className="iptv-import-actions">
          <label className="button-secondary file-picker">
            Importovat XMLTV <span>＋</span>
            <input type="file" accept=".xml,.xmltv,.xml.gz" onChange={importGuide} />
          </label>
          {guide && <button className="small-button" onClick={clearGuide}>Odebrat EPG</button>}
        </div>
      </section>

      {guideError && <p className="form-message" role="alert">{guideError}</p>}
      {reminderError && <p className="form-message" role="alert">{reminderError}</p>}
      {guideWarnings.length > 0 && (
        <details className="iptv-warnings">
          <summary>{guideWarnings.length} upozornění při importu EPG</summary>
          <ul>{guideWarnings.slice(0, 20).map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        </details>
      )}

      {channels.length > 0 ? (
        <section className="iptv-channel-panel">
          <div className="iptv-tools">
            <label className="iptv-search">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat kanál nebo TVG ID…" aria-label="Hledat kanál" />
            </label>
            <button
              className={"iptv-favorites-toggle" + (favoritesOnly ? " active" : "")}
              type="button"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((value) => !value)}
            >
              <span aria-hidden="true">{favoritesOnly ? "★" : "☆"}</span>
              Oblíbené
              <small>{favoriteChannelCount}</small>
            </button>
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} aria-label="Filtrovat skupinu">
              <option>Všechny skupiny</option>
              {groups.map((group) => <option key={group}>{group}</option>)}
            </select>
          </div>
          {guide && (
            <datalist id="mio-epg-channel-options">
              {guideChannelOptions.map((option) => (
                <option key={option.id} value={option.id} label={option.displayName} />
              ))}
            </datalist>
          )}
          <div className="iptv-table-head iptv-guide-head">
            <span>STANICE</span><span>SKUPINA</span><span>TVG ID</span><span>PRÁVĚ VYSÍLÁ</span><span>AKCE</span>
          </div>
          {visibleChannels.map((channel) => {
            const programme = getProgramme(channel);
            const favoriteKey = getChannelFavoriteKey(channel);
            const isFavorite = favoriteKeys.has(favoriteKey);
            const mappingKey = activePlaylistId ? getEpgMappingKey(activePlaylistId, channel) : "";
            const automaticMapping = channel.tvgId && guideChannelIds.has(channel.tvgId) ? channel.tvgId : "";
            const savedManualMapping = epgMappings[mappingKey];
            const validManualMapping = savedManualMapping && guideChannelIds.has(savedManualMapping)
              ? savedManualMapping
              : "";
            const mappingValue = mappingDrafts[mappingKey] ?? validManualMapping ?? automaticMapping;
            return (
              <div className="iptv-channel-row iptv-guide-row" key={channel.id}>
                <div className="iptv-channel-name">
                  <span className="channel-mark">▶</span>
                  <strong>{channel.name}</strong>
                  <button
                    className="iptv-favorite"
                    type="button"
                    aria-label={isFavorite ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
                    aria-pressed={isFavorite}
                    title={isFavorite ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
                    onClick={() => void toggleFavorite(channel)}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                </div>
                <span className="iptv-group">{channel.group || "Bez skupiny"}</span>
                <span className="iptv-tvg">{channel.tvgId || "—"}</span>
                <div className="iptv-programme">
                  {programme.current ? (
                    <>
                      <strong>{programme.current.title}</strong>
                      <span>Do {new Date(programme.current.stop).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                      {programme.next && <small>Poté: {programme.next.title}</small>}
                    </>
                  ) : programme.next ? (
                    <>
                      <strong>{programme.next.title}</strong>
                      <span>Začíná {new Date(programme.next.start).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</span>
                    </>
                  ) : <span className="programme-missing">{guide ? "Program nenalezen" : "Bez EPG"}</span>}
                  {guide && (
                    <label className="iptv-epg-map">
                      <span>{validManualMapping ? "RUČNÍ PÁROVÁNÍ" : automaticMapping ? "TVG ID" : "PŘIŘADIT EPG"}</span>
                      <input
                        type="text"
                        list="mio-epg-channel-options"
                        value={mappingValue}
                        placeholder="XMLTV channel ID"
                        aria-label={"XMLTV channel ID pro " + channel.name}
                        onChange={(event) => setMappingDrafts((current) => ({
                          ...current,
                          [mappingKey]: event.target.value
                        }))}
                        onBlur={() => void saveChannelEpgMapping(channel, mappingValue)}
                      />
                    </label>
                  )}
                </div>
                <button className="small-button play-channel" onClick={() => onPlay(channel)}>Přehrát <span>↗</span></button>
              </div>
            );
          })}
          {visibleChannels.length === 0 && (
            <div className="iptv-empty-filter">
              {favoritesOnly && favoriteChannelCount === 0
                ? "Zatím nemáš žádný oblíbený kanál."
                : "Filtru neodpovídá žádný kanál."}
            </div>
          )}
          <div className="iptv-table-foot">ZOBRAZENO {visibleChannels.length} / {channels.length} · PARSOVÁNO LOKÁLNĚ</div>
        </section>
      ) : (
        <div className="library-empty iptv-empty">
          <div className="coming-icon">◉</div>
          <h2>Žádný playlist není načtený</h2>
          <p>Importuj jeden nebo více M3U/M3U8 souborů. Mezi uloženými playlisty můžeš přepínat bez opětovného importu.</p>
        </div>
      )}

      {activePlaylistId && guide && (
        <section className="epg-reminders-card">
          <div className="epg-reminders-heading">
            <div>
              <span className="section-kicker">LOKÁLNÍ PLÁNOVAČ</span>
              <h2>Připomínky pořadů</h2>
              <p>Upozornění se spouští pět minut před začátkem. MIO musí zůstat otevřené.</p>
            </div>
            <span className="epg-reminders-count">{activeReminders.length} NASTAVENO</span>
          </div>
          {reminderNotice && <p className="epg-reminder-notice" role="status" aria-live="polite">{reminderNotice}</p>}
          {activeReminders.length === 0 ? (
            <div className="epg-reminders-empty">Zatím nemáš žádnou připomínku. Otevři pořad v časové ose a zvol „Připomenout“.</div>
          ) : (
            <div className="epg-reminders-list">
              {activeReminders.slice(0, 8).map((reminder) => (
                <article className="epg-reminder-row" key={reminder.id}>
                  <div className="epg-reminder-time">
                    <strong>{new Date(reminder.start).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</strong>
                    <span>{new Date(reminder.start).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}</span>
                  </div>
                  <div className="epg-reminder-copy">
                    <strong>{reminder.title}</strong>
                    <span>{reminder.channelName}</span>
                  </div>
                  <span className={"epg-reminder-state" + (reminder.notifiedAt ? " is-notified" : "")}>
                    {reminder.notifiedAt
                      ? "Připomenuto"
                      : now >= reminder.start - 5 * 60_000
                        ? "Za chvíli"
                        : reminder.notificationsEnabled
                          ? "Upozornění aktivní"
                          : "Pouze v aplikaci"}
                  </span>
                  <button className="small-button" type="button" onClick={() => void removeEpgReminder(reminder.id)}>Zrušit</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {guide && channels.length > 0 && activePlaylistId && (
        <EpgGrid
          channels={epgChannels}
          guide={guide}
          now={now}
          playlistId={activePlaylistId}
          reminders={reminders}
          onPlay={onPlay}
          onToggleReminder={(channel, programme) => void toggleEpgReminder(channel, programme)}
        />
      )}

      <div className="iptv-note">
        <strong>Aktuální omezení</strong>
        <p>{activePlaylist?.isDemo
          ? "Toto demo používá jeden veřejný HLS testovací stream a vygenerovaný ukázkový EPG. Nejde o skutečné televizní stanice ani živé programové informace. Playlist, oblíbené kanály, EPG a připomínky se ukládají lokálně v tomto prohlížeči; můžeš je nahradit vlastními soubory M3U a XMLTV."
          : "Playlisty, EPG, ruční párování i připomínky se ukládají lokálně do IndexedDB. Připomínky se kontrolují v otevřené aplikaci a mohou použít oznámení prohlížeče; po úplném zavření MIO není bez serverového push nebo nativního plánovače zaručené upozornění. Automatické párování používá shodu M3U tvg-id a XMLTV channel id. Webový přehrávač podporuje HTTP(S) zdroje a HLS; RTSP, DRM, autentizační hlavičky a cloudová synchronizace zatím nejsou implementované."}</p>
      </div>
    </div>
  );
}
