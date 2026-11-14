import { useMemo, useState, type ChangeEvent } from "react";
import { parseM3uPlaylist, type M3uChannel } from "@mio/iptv";

interface IptvScreenProps {
  onPlay: (channel: M3uChannel) => void;
}

export function IptvScreen({ onPlay }: IptvScreenProps) {
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Všechny skupiny");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

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

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Playlist je větší než povolených 10 MB.");
      return;
    }

    try {
      const text = await file.text();
      const result = parseM3uPlaylist(text);

      setWarnings(result.warnings);
      setError(result.errors.join(" "));
      setChannels(result.channels);
      setPlaylistName(file.name);
      setSelectedGroup("Všechny skupiny");
      setSearch("");
    } catch {
      setError("Soubor se nepodařilo přečíst. Zkus UTF-8 M3U/M3U8 playlist.");
      setChannels([]);
      setWarnings([]);
    }
  }

  return (
    <div className="page-stack iptv-view">
      <div className="page-heading-row">
        <div>
          <span className="section-kicker">LOKÁLNÍ IMPORT · M3U / M3U8</span>
          <h1>Živé vysílání</h1>
          <p>Načti vlastní playlist, procházej kanály a otevři kompatibilní HTTP(S) stream v Player Lab.</p>
        </div>
        <span className="status-pill"><span /> {channels.length} KANÁLŮ</span>
      </div>

      <section className="iptv-import-card">
        <div className="iptv-import-copy">
          <span className="section-kicker">PLAYLIST MANAGER</span>
          <h2>{playlistName || "Připojit playlist"}</h2>
          <p>Soubor se načte a zpracuje přímo v tomto prohlížeči. Nikam se automaticky neposílá.</p>
        </div>
        <label className="button-primary file-picker">
          Vybrat M3U soubor <span>＋</span>
          <input type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl" onChange={importFile} />
        </label>
      </section>

      {error && <p className="form-message" role="alert">{error}</p>}
      {warnings.length > 0 && (
        <details className="iptv-warnings">
          <summary>{warnings.length} upozornění při importu</summary>
          <ul>{warnings.slice(0, 20).map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          {warnings.length > 20 && <p>Zobrazeno prvních 20 upozornění.</p>}
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
          <div className="iptv-table-head">
            <span>STANICE</span><span>SKUPINA</span><span>TVG ID</span><span>AKCE</span>
          </div>
          {visibleChannels.map((channel) => (
            <div className="iptv-channel-row" key={channel.id}>
              <div className="iptv-channel-name"><span className="channel-mark">▶</span><strong>{channel.name}</strong></div>
              <span className="iptv-group">{channel.group || "Bez skupiny"}</span>
              <span className="iptv-tvg">{channel.tvgId || "—"}</span>
              <button className="small-button play-channel" onClick={() => onPlay(channel)}>Přehrát <span>↗</span></button>
            </div>
          ))}
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
        <p>Playlist zůstává zatím pouze v paměti této stránky. Webový přehrávač podporuje HTTP(S) zdroje a HLS; RTSP, DRM, autentizační hlavičky a trvalé uložení IPTV profilů přijdou v dalších iteracích. Stream musí povolit CORS, pokud ho přehrává HLS.js.</p>
      </div>
    </div>
  );
}
