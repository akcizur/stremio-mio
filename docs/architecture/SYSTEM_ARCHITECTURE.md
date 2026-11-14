# Architektura systému a dat

**Stav:** návrhový model pro MVP  
**Datum:** 14. listopadu 2026

## 1. Přehled vrstev

MIO se rozdělí na čtyři vrstvy:

1. **Platform shells** – web/PWA, Capacitor iOS/Android a Tauri desktop.
2. **Domain / application** – katalog, knihovna, historie, EPG, vyhledávání, nastavení a orchestrace přehrávání.
3. **Provider adapters** – metadata, IPTV, YouTube a autorizované stream zdroje; všechny vstupy se normalizují do společných kontraktů.
4. **Persistence and optional services** – IndexedDB/SQLite, export/import a později cloud sync / account API.

Platform shell poskytne doméně capability adaptery: storage, file access, secure secrets, player host, deep links, background tasks a notifications. Doména nesmí přímo importovat Tauri, Capacitor, Swift, Kotlin nebo MPV knihovny.

## 2. Navrhované hranice balíčků

| Balíček | Odpovědnost |
|---|---|
| domain | use-cases, entity a business pravidla |
| contracts | typy a JSON schema pro providery, player a pluginy |
| catalog | normalizace filmů, seriálů, epizod a kanálů |
| providers | konektory k externím API / add-onům |
| library | watchlist, progress, favourites, local sources |
| playback | player orchestrator a normalizované události |
| epg | parsování a indexace XMLTV, programová mřížka |
| storage-web | IndexedDB implementace |
| storage-native | SQLite implementace pro nativní shelly |
| ui | webové design tokens, primitives a React komponenty |

Nejdřív vytvoříme pouze balíčky, které skutečně potřebují první vertical slice. Návrh není příkazem založit všechny složky jako prázdné.

## 3. Datový model

Minimální entity:
- **MediaItem:** stabilní MIO ID, typ (movie/series/episode/channel), názvy, externí identifikátory, obrázky, textová metadata.
- **Season / Episode:** pořadové číslo, data vysílání, vazba na seriál.
- **Source:** provider ID, typ zdroje, název, nastavení, oprávnění, stav dostupnosti.
- **StreamOption:** URL nebo nativní content reference, MIME/container hint, headers reference, source ID, DRM capability descriptor (ne tajné klíče), jazyk a kvalita.
- **LibraryEntry:** status, favourite, watch progress, added/updated timestamps.
- **PlaybackSession:** media ID, source ID, position, duration, selected tracks, last error.
- **Channel:** playlist channel ID, tvg-id, group-title, logo, stream reference.
- **Programme:** XMLTV channel ID, start/end UTC, title, description, category.
- **Addon / Connector:** manifest, version, origin, granted permissions, health and config.
- **UserSettings:** locale, theme, playback preferences, parental settings and privacy options.

Externí identifikátory nejsou globálně unikátní napříč providery. Ukládat je jako namespaced key (provider + external ID), ne přepisovat jedno ID druhým. Pro pořady použít pokud možno IMDb/TMDB/TVDB identifikátory, ale interní MIO ID musí zůstat stabilní.

## 4. Persistence

### Web
Použít IndexedDB pro strukturovanou knihovnu a metadata cache; Service Worker pro app shell a statické prostředky. Cache storage není hlavní databáze a nemá být zdrojem pravdy pro uživatelská data.

### iOS / Android / desktop
Použít SQLite pro větší lokální knihovnu, EPG index a historii. Přes platform adapter nabídnout stejné repository rozhraní. U mobilu respektovat sandbox a systémové file picker API.

### Synchronizace
Nejprve export/import knihovny jako verzovaný JSON. Až bude datový model stabilní, doplnit volitelný účet a sync API. Sync musí mít:
- stabilní UUID každé entity;
- server-side revision/version a client mutation IDs;
- idempotentní zápisy;
- timestamp a conflict resolution policy;
- mazací tombstones;
- ochranu proti replay a neoprávněnému přístupu;
- možnost uživatele data exportovat a smazat.

Nesynchronizovat samotné video segmenty, chráněný obsah ani citlivé přihlašovací údaje v nešifrované podobě.

## 5. Backend: nejdříve modulární, ne mikroslužby

Backend není nezbytný pro první web/desktop MVP. Přidáme jej, až budeme potřebovat cloud sync, account management, bezpečné uložení serverových API klíčů nebo serverové zpracování velkých EPG feedů.

První backend může být jeden modulární proces/API:
- auth + user profile;
- sync API;
- metadata proxy/cache podle licenčních podmínek;
- EPG ingestion job;
- katalogové cache;
- audit log a rate limits.

Nevytvářet desítky mikroslužeb bez měřitelné potřeby. Lokální zdroje a player musí fungovat i bez dostupného backendu.

## 6. Plugin a konektor architektura

Pluginy nesmí být neomezené balíčky spouštějící libovolný kód uvnitř UI procesu. V první generaci mají být konektory:
- deklarativní manifest + oprávnění;
- HTTP/HTTPS adaptéry s definovanými resource routes;
- validovaný JSON výstup podle versioned schema;
- timeout, limity velikosti odpovědi, retry policy a rate limits;
- možnost zakázat nebo odvolat konektor;
- viditelný původ streamu a provider.

Pro kompatibilitu se Stremio můžeme implementovat subset addon protokolu (manifest, catalog, meta, stream, subtitles). Vstup z addonů musí být validován a nesmí se automaticky přehrávat. Vlastní konektory budou implementovat tentýž interní interface, takže MIO nebude závislé na jediném ekosystému.

## 7. Bezpečnost hranic

- API keys nikdy nevkládat do veřejného JavaScript bundle, pokud provider výslovně neposkytuje public client key model.
- URL zdroje validovat; zakázat nečekané lokální a privátní síťové adresy tam, kde request provádí server.
- Server proxy musí mít SSRF ochranu, allowlist domén tam, kde je to možné, redirect limity a DNS/IP re-check.
- Sanitizovat názvy, popisy, HTML a titulky z externích zdrojů.
- Omezit přístup pluginů k souborům, cookies a tajemstvím.
- Zabezpečit lokální IPC desktopu proti přístupu z cizích web originů.
- Logy nesmí obsahovat hesla, tokeny, signed URL ani plné IPTV playlisty.
- Přihlašovací údaje a playlisty ukládat do OS secure storage, pokud to platforma umožňuje.
- Uživatel má vidět, který provider poskytl daný stream a jaká oprávnění konektor používá.

## 8. Pozorování a diagnostika

Jednotné diagnostické události:
- source_fetch_started / completed / failed;
- manifest_parsed / invalid;
- playback_requested / ready / stalled / ended / failed;
- player_capabilities_detected;
- epg_import_started / completed / rejected;
- sync_started / conflict / completed.

Ukládat pouze technická metadata nezbytná pro debug. Analytics musí být opt-in nebo transparentní podle právních a produktových požadavků; nikdy neodesílat samotné stream URL, auth hlavičky nebo obsah playlistu.

