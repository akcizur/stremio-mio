# MIO · Media Interface Options

MIO je vlastní multiplatformní mediální aplikace pro **web, iOS, Android, Windows a Linux**.

Cíl: sjednotit katalog filmů a seriálů, osobní knihovnu, vyhledávání, historii, přehrávač, IPTV/EPG, YouTube integraci, lokální média a rozšiřitelné konektory.

Projekt postupuje po funkčních vertikálních částech. Web je první implementační platforma; nativní přehrávače zůstávají samostatnými adaptéry pro jednotlivé systémy.

## Funkční demo · GitHub Pages

**[Spustit MIO demo](https://akcizur.github.io/stremio-mio/)**

- Demo se při prvním otevření IPTV sekce samo naplní ukázkovým M3U playlistem a EPG.
- Na úvodní stránce lze přímo spustit veřejný HLS testovací klip nebo otevřít IPTV + EPG.
- Fungují lokální oblíbené kanály, import vlastního M3U/XMLTV, denní program, detail pořadu, připomínky, Player Lab a historie sledování.
- Data se ukládají do IndexedDB daného prohlížeče. Neexistuje společný cloudový účet ani synchronizace mezi zařízeními.
- Ukázkový stream je veřejný testovací HLS zdroj Big Buck Bunny; demo kanál a EPG nejsou skutečné televizní vysílání.

Publikování zajišťuje workflow `.github/workflows/pages.yml` při změně `main`. V nastavení repozitáře musí být **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Aktuální stav

- [x] Architektonický výzkum a dokumentace
- [x] Počáteční React + TypeScript + Vite web shell
- [x] Sdílený kontrakt přehrávače a validace stream URL
- [x] Web Player Lab: přímé URL a HLS přes nativní podporu / HLS.js
- [x] Instalovatelný PWA shell a základní offline cache aplikačních souborů
- [x] Základní CI: typecheck, unit testy a production build
- [ ] Reálný playback test na zařízeních a prohlížečích
- [ ] iOS AVPlayer bridge
- [ ] Android Media3 bridge
- [ ] Windows/Linux MPV/libmpv PoC
- [x] Lokální M3U/M3U8 import, parser kanálů a skupin
- [x] XMLTV import, UTC normalizace a párování podle tvg-id
- [x] Celodenní EPG časová osa a detail pořadu
- [x] Lokální připomínky pořadů s kontrolou pět minut před začátkem
- [x] Lokální IndexedDB persistence playlistů a EPG
- [x] Lokální historie přehrávání a pokračování od uložené pozice
- [ ] Metadata katalog a autorizované externí konektory

## Technologie

| Vrstva | Základ |
|---|---|
| Web UI | React 19 + TypeScript + Vite |
| Web HLS | hls.js + nativní HLS podle prohlížeče |
| Sdílené rozhraní | @mio/player-contract |
| Mobilní obal | Capacitor 8.6.2 scaffold; AVPlayer / Media3 bridge zatím chybí |
| Desktop | Tauri 2.12.3 scaffold; MPV/libmpv PoC zatím chybí |

Mobilní Capacitor a desktopový Tauri shell mají počáteční konfigurační scaffold. CI generuje Android/iOS projekty, vytváří Android debug APK, sestavuje iOS Simulator aplikaci a kontroluje Tauri Rust shell pro Windows/Linux. Nativní video bridge AVPlayer, Media3 ani MPV/libmpv zatím hotový není.

## Spuštění

Požadavky: Node.js 26.13.1 LTS a npm 11+.

Z kořene repozitáře:

    npm ci
    npm run dev

Kontrola projektu:

    npm run typecheck
    npm test
    npm run build
    npm run check

Vite spustí web na http://127.0.0.1:5173.

Mobilní příprava (vyžaduje odpovídající iOS/Android toolchain):

    npm run mobile:add:android
    npm run mobile:add:ios
    npm run mobile:prepare

Desktopový Tauri shell (vyžaduje Rust a systémové závislosti):

    npm run desktop:dev
    npm run desktop:build

iOS build vyžaduje macOS + Xcode. Nativní platformní buildy ověřuje samostatný workflow `MIO Native Shell CI`; MPV/libmpv video integrace zatím hotová není.

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
