# Implementační stav MIO

**Aktualizováno:** 14. listopadu 2026  
**Větev:** main  
**Poslední ověřený commit:** d50b1b0d029473ff73bd0b6c84c697a76f42e598

Tento dokument rozlišuje skutečně implementované funkce od prototypů a plánů.

## Web shell

- [x] React + TypeScript + Vite workspace
- [x] responzivní MIO shell a navigace
- [x] demonstrační katalog a filtrování
- [x] CI: TypeScript typecheck, Vitest a produkční build

## Přehrávání

- [x] společný TypeScript player contract
- [x] bezpečná validace HTTP(S) URL bez userinfo
- [x] HTML5 video pro přímé mediální URL
- [x] HLS přes nativní podporu prohlížeče nebo HLS.js + MSE
- [x] instalovatelný manifest, service worker a offline app shell
- [x] základní stavové události, chyba, buffering a cleanup
- [ ] skutečné cross-browser E2E přehrávání na fyzických zařízeních
- [ ] MPEG-DASH
- [ ] výběr audio/subtitle tracků a externí titulky
- [ ] DRM a autorizované licenční flow
- [ ] nativní AVPlayer, Media3 a MPV/libmpv adaptéry

HLS webová implementace je první PoC, ne záruka kompatibility všech streamů. Zdroj musí povolit CORS, používat podporovaný kodek a odpovídat schopnostem daného prohlížeče.

## Osobní knihovna

- [x] lokální IndexedDB repository
- [x] přidání/odebrání ukázkových titulů
- [x] načtení po obnovení stránky
- [ ] model skutečného MediaItem, epizod a provider IDs
- [ ] watch progress z player session
- [ ] JSON export/import

## IPTV a EPG

- [x] lokální M3U/M3U8 souborový import do 10 MB
- [x] parsing kanálů, skupin, tvg-id, tvg-name a bezpečné tvg-logo URL
- [x] vyhledávání a filtrování podle skupin
- [x] uložení jednoho playlistu do IndexedDB
- [x] XMLTV import do 20 MB
- [x] validace XML a odmítnutí vlastních DTD/entity deklarací
- [x] ignorování běžné externí XMLTV DTD bez síťového fetch
- [x] povinný explicitní UTC offset a normalizace na UTC
- [x] aktuální/následující pořad pro přesně spárované tvg-id
- [x] čtyřhodinová EPG časová osa s výběrem pořadu a detailem
- [ ] více playlistů, automatické obnovování a synchronizace
- [ ] ruční channel mapping a plný EPG grid
- [ ] programový detail a metadata pořadů

## Zdrojové konektory

- [ ] TMDB / metadata provider
- [ ] YouTube Data API + oficiální embedded player
- [ ] Stremio addon compatibility adapter
- [ ] autorizované lokální media sources
- [ ] ověřený a povolený SKTorrent connector scope

## Platformní shells

- [ ] Capacitor iOS shell
- [ ] AVPlayer Swift bridge
- [ ] Capacitor Android shell
- [ ] Media3 Kotlin bridge
- [ ] Tauri Windows shell
- [ ] Tauri Linux shell
- [ ] MPV/libmpv inline rendering PoC

## Co znamená zelené CI

Zelený CI běh dokládá, že TypeScript, automatické unit testy a Vite production build prošly na GitHub runneru. Nedokládá přehrání konkrétního cizího streamu, App Store readiness ani nativní podporu kodeků/DRM. Tyto body potřebují testy na skutečných cílových platformách.
