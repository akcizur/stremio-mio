# MIO · Media Interface Options

MIO je vlastní multiplatformní mediální aplikace pro **web, iOS, Android, Windows a Linux**.

Cíl: sjednotit katalog filmů a seriálů, osobní knihovnu, vyhledávání, historii, přehrávač, IPTV/EPG, YouTube integraci, lokální média a rozšiřitelné konektory.

Projekt postupuje po funkčních vertikálních částech. Web je první implementační platforma; nativní přehrávače zůstávají samostatnými adaptéry pro jednotlivé systémy.

## Aktuální stav

- [x] Architektonický výzkum a dokumentace
- [x] Počáteční React + TypeScript + Vite web shell
- [x] Sdílený kontrakt přehrávače a validace stream URL
- [x] Web Player Lab: přímé URL a HLS přes nativní podporu / HLS.js
- [x] Základní CI: typecheck, unit testy a production build
- [ ] Reálný playback test na zařízeních a prohlížečích
- [ ] iOS AVPlayer bridge
- [ ] Android Media3 bridge
- [ ] Windows/Linux MPV/libmpv PoC
- [x] Lokální M3U/M3U8 import, parser kanálů a skupin
- [x] XMLTV import, UTC normalizace a párování podle tvg-id
- [x] Lokální IndexedDB persistence playlistu a EPG
- [ ] Metadata katalog a autorizované externí konektory

## Technologie

| Vrstva | Základ |
|---|---|
| Web UI | React 19 + TypeScript + Vite |
| Web HLS | hls.js + nativní HLS podle prohlížeče |
| Sdílené rozhraní | @mio/player-contract |
| Mobilní aplikace | Capacitor + AVPlayer / Media3, plánováno |
| Desktop | Tauri 2 + MPV/libmpv PoC, plánováno |

Desktopový shell a mobilní player nejsou zatím implementované. Jejich architekturu potvrdíme až po technických prototypech.

## Spuštění

Požadavky: Node.js 26.13.1 LTS a npm 11+.

Z kořene repozitáře:

    npm install
    npm run dev

Kontrola projektu:

    npm run typecheck
    npm test
    npm run build
    npm run check

Vite spustí web na http://127.0.0.1:5173.

## Dokumentace

➡️ [Architektonická dokumentace](docs/architecture/README.md)

Hlavní dokumenty:
- [Platformní strategie](docs/architecture/PLATFORM_STRATEGY.md)
- [Srovnání technologií](docs/architecture/TECHNOLOGY_DECISIONS.md)
- [Přehrávání, streamy a DRM](docs/architecture/MEDIA_PLAYBACK.md)
- [Systémová architektura](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Integrace zdrojů](docs/architecture/INTEGRATIONS.md)
- [Licence a compliance](docs/architecture/LICENSING_AND_COMPLIANCE.md)
- [Roadmapa](docs/architecture/ROADMAP.md)
- [Architektonická rozhodnutí](docs/architecture/ADR/README.md)

## Důležitá omezení prvního webového prototypu

Player Lab ověřuje pouze webovou větev. HLS zdroj musí povolit CORS. MPEG-DASH, DRM, vlastní autentizační hlavičky, externí titulky a nativní playback bridge nejsou hotové funkce. Konektory se budou připojovat pouze ke zdrojům, které má uživatel právo používat.

## Vývoj

Před přidáním nového provideru nebo player enginu nejprve definuj jeho kontrakt v packages a otestuj jej bez závislosti na konkrétním UI.
