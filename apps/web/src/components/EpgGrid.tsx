import { useMemo, useState } from "react";
import type { M3uChannel, StoredXmltvGuide, XmltvProgramme } from "@mio/iptv";

interface EpgGridProps {
  channels: M3uChannel[];
  guide: StoredXmltvGuide | null;
  now: number;
}

const HALF_HOUR = 30 * 60 * 1000;
const HORIZON = 4 * 60 * 60 * 1000;

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function EpgGrid({ channels, guide, now }: EpgGridProps) {
  const [selected, setSelected] = useState<XmltvProgramme | null>(null);
  const rangeStart = Math.floor(now / HALF_HOUR) * HALF_HOUR;
  const rangeEnd = rangeStart + HORIZON;

  const channelRows = useMemo(() => {
    if (!guide) return [];
    return channels
      .filter((channel) => channel.tvgId)
      .map((channel) => ({
        channel,
        programmes: guide.programmes.filter((programme) =>
          programme.channelId === channel.tvgId &&
          programme.stop > rangeStart &&
          programme.start < rangeEnd
        )
      }))
      .filter((row) => row.programmes.length > 0);
  }, [channels, guide, rangeStart, rangeEnd]);

  const ticks = Array.from({ length: 9 }, (_, index) => rangeStart + index * HALF_HOUR);
  const currentPosition = ((now - rangeStart) / HORIZON) * 100;

  if (!guide) return null;

  return (
    <section className="epg-grid-card">
      <div className="epg-grid-heading">
        <div>
          <span className="section-kicker">PROGRAMOVÁ ČASOVÁ OSA</span>
          <h2>Televizní program</h2>
          <p>Čtyřhodinový přehled od aktuální půlhodiny. Vyber pořad pro detail.</p>
        </div>
        <span className="epg-grid-range">{formatTime(rangeStart)} – {formatTime(rangeEnd)}</span>
      </div>

      {channelRows.length === 0 ? (
        <div className="epg-no-data">
          <strong>Pro vybrané kanály se nenašel program.</strong>
          <span>Ověř shodu M3U tvg-id s XMLTV channel id a časové období v EPG feedu.</span>
        </div>
      ) : (
        <div className="epg-scroll">
          <div className="epg-timeline">
            <div className="epg-axis">
              <div className="epg-axis-label">KANÁL</div>
              <div className="epg-axis-times">
                {ticks.map((tick, index) => (
                  <span key={tick} style={{ left: (index / 8) * 100 + "%" }}>{formatTime(tick)}</span>
                ))}
              </div>
            </div>

            {channelRows.map(({ channel, programmes }) => (
              <div className="epg-row" key={channel.id}>
                <div className="epg-channel-label">
                  <strong>{channel.name}</strong>
                  <span>{channel.group || "Bez skupiny"}</span>
                </div>
                <div className="epg-lane">
                  <div className="epg-lane-lines">
                    {ticks.slice(0, -1).map((tick) => <span key={tick} />)}
                  </div>
                  {now >= rangeStart && now <= rangeEnd && (
                    <span className="epg-now-line" style={{ left: currentPosition + "%" }} />
                  )}
                  {programmes.map((programme) => {
                    const visibleStart = Math.max(programme.start, rangeStart);
                    const visibleStop = Math.min(programme.stop, rangeEnd);
                    const left = ((visibleStart - rangeStart) / HORIZON) * 100;
                    const width = ((visibleStop - visibleStart) / HORIZON) * 100;

                    return (
                      <button
                        className={"epg-programme" + (programme.start <= now && programme.stop > now ? " is-current" : "")}
                        key={programme.id}
                        style={{ left: left + "%", width: width + "%" }}
                        onClick={() => setSelected(programme)}
                        title={programme.title + " · " + formatTime(programme.start) + "–" + formatTime(programme.stop)}
                      >
                        <strong>{programme.title}</strong>
                        <span>{formatTime(programme.start)}–{formatTime(programme.stop)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="epg-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section
            className="epg-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="epg-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="epg-modal-top">
              <span className="section-kicker">DETAIL POŘADU</span>
              <button className="icon-button" aria-label="Zavřít detail" onClick={() => setSelected(null)}>×</button>
            </div>
            <h2 id="epg-modal-title">{selected.title}</h2>
            <div className="epg-modal-time">{formatTime(selected.start)} – {formatTime(selected.stop)}</div>
            {selected.categories.length > 0 && (
              <div className="epg-modal-categories">{selected.categories.map((category) => <span key={category}>{category}</span>)}</div>
            )}
            <p>{selected.description || "Popis pořadu není v EPG k dispozici."}</p>
            {selected.language && <small>Jazyk metadat: {selected.language}</small>}
          </section>
        </div>
      )}
    </section>
  );
}
