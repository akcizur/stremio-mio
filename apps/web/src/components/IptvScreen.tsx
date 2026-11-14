import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  IptvLocalRepository,
  parseM3uPlaylist,
  parseXmltv,
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
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Všechny skupiny");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState<StoredXmltvGuide | null>(null);
  const [guideWarnings, setGuideWarnings] = useState<string[]>([]);
  const [guideError, setGuideError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    Promise.all([iptvRepository.loadPlaylist(), iptvRepository.loadGuide()])
      .then(([storedPlaylist, storedGuide]) => {
        if (cancelled) return;
        if (storedPlaylist) {
          setChannels(storedPlaylist.channels);
          setPlaylistName(storedPlaylist.name);
        }
        if (storedGuide) setGuide(storedGuide);
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
      return matchesSearch && matchesGroup;
    });
  }, [channels, search, selectedGroup]);

  const guideByChannel = useMemo(() => {
    const map = new Map<string, XmltvProgramme[]>();
    for (const programme of guide?.programmes ?? []) {
      const existing = map.get(programme.channelId) ?? [];
      existing.push(programme);
      map.set(programme.channelId, existing);
    }
    return map;
  }, [guide]);

  const guideMatchedCount = useMemo(
    () => channels.filter((channel) => channel.tvgId && guideByChannel.has(channel.tvgId)).length,
    [channels, guideByChannel]
  );

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
        name: file.name,
        updatedAt: Date.now(),
        channels: result.channels
      };
      await iptvRepository.savePlaylist(record);
      setChannels(record.channels);
      setPlaylistName(record.name);
      setSelectedGroup("Všechny skupiny");
      setSearch("");
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
      setGuideError("");
    } catch (cause) {
      setGuideError(cause instanceof Error ? cause.message : "XMLTV soubor se nepodařilo přečíst nebo uložit.");
    }
  }

  async function clearPlaylist() {
    try {
      await iptvRepository.clearPlaylist();
      setChannels([]);
      setPlaylistName("");
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
    if (!channel.tvgId) return {};
    const programmes = guideByChannel.get(channel.tvgId) ?? [];
    const current = programmes.find((programme) => programme.start <= now && programme.stop > now);
    const next = programmes.find((programme) => programme.start >= (current?.stop ?? now));
    return {
      ...(current ? { current } : {}),
      ...(next ? { next } : {})
    };
  }

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
          <h2>{playlistName || "Připojit playlist"}</h2>
          <p>{isReady ? "Playlist se ukládá lokálně a zůstane dostupný po obnovení stránky." : "Načítám lokální úložiště…"}</p>
        </div>
        <div className="iptv-import-actions">
          <label className="button-primary file-picker">
            Vybrat M3U soubor <span>＋</span>
            <input type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl" onChange={importFile} />
          </label>
          {playlistName && <button className="small-button" onClick={clearPlaylist}>Odebrat playlist</button>}
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
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} aria-label="Filtrovat skupinu">
              <option>Všechny skupiny</option>
              {groups.map((group) => <option key={group}>{group}</option>)}
            </select>
          </div>
          <div className="iptv-table-head iptv-guide-head">
            <span>STANICE</span><span>SKUPINA</span><span>TVG ID</span><span>PRÁVĚ VYSÍLÁ</span><span>AKCE</span>
          </div>
          {visibleChannels.map((channel) => {
            const programme = getProgramme(channel);
            return (
              <div className="iptv-channel-row iptv-guide-row" key={channel.id}>
                <div className="iptv-channel-name"><span className="channel-mark">▶</span><strong>{channel.name}</strong></div>
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
                </div>
                <button className="small-button play-channel" onClick={() => onPlay(channel)}>Přehrát <span>↗</span></button>
              </div>
            );
          })}
          {visibleChannels.length === 0 && <div className="iptv-empty-filter">Filtru neodpovídá žádný kanál.</div>}
          <div className="iptv-table-foot">ZOBRAZENO {visibleChannels.length} / {channels.length} · PARSOVÁNO LOKÁLNĚ</div>
        </section>
      ) : (
        <div className="library-empty iptv-empty">
          <div className="coming-icon">◉</div>
          <h2>Žádný playlist není načtený</h2>
          <p>Importuj M3U/M3U8 soubor. MIO načte názvy, skupiny a TVG identifikátory kanálů.</p>
        </div>
      )}

      <div className="iptv-note">
        <strong>Aktuální omezení</strong>
        <p>Playlist a EPG se ukládají lokálně do IndexedDB. Párování programu probíhá podle přesné shody M3U tvg-id a XMLTV channel id. Webový přehrávač podporuje HTTP(S) zdroje a HLS; RTSP, DRM, autentizační hlavičky a cloudová synchronizace zatím nejsou implementované.</p>
      </div>
    </div>
  );
}
