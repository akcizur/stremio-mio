# MIO · Media Interface Options

> Pracovní technická dokumentace a architektonická rozhodnutí projektu MIO.

**Stav:** návrh architektury, nikoli implementovaný systém  
**Ověřeno:** 14. listopadu 2026  
**Repozitář:** https://github.com/akcizur/stremio-mio

MIO má být vlastní multiplatformní mediální aplikace. Hlavní cílové platformy jsou **web, iOS, Android, Windows a Linux**. Cílem není vytvořit pouhý vizuální klon Stremia, ale vlastní produkt s jednotným katalogem, knihovnou, vyhledáváním, přehrávačem a rozšiřitelnými konektory.

## Doporučení v jedné větě

Začněme **web-first architekturou v TypeScriptu (React + Vite)**, sdílejme doménovou logiku a datové kontrakty, mobilní aplikace nejprve zabalme přes **Capacitor** s nativním přehráváním (**AVPlayer na iOS, Android Media3/ExoPlayer na Androidu**) a desktop řešme přes **Tauri 2**, ale jeho finální potvrzení podmiňme funkčním PoC přehrávače. Nepokoušejme se vynutit jeden stejný video engine na všech systémech.

## Obsah

- [Platformní strategie](PLATFORM_STRATEGY.md)
- [Srovnání technologií a doporučený stack](TECHNOLOGY_DECISIONS.md)
- [Přehrávání, streamy a DRM](MEDIA_PLAYBACK.md)
- [Architektura systému a dat](SYSTEM_ARCHITECTURE.md)
- [Integrace zdrojů a konektorů](INTEGRATIONS.md)
- [Licence, práva a compliance](LICENSING_AND_COMPLIANCE.md)
- [Roadmapa a akceptační kritéria](ROADMAP.md)
- [Architektonická rozhodnutí (ADR)](ADR/)

## Rozhodnutí, která zatím nejsou definitivní

1. **Desktopový video host:** Tauri 2 je výchozí kandidát. Před potvrzením je nutné otestovat MPV/libmpv, překrytí UI a hardwarovou akceleraci na Windows i Linuxu.
2. **Mobilní přehrávač:** doporučená cesta je nativní plugin pro AVPlayer a Media3, nikoli přehrávání všech streamů uvnitř webového video elementu.
3. **Stremio Core:** provést integrační PoC. Core je zajímavá MIT-licencovaná komponenta; jeho WASM bridge je však navržen pro webové prostředí a nelze předpokládat přímou kompatibilitu s každým mobilem.
4. **Cloud účet a synchronizace:** nejprve lokální knihovna a export/import. Backend a synchronizace přijdou až po stabilizaci datového modelu.
5. **SKTorrent a další zdroje:** konektory pouze pro obsah, který má uživatel oprávnění používat, a v mezích podmínek daného zdroje.

## Zásady projektu

- **Vlastní UI:** nepřebírat GPL UI stremio-web jako základ produktu.
- **Sdílet kontrakty, ne za každou cenu vykreslování:** stejné typy, use-cases a testy; platformní UI a přehrávače mohou být různé.
- **Playback je platformní subsystém:** UI nesmí být pevně svázané s MPV, AVPlayer ani ExoPlayer.
- **Lokální-first:** katalogové cache, nastavení a knihovna musí fungovat bez trvalého připojení; synchronizace je volitelná.
- **Bezpečné konektory:** žádné neomezené spouštění cizího kódu ani libovolné síťové požadavky z pluginů.
- **Legální zdroje:** aplikace nesmí obcházet DRM, paywally, reklamy ani autorská práva.

## Jak číst tuto dokumentaci

- **Ověřený fakt** znamená, že jej podporuje uvedený oficiální zdroj nebo upstream repozitář.
- **Doporučení** je naše architektonická volba, nikoli vlastnost frameworku.
- **PoC / ověřit** označuje technické riziko, které nelze zodpovědně rozhodnout pouze z dokumentace.
- Odkazy vedou primárně na dokumentaci výrobců, specifikace a upstream repozitáře. Verze, podmínky a API se mohou změnit; před vydáním je nutné znovu provést kontrolu.
