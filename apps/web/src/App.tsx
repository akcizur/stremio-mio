import { useEffect, useMemo, useState } from "react";
import type { LibraryEntry } from "@mio/library";
import { IndexedDbLibraryRepository } from "@mio/library";
import type { M3uChannel } from "@mio/iptv";
import type { PlayableSource } from "@mio/player-contract";
import { parsePlayableUrl } from "@mio/player-contract";
import { IptvScreen } from "./components/IptvScreen";
import { WebPlayer } from "./components/WebPlayer";

type SectionId = "discover" | "library" | "iptv" | "youtube" | "player" | "addons" | "settings";

interface MediaCard {
  id: string;
  title: string;
  subtitle: string;
  category: "FILM" | "SÉRIE";
  tone: "violet" | "amber" | "blue" | "green";
}

const navigation: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: "discover", label: "Objevovat", icon: "⌕" },
  { id: "library", label: "Moje knihovna", icon: "▤" },
  { id: "iptv", label: "Živé vysílání", icon: "◉" },
  { id: "youtube", label: "YouTube", icon: "▷" },
  { id: "player", label: "Player Lab", icon: "▶" },
  { id: "addons", label: "Doplňky", icon: "⌘" }
];

const mediaCards: MediaCard[] = [
  { id: "nebula", title: "Nebula Protocol", subtitle: "Sci-fi · 2026", category: "FILM", tone: "violet" },
  { id: "afterlight", title: "Afterlight", subtitle: "Drama · 2025", category: "FILM", tone: "amber" },
  { id: "northbound", title: "Northbound", subtitle: "Thriller · 2026", category: "SÉRIE", tone: "blue" },
  { id: "signal", title: "Signal / Lost", subtitle: "Mystery · 2024", category: "SÉRIE", tone: "green" }
];

const demoHlsUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const libraryRepository = new IndexedDbLibraryRepository();

function sectionTitle(section: SectionId): string {
  return navigation.find((item) => item.id === section)?.label ?? "Nastavení";
}

