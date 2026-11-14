# Roadmapa MIO a akceptační kritéria

**Stav:** plán navržený pro iterativní vývoj  
**Datum:** 14. listopadu 2026

## Princip

Postupovat po vertical slices. Každá fáze musí mít běžící, otestovatelný výsledek. Nezakládat velké balíčky pro funkce, které ještě nemají ověřené rozhraní. Priorita je web, iOS, Android, Windows a Linux; další zařízení až po stabilizaci této základny.

## Fáze 0 · Rozhodovací PoC přehrávače

**Cíl:** nejprve odstranit největší technickou nejistotu.

Vytvořit minimální testovací aplikaci:
- web UI s jedním video panelem a ovládáním;
- HLS VOD + live test streamy;
- iOS AVPlayer bridge;
- Android Media3 bridge;
- desktop MPV PoC na Windows a Linuxu;
- jednotné event/error rozhraní.

**Akceptace:**
- Play/pause/seek/volume, track selection a subtitles;
- fullscreen a okno resize;
- stream reconnect a chybové stavy;
- ověřené HW decode na fyzických zařízeních;
- žádné tajné klíče v UI bundle;
- report výsledků a rozhodnutí Tauri vs Electron.

Výstup: technický report a ADR rozhodnutí. Bez této fáze se nepovažuje desktop player architektura za definitivní.

## Fáze 1 · Repo baseline a web skeleton

**Cíl:** stabilní webová kostra MIO.

První implementace:
- React + TypeScript + Vite;
- routing, layout, theme a CZ/EN lokalizace;
- design tokens a základní UI primitives;
- z-složení aplikace (home, discover, search, detail, library, settings);
- CI: install, lint, typecheck, unit tests, production build;
- [x] PWA manifest, service worker a offline cache aplikačního shellu;
- offline UI/data, ale bez předstírání offline video playback.

**Akceptace:**
- čisté checkout + install/build projde v CI;
- žádné nevyřešené TypeScript chyby;
- responsive layout pro mobil, tablet a desktop;
- minimální accessibility smoke tests;
- základní dokumentace developer setup.

## Fáze 2 · Doména, katalog a knihovna

- definovat stabilní MIO IDs a provider namespacing;
- vytvořit canonical MediaItem / Episode / Channel / Source modely;
- přidat metadata adapter (nejprve test fixture, poté TMDB po vyřešení klíčů a podmínek);
- lokální IndexedDB storage;
- [x] lokální playback historie a continue watching pro podporované VOD streamy;
- watchlist, favourites, watched state a JSON export/import;
- JSON export/import.

**Akceptace:** data zůstanou dostupná po restartu a bez připojení; export lze obnovit do čisté instalace; chybná externí data nepoškodí knihovnu.

## Fáze 3 · Playback abstraction

- zavést player contract;
- implementovat web video backend;
- doplnit hls.js/dash.js pouze na kompatibilních prohlížečích;
- native plugin pro AVPlayer a Media3 podle výsledků fáze 0;
- sjednotit track model, timeline, errors a buffering events.

**Akceptace:** testovací matice v MEDIA_PLAYBACK.md prochází na skutečných platformách.

## Fáze 4 · IPTV a EPG

**Stav: první lokální vertical slice hotový; plná fáze je rozpracovaná.**

- [x] import jednoho lokálního M3U/M3U8 playlistu;
- [x] kanály, základní skupiny, vyhledávání a filtrování;
- [x] ochrana proti nepovoleným protokolům a URL userinfo;
- [x] lokální uložení playlistu v IndexedDB;
- [x] XMLTV import do 20 MB;
- [x] převod časů s explicitním UTC offsetem do UTC;
- [x] zobrazení aktuálního a následujícího pořadu;
- [x] celodenní EPG časová osa a detail pořadu;
- [x] lokální EPG připomínky per playlist, kontrola pět minut před začátkem při otevřené aplikaci;
- [ ] spolehlivé systémové připomínky po zavření aplikace přes nativní plánovač nebo server push;
- [x] párování kanálů podle přesné shody tvg-id a XMLTV channel id;
- [ ] více pojmenovaných playlistů a slučování;
- [ ] plánované aktualizace vzdálených playlistů a EPG;
- [ ] ruční mapování kanálů bez shodného tvg-id;
- [ ] plný EPG grid, detail pořadu a časová osa;
- [ ] testy velkých produkčních feedů, duplicit a chybějících dat.

**Automatické stahování zdrojů a synchronizace zatím nejsou implementované.** Import souboru probíhá lokálně.

## Fáze 5 · Stremio kompatibilita a pluginy

- vyhodnotit Stremio Core WASM integration;
- implementovat vlastní connector interface;
- zprovoznit pouze read-only, povolený addon protocol subset;
- správa zdrojů, důvěry a oprávnění.

**Akceptace:** konektor lze přidat/odebrat bez restartu, špatný výstup je odmítnut a uživatel vidí původ výsledků.

## Fáze 6 · YouTube a další autorizované zdroje

- katalogové hledání přes oficiální API;
- official embedded player;
- handling YouTube account / privacy / policy constraints;
- další autorizované zdroje až po ověření API a práv.

**Akceptace:** žádná extrakce video streamu, blokování reklam ani neautorizované offline ukládání.

## Fáze 7 · Mobilní a desktop release kandidáti

- Capacitor iOS/Android production builds;
- nativní permissions, secure storage, app links, player lifecycle;
- Tauri desktop installers pro Windows/Linux;
- updater, crash reporting a signing process;
- App Store / Google Play privacy and review checklist.

**Akceptace:** smoke test na skutečných telefonech, čisté Windows instalaci a podporovaných Linux distribucích; ověřené podepisování a upgrade bez ztráty knihovny.

## Fáze 8 · Účet a cloud sync

Až po stabilizaci lokálních modelů:
- autentizace;
- sync knihovny, watch progress a nastavení;
- idempotentní mutation API;
- conflict resolution a deletion semantics;
- backup/restore.

**Akceptace:** testy souběžné editace na dvou klientech a offline změn; žádné ztracené záznamy po konfliktu.

## Fáze 9 · Rozšíření ekosystému

Volitelně:
- Android TV / Google TV;
- pokročilá lokální media library;
- přístupné remote pluginy;
- další oficiální metadata providers;
- Chromecast/AirPlay rozšíření;
- další desktop packaging varianty.

Tyto funkce nejsou blokující pro první verzi.

## První sprint

Doporučené první konkrétní výstupy:
1. založit web skeleton React + Vite + TypeScript v apps/web;
2. založit player contract s mock backendem;
3. udělat jednoduché přehrávací test harness místo katalogu plného funkcí;
4. připravit testovací playlist / HLS fixture s legálním demo obsahem;
5. napsat PoC specifikaci pro AVPlayer, Media3 a MPV;
6. teprve podle výsledků uzamknout shell strategy.

