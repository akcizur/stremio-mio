import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { EpgReminder, M3uChannel, StoredXmltvGuide, XmltvProgramme } from "@mio/iptv";
import { getEpgReminderId, getLocalDayRange } from "@mio/iptv";

interface EpgGridProps {
  channels: M3uChannel[];
  guide: StoredXmltvGuide | null;
  now: number;
  playlistId: string;
  reminders: EpgReminder[];
  onPlay: (channel: M3uChannel) => void;
  onToggleReminder: (channel: M3uChannel, programme: XmltvProgramme) => void;
}

interface SelectedProgramme {
  programme: XmltvProgramme;
  channel: M3uChannel;
}

const HOUR = 60 * 60 * 1000;
const HOUR_WIDTH = 112;
const CHANNEL_WIDTH = 168;

function toDateInputValue(value: number): string {
  const date = new Date(value);
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value: number): string {
  return new Date(value).toLocaleDateString("cs-CZ", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

export function EpgGrid({ channels, guide, now, playlistId, reminders, onPlay, onToggleReminder }: EpgGridProps) {
  const [selected, setSelected] = useState<SelectedProgramme | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(now));
  const scrollRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  const dayRange = useMemo(
    () => getLocalDayRange(selectedDate) ?? getLocalDayRange(toDateInputValue(now))!,
    [selectedDate, now]
  );
  const dayHours = (dayRange.end - dayRange.start) / HOUR;
  const timelineWidth = dayHours * HOUR_WIDTH;
  const isToday = selectedDate === toDateInputValue(now);

  const channelRows = useMemo(() => {
    if (!guide) return [];
    return channels
      .filter((channel) => channel.tvgId)
      .map((channel) => ({
        channel,
        programmes: guide.programmes.filter((programme) =>
          programme.channelId === channel.tvgId &&
          programme.stop > dayRange.start &&
          programme.start < dayRange.end
        )
      }));
  }, [channels, guide, dayRange]);

  const ticks = useMemo(() => {
    const values: number[] = [];
    for (let value = dayRange.start; value <= dayRange.end; value += HOUR) values.push(value);
    if (values[values.length - 1] !== dayRange.end) values.push(dayRange.end);
    return values;
  }, [dayRange]);

  const currentPosition = ((now - dayRange.start) / HOUR) * HOUR_WIDTH;
  const rangeLabel = formatTime(dayRange.start) + " – " + formatTime(dayRange.end - 1);
  const selectedReminderId = selected
    ? getEpgReminderId(playlistId, selected.programme.channelId, selected.programme.start)
    : "";
  const selectedHasReminder = Boolean(selectedReminderId && reminders.some((reminder) => reminder.id === selectedReminderId));

  function scrollToCurrentTime(behavior: ScrollBehavior = "smooth") {
    const viewport = scrollRef.current;
    if (!viewport || !isToday) return;
    const position = CHANNEL_WIDTH + currentPosition - viewport.clientWidth / 2;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    viewport.scrollTo({ left: Math.max(0, Math.min(position, maxScroll)), behavior });
  }

  function jumpToNow() {
    const today = toDateInputValue(now);
    if (selectedDate !== today) setSelectedDate(today);
    window.requestAnimationFrame(() => {
      const viewport = scrollRef.current;
      const range = getLocalDayRange(today);
      if (!viewport || !range) return;
      const position = CHANNEL_WIDTH + ((now - range.start) / HOUR) * HOUR_WIDTH - viewport.clientWidth / 2;
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      viewport.scrollTo({ left: Math.max(0, Math.min(position, maxScroll)), behavior: "smooth" });
    });
    setSelected(null);
  }

  function shiftDay(offset: number) {
    const [yearText, monthText, dayText] = selectedDate.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return;
    setSelectedDate(toDateInputValue(new Date(year, month - 1, day + offset).getTime()));
    setSelected(null);
  }

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    if (isToday) scrollToCurrentTime("auto");
    else viewport.scrollTo({ left: 0, behavior: "auto" });
  }, [selectedDate]);
  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [selected]);

  function focusProgramme(
    current: HTMLButtonElement,
    direction: "left" | "right" | "up" | "down"
  ): boolean {
    const currentRow = current.closest<HTMLElement>(".epg-row");
    if (!currentRow) return false;

    const currentRect = current.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;

    if (direction === "left" || direction === "right") {
      const candidates = Array.from(currentRow.querySelectorAll<HTMLButtonElement>(".epg-programme"))
        .map((button) => {
          const rect = button.getBoundingClientRect();
          return { button, centerX: rect.left + rect.width / 2 };
        })
        .filter(({ button, centerX }) =>
          button !== current && (direction === "left" ? centerX < currentCenterX : centerX > currentCenterX)
        )
        .sort((a, b) => direction === "left" ? b.centerX - a.centerX : a.centerX - b.centerX);

      const next = candidates[0]?.button;
      if (!next) return false;
      next.focus();
      return true;
    }

    const viewport = scrollRef.current;
    if (!viewport) return false;
    const rows = Array.from(viewport.querySelectorAll<HTMLElement>(".epg-row"));
    const currentIndex = rows.indexOf(currentRow);
    const step = direction === "up" ? -1 : 1;

    for (let rowIndex = currentIndex + step; rowIndex >= 0 && rowIndex < rows.length; rowIndex += step) {
      const row = rows[rowIndex];
      if (!row) continue;
      const candidates = Array.from(row.querySelectorAll<HTMLButtonElement>(".epg-programme"))
        .map((button) => {
          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          return { button, distance: Math.abs(centerX - currentCenterX) };
        })
        .sort((a, b) => a.distance - b.distance);

      const next = candidates[0]?.button;
      if (!next) continue;
      next.focus();
      return true;
    }

    return false;
  }

  function handleTimelineKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const currentProgramme = event.target instanceof HTMLElement
      ? event.target.closest<HTMLButtonElement>(".epg-programme")
      : null;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? "left" : "right";
      const moved = currentProgramme ? focusProgramme(currentProgramme, direction) : false;
      if (!moved) {
        scrollRef.current?.scrollBy({
          left: direction === "right" ? HOUR_WIDTH : -HOUR_WIDTH,
          behavior: "smooth"
        });
      }
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (!currentProgramme) return;
      event.preventDefault();
      focusProgramme(currentProgramme, event.key === "ArrowUp" ? "up" : "down");
    } else if (event.key === "PageUp") {
      event.preventDefault();
      shiftDay(-1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      shiftDay(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      jumpToNow();
    } else if (event.key === "Escape") {
      setSelected(null);
    }
  }

  if (!guide) return null;

  return (
    <section className="epg-grid-card">
      <div className="epg-grid-heading">
        <div>
          <span className="section-kicker">PROGRAMOVÁ ČASOVÁ OSA</span>
          <h2>Televizní program</h2>
          <p>Kompletní denní přehled. Posouvej časovou osu nebo vyber konkrétní datum.</p>
        </div>
        <div className="epg-date-controls">
          <button type="button" className="epg-nav-button" onClick={() => shiftDay(-1)} aria-label="Předchozí den">‹</button>
          <label className="epg-date-picker">
            <span className="section-kicker">DATUM PROGRAMU</span>
            <input type="date" value={selectedDate} aria-label="Datum televizního programu" onChange={(event) => {
              setSelectedDate(event.target.value);
              setSelected(null);
            }} />
          </label>
          <button type="button" className="epg-nav-button" onClick={() => shiftDay(1)} aria-label="Následující den">›</button>
          <button type="button" className="epg-today-button" onClick={jumpToNow}>Teď</button>
        </div>
      </div>

      <div className="epg-day-summary">
        <strong>{formatDay(dayRange.start)}</strong>
        <span>{rangeLabel}</span>
        <small>{channelRows.length} stanic v průvodci · celý den</small>
      </div>

      {channelRows.length === 0 ? (
        <div className="epg-no-data">
          <strong>Pro vybrané datum nejsou k dispozici napárované stanice.</strong>
          <span>Ověř XMLTV feed a přiřazení kanálů v seznamu IPTV.</span>
        </div>
      ) : (
        <div
          className="epg-scroll"
          ref={scrollRef}
          tabIndex={0}
          role="region"
          aria-label="Celodenní televizní program. Šipkami posouvej čas, Page Up a Page Down mění den, Home přejde na současný čas."
          onKeyDown={handleTimelineKeyDown}
        >
          <div className="epg-timeline" style={{ width: CHANNEL_WIDTH + timelineWidth, minWidth: CHANNEL_WIDTH + timelineWidth }}>
            <div className="epg-axis" style={{ gridTemplateColumns: CHANNEL_WIDTH + "px " + timelineWidth + "px" }}>
              <div className="epg-axis-label">KANÁL</div>
              <div className="epg-axis-times" style={{ width: timelineWidth }}>
                {ticks.map((tick, index) => (
                  <span key={tick} style={{ left: ((tick - dayRange.start) / HOUR) * HOUR_WIDTH + "px" }}>
                    {index === ticks.length - 1 ? "24:00" : formatTime(tick)}
                  </span>
                ))}
              </div>
            </div>

            {channelRows.map(({ channel, programmes }) => (
              <div className="epg-row" key={channel.id} style={{ gridTemplateColumns: CHANNEL_WIDTH + "px " + timelineWidth + "px" }}>
                <div className="epg-channel-label">
                  <strong>{channel.name}</strong>
                  <span>{channel.group || "Bez skupiny"}</span>
                </div>
                <div className="epg-lane" style={{ width: timelineWidth }}>
                  <div className="epg-lane-lines">
                    {ticks.slice(0, -1).map((tick) => (
                      <span key={tick} style={{ left: ((tick - dayRange.start) / HOUR) * HOUR_WIDTH + "px" }} />
                    ))}
                  </div>
                  {isToday && now >= dayRange.start && now < dayRange.end && (
                    <span className="epg-now-line" style={{ left: currentPosition + "px" }} />
                  )}
                  {programmes.map((programme) => {
                    const visibleStart = Math.max(programme.start, dayRange.start);
                    const visibleStop = Math.min(programme.stop, dayRange.end);
                    const left = ((visibleStart - dayRange.start) / HOUR) * HOUR_WIDTH;
                    const width = ((visibleStop - visibleStart) / HOUR) * HOUR_WIDTH;
                    return (
                      <button
                        type="button"
                        className={"epg-programme" + (programme.start <= now && programme.stop > now ? " is-current" : "")}
                        key={programme.id}
                        style={{ left: left + "px", width: Math.max(10, width - 3) + "px" }}
                        onClick={() => setSelected({ programme, channel })}
                        aria-label={programme.title + ", " + formatTime(programme.start) + " až " + formatTime(programme.stop) + ", " + channel.name}
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
          <section ref={modalRef} tabIndex={-1} className="epg-modal" role="dialog" aria-modal="true" aria-labelledby="epg-modal-title" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setSelected(null);
            }
          }}>
            <div className="epg-modal-top">
              <span className="section-kicker">DETAIL POŘADU</span>
              <button className="icon-button" aria-label="Zavřít detail" onClick={() => setSelected(null)}>×</button>
            </div>
            <h2 id="epg-modal-title">{selected.programme.title}</h2>
            <div className="epg-modal-time">{formatTime(selected.programme.start)} – {formatTime(selected.programme.stop)}</div>
            <div className="epg-modal-channel">{selected.channel.name}</div>
            {selected.programme.categories.length > 0 && (
              <div className="epg-modal-categories">{selected.programme.categories.map((category) => <span key={category}>{category}</span>)}</div>
            )}
            <p>{selected.programme.description || "Popis pořadu není v EPG k dispozici."}</p>
            {selected.programme.language && <small>Jazyk metadat: {selected.programme.language}</small>}
            <div className="epg-modal-actions">
              <button
                className="button-secondary epg-reminder-button"
                type="button"
                disabled={!selectedHasReminder && selected.programme.stop <= now}
                aria-pressed={selectedHasReminder}
                onClick={() => onToggleReminder(selected.channel, selected.programme)}
              >
                {selectedHasReminder ? "Zrušit připomínku" : "Připomenout · 5 min předem"}
              </button>
              <button className="button-primary" type="button" onClick={() => {
                onPlay(selected.channel);
                setSelected(null);
              }}>Přehrát stanici <span>↗</span></button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