export function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [source, setSource] = useState<PlayableSource | null>(null);
  const [playerMessage, setPlayerMessage] = useState("");
  const [libraryItems, setLibraryItems] = useState<LibraryEntry[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryError, setLibraryError] = useState("");

  useEffect(() => {
    let cancelled = false;

    libraryRepository.list()
      .then((items) => {
        if (!cancelled) setLibraryItems(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLibraryError(error instanceof Error ? error.message : "Lokální knihovnu se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (!cancelled) setLibraryReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCards = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("cs-CZ");
    if (!query) return mediaCards;
    return mediaCards.filter((item) =>
      (item.title + " " + item.subtitle + " " + item.category).toLocaleLowerCase("cs-CZ").includes(query)
    );
  }, [searchQuery]);

  const savedIds = useMemo(() => new Set(libraryItems.map((item) => item.id)), [libraryItems]);

  async function toggleSaved(item: MediaCard) {
    try {
      if (savedIds.has(item.id)) {
        await libraryRepository.remove(item.id);
      } else {
        await libraryRepository.put({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          mediaType: item.category === "SÉRIE" ? "series" : "movie",
          addedAt: Date.now(),
          isFavorite: true,
          playbackPositionSeconds: 0
        });
      }

      setLibraryItems(await libraryRepository.list());
      setLibraryError("");
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Změnu knihovny se nepodařilo uložit.");
    }
  }

  async function removeFromLibrary(id: string) {
    try {
      await libraryRepository.remove(id);
      setLibraryItems(await libraryRepository.list());
      setLibraryError("");
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Položku se nepodařilo odebrat.");
    }
  }

  function loadStream(value: string, title?: string) {
    const result = parsePlayableUrl(value);
    if (!result.ok) {
      setPlayerMessage(result.error);
      setActiveSection("player");
      return;
    }

    setSource({ ...result.source, ...(title ? { title } : {}) });
    setPlayerMessage("");
    setActiveSection("player");
  }

  function playChannel(channel: M3uChannel) {
    loadStream(channel.url, channel.name);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setActiveSection("discover"); }}>
          <span className="brand-mark">M</span>
          <span className="brand-copy">
            <strong>MIO</strong>
            <small>MEDIA INTERFACE OPTIONS</small>
          </span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-avatar">M</span>
          <span className="workspace-copy"><strong>Osobní prostor</strong><small>Lokální profil</small></span>
          <span className="workspace-chevron">⌄</span>
        </div>

        <nav className="main-nav" aria-label="Hlavní navigace">
          <span className="nav-caption">KNIHOVNA</span>
          {navigation.map((item) => (
            <button
              className={"nav-item" + (activeSection === item.id ? " active" : "")}
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSearchQuery(""); }}
              aria-current={activeSection === item.id ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "player" && <span className="nav-beta">LAB</span>}
            </button>
          ))}
          <span className="nav-caption nav-caption-spaced">SYSTÉM</span>
          <button
            className={"nav-item" + (activeSection === "settings" ? " active" : "")}
            onClick={() => setActiveSection("settings")}
            aria-current={activeSection === "settings" ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">⚙</span>
            <span>Nastavení</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-state"><span className="live-dot" />Lokální režim <span className="state-value">AKTIVNÍ</span></div>
          <div className="profile-row">
            <span className="profile-avatar">V</span>
            <span><strong>MIO Preview</strong><small>Webový prototyp</small></span>
            <span className="profile-more">···</span>
          </div>
          <div className="sidebar-version">MIO 0.1.0 · WEB PREVIEW</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>MIO</span><i>/</i><strong>{sectionTitle(activeSection)}</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Hledat v ukázkovém katalogu"
                placeholder="Hledat v MIO…"
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setActiveSection("discover"); }}
              />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" title="Oznámení" aria-label="Oznámení">♧</button>
            <span className="topbar-avatar">M</span>
          </div>
        </header>

        <div className="content-area">
          {activeSection === "discover" && (
            <Discover
              cards={visibleCards}
              savedIds={savedIds}
              onToggleSaved={toggleSaved}
              onOpenPlayer={() => setActiveSection("player")}
              searchQuery={searchQuery}
            />
          )}

          {activeSection === "library" && (
            <LibraryScreen
              items={libraryItems}
              ready={libraryReady}
              error={libraryError}
              onRemove={removeFromLibrary}
            />
          )}

          {activeSection === "iptv" && <IptvScreen onPlay={playChannel} />}

          {activeSection === "iptv" && <IptvScreen onPlay={playChannel} />}

          {activeSection === "player" && (
            <PlayerLab
              urlDraft={urlDraft}
              source={source}
              message={playerMessage}
              onDraftChange={setUrlDraft}
              onLoad={loadStream}
              onLoadDemo={() => { setUrlDraft(demoHlsUrl); loadStream(demoHlsUrl, "Mux HLS test stream"); }}
            />
          )}

          {activeSection !== "discover" && activeSection !== "library" && activeSection !== "iptv" && activeSection !== "player" && (
            <ComingSoon section={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}

interface DiscoverProps {
  cards: MediaCard[];
  savedIds: Set<string>;
  onToggleSaved: (item: MediaCard) => void;
  onOpenPlayer: () => void;
  searchQuery: string;
}

function Discover({ cards, savedIds, onToggleSaved, onOpenPlayer, searchQuery }: DiscoverProps) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-grain" />
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-content">
          <div className="eyebrow"><span /> MEDIA INTERFACE OPTIONS <b>WEB PREVIEW</b></div>
          <h1>Všechna média.<br /><em>Jedno místo.</em></h1>
          <p>Vlastní mediální prostor pro vaše katalogy, knihovnu, živé vysílání a přehrávání napříč zařízeními.</p>
          <div className="hero-actions">
            <button className="button-primary" onClick={onOpenPlayer}>Otevřít Player Lab <span>↗</span></button>
            <span className="hero-footnote">PRVNÍ WEBOVÁ VERTIKÁLA · 0.1.0</span>
          </div>
        </div>
        <div className="hero-side-note"><span>01</span><i /> ONE INTERFACE<br />MULTIPLE SOURCES</div>
        <div className="hero-bottom-label">MIO / LOCAL-FIRST MEDIA WORKSPACE</div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="section-kicker">VAŠE CENTRÁLA</span><h2>Prozkoumat</h2></div>
          <span className="demo-label"><span /> UKÁZKOVÁ DATA</span>
        </div>
        <div className="media-grid">
          {cards.map((item, index) => (
            <article className="media-card" key={item.id}>
              <div className={"poster poster-" + item.tone}>
                <span className="poster-index">0{index + 1}</span>
                <span className="poster-orbit" />
                <span className="poster-category">{item.category}</span>
                <button
                  className={"favourite-button" + (savedIds.has(item.id) ? " selected" : "")}
                  onClick={() => onToggleSaved(item)}
                  title={savedIds.has(item.id) ? "Odebrat z knihovny" : "Přidat do knihovny"}
                  aria-label={savedIds.has(item.id) ? "Odebrat z knihovny" : "Přidat do knihovny"}
                >{savedIds.has(item.id) ? "♥" : "♡"}</button>
                <span className="poster-glyph">{item.title.slice(0, 1)}</span>
              </div>
              <div className="media-card-meta"><div><strong>{item.title}</strong><span>{item.subtitle}</span></div><button onClick={onOpenPlayer} aria-label={"Otevřít Player Lab pro " + item.title}>↗</button></div>
            </article>
          ))}
          {cards.length === 0 && <div className="empty-search">Pro „{searchQuery}“ tu zatím nic není.</div>}
        </div>
        <p className="data-disclaimer">Toto jsou pouze demonstrační položky. Skutečné katalogy a metadata zatím nejsou připojené.</p>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><span className="section-kicker">STAV VÝVOJE</span><h2>Jedna aplikace. Více světů.</h2></div>
        </div>
        <div className="module-grid">
          <ModuleCard number="01" title="Katalog & metadata" detail="Filmy, seriály, epizody a sjednocené ID." state="PLÁNOVÁNO" />
          <ModuleCard number="02" title="IPTV & program" detail="Playlisty M3U, kanály a XMLTV EPG." state="M3U PROTOTYP" />
          <ModuleCard number="03" title="Nativní přehrávání" detail="AVPlayer, Media3 a desktopový MPV PoC." state="PROTOTYP" />
        </div>
      </section>
    </div>
  );
}

function LibraryScreen({
  items,
  ready,
  error,
  onRemove
}: {
  items: LibraryEntry[];
  ready: boolean;
  error: string;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="page-stack library-view">
      <div className="page-heading-row">
        <div><span className="section-kicker">LOKÁLNÍ ÚLOŽIŠTĚ · INDEXEDDB</span><h1>Moje knihovna</h1><p>Uložené položky zůstávají v tomto prohlížeči i po obnovení stránky.</p></div>
        <span className="status-pill"><span /> {items.length} POLOŽEK</span>
      </div>
      {error && <p className="form-message" role="alert">{error}</p>}
      {!ready && <div className="library-empty">Načítám lokální knihovnu…</div>}
      {ready && items.length === 0 && (
        <div className="library-empty">
          <div className="coming-icon">▤</div>
          <h2>Knihovna je zatím prázdná</h2>
          <p>V sekci Objevovat můžeš pomocí ikony srdce přidat demonstrační položky do své lokální knihovny.</p>
        </div>
      )}
      {ready && items.length > 0 && (
        <div className="library-list">
          {items.map((item) => (
            <article className="library-row" key={item.id}>
              <div className="library-row-art">{item.title.slice(0, 1)}</div>
              <div className="library-row-copy"><strong>{item.title}</strong><span>{item.subtitle} · {item.mediaType === "series" ? "Seriál" : "Film"}</span></div>
              <span className="library-added">PŘIDÁNO {new Date(item.addedAt).toLocaleDateString("cs-CZ")}</span>
              <button className="small-button" onClick={() => onRemove(item.id)}>Odebrat</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ number, title, detail, state }: { number: string; title: string; detail: string; state: string }) {
  return (
    <article className="module-card">
      <div className="module-top"><span>{number} / MODULE</span><span className="module-state">{state}</span></div>
      <h3>{title}</h3>
      <p>{detail}</p>
      <div className="module-line" />
    </article>
  );
}

interface PlayerLabProps {
  urlDraft: string;
  source: PlayableSource | null;
  message: string;
  onDraftChange: (value: string) => void;
  onLoad: (value: string, title?: string) => void;
  onLoadDemo: () => void;
}

function PlayerLab({ urlDraft, source, message, onDraftChange, onLoad, onLoadDemo }: PlayerLabProps) {
  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div><span className="section-kicker">TECHNICKÝ PROTOTYP · FÁZE 0</span><h1>Player Lab</h1><p>První ověření webového playbacku a společného kontraktu přehrávače.</p></div>
        <span className="status-pill"><span /> WEB / HLS</span>
      </div>

      <div className="player-layout">
        <section className="player-main-card">
          <div className="panel-heading"><div><span className="section-kicker">PLAYBACK SURFACE</span><h2>{source?.title || "Testovací přehrávač"}</h2></div><span className="panel-code">MIO.PLAYER.WEB</span></div>
          <WebPlayer source={source} />
          <div className="stream-form">
            <label htmlFor="stream-url">URL streamu</label>
            <div className="stream-input-row">
              <input
                id="stream-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com/stream.m3u8"
                value={urlDraft}
                onChange={(event) => onDraftChange(event.target.value)}
              />
              <button className="button-primary" onClick={() => onLoad(urlDraft)}>Načíst URL <span>↗</span></button>
            </div>
            {message && <p className="form-message" role="alert">{message}</p>}
            <div className="stream-quick-actions"><button className="text-button" onClick={onLoadDemo}>Načíst veřejný HLS test</button><span>Bez přihlašovacích údajů · demo stream</span></div>
          </div>
        </section>

        <aside className="player-info-card">
          <span className="section-kicker">AKTUÁLNÍ ADAPTÉR</span>
          <h3>Web HTML5 + HLS.js</h3>
          <p>Webový přehrávač používá nativní HLS tam, kde ho nabízí prohlížeč, jinak HLS.js nad Media Source Extensions.</p>
          <div className="capability-list">
            <Capability label="HTTP / HTTPS URL" state="ready" />
            <Capability label="Přímé mediální URL" state="ready" />
            <Capability label="HLS manifest M3U8" state="ready" />
            <Capability label="MPEG-DASH" state="planned" />
            <Capability label="DRM / licenční server" state="planned" />
            <Capability label="Externí titulky a výběr stop" state="planned" />
          </div>
          <div className="notice-box"><strong>Limity webového PoC</strong><p>Zdroj musí povolit CORS. DRM, DASH, přihlašovací hlavičky a nativní player bridge zatím nejsou implementované.</p></div>
          <div className="panel-footnote">TESTOVACÍ PROSTŘEDÍ · NEJDE O FINÁLNÍ PLAYER</div>
        </aside>
      </div>
    </div>
  );
}

function Capability({ label, state }: { label: string; state: "ready" | "planned" }) {
  return <div className="capability-row"><span className={"capability-dot " + state} /><span>{label}</span><small>{state === "ready" ? "WEB PoC" : "PLÁN"}</small></div>;
}

function ComingSoon({ section }: { section: SectionId }) {
  const descriptions: Record<SectionId, string> = {
    discover: "",
    library: "",
    iptv: "",
    youtube: "Vyhledávání a přehrávání přes oficiální YouTube API a embedded player.",
    player: "",
    addons: "Konektory, Stremio addon kompatibilita a oprávnění jednotlivých zdrojů.",
    settings: "Jazyk, vzhled, úložiště, připojené zdroje a soukromí."
  };

  return (
    <div className="coming-soon">
      <div className="coming-icon">M</div>
      <span className="section-kicker">MIO / DALŠÍ FÁZE</span>
      <h1>{sectionTitle(section)}</h1>
      <p>{descriptions[section]}</p>
      <div className="coming-status"><span /> Tato část je zatím návrh, nikoli hotová funkce.</div>
    </div>
  );
}
