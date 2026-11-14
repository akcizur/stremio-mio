# Integrace zdrojů a konektorů

**Stav:** návrh provider kontraktů  
**Datum:** 14. listopadu 2026

## 1. Společný provider interface

Každý konektor by měl implementovat stejné základní operace:
- manifest / capabilities;
- search(query, filters);
- getCatalog(options);
- getMetadata(externalId);
- getStreams(mediaId);
- getSubtitles(mediaId);
- validateConfig(config);
- healthCheck().

Ne každý provider musí podporovat všechny operace. Nepodporovaná schopnost se deklaruje, nevymýšlí. Výsledek se mapuje do interních MIO typů a obsahuje provider ID, zdrojovou URL, licenční/authorization poznámku a čas získání.

## 2. Metadata filmů a seriálů

TMDB je kandidát na primární metadata provider pro názvy, synopse, obrázky, obsazení a identifikátory. IMDb lze používat jako ID cross-reference, nikoli automaticky jako volně dostupný zdroj veškerých metadat.

Důležité:
- ověřit aktuální podmínky, kvóty a podmínky komerčního použití před vydáním;
- u nekomerčního použití TMDB vyžaduje atribuci; komerční účel vyžaduje dohodu s TMDB;
- cache a obrázky ukládat jen v mezích API terms;
- data z více providerů slučovat s proveniencí a prioritami, nikoli slepě přepisovat.

Zdroje:
- [TMDB API FAQ](https://developer.themoviedb.org/docs/faq)
- [TMDB API documentation](https://developer.themoviedb.org/docs)

## 3. IPTV: M3U a M3U8

MIO bude umět importovat playlist, který uživatel vlastní nebo je oprávněn používat. Parsovat minimálně běžné atributy:
- EXTINF metadata: channel name, tvg-id, tvg-name, tvg-logo, group-title;
- URL streamu;
- komentáře a neznámé atributy zachovat bezpečně, pokud dávají smysl;
- podporu více playlistů a sloučení podle tvg-id s možností ručního mapování.

M3U playlist je seznam položek. HLS M3U8 manifest je playlist segmentů / variant streamu. Nejsou totéž, i když používají podobný textový formát. Parsování playlistu nesmí předpokládat, že každá URL je HLS.

### Aktuální implementace MIO

V balíčku `@mio/iptv` existuje parser M3U/M3U8 a lokální importní obrazovka. První webová verze:
- čte soubor lokálně v prohlížeči, limit 10 MB;
- zpracuje EXTINF, tvg-id, tvg-name, tvg-logo a group-title;
- zobrazuje vyhledávání a filtrování skupin;
- ukládá jeden aktuální playlist do IndexedDB;
- předá vybranou HTTP(S) stream URL do webového Player Lab.

V této fázi se nespouští vzdálené playlist URL na pozadí, neaplikují se hlavičky EXT-X/EXTVLCOPT a nejsou podporované RTSP, DRM ani vlastní autentizační hlavičky.

### EPG / XMLTV implementace

MIO používá `fast-xml-parser` 5.12.1 (MIT) pro syntaktické ověření a parsování XMLTV. Běžná externí XMLTV DTD je ignorována, nikoli stahována. Vlastní DTD/entity deklarace jsou odmítnuty a soubor má limit 20 MB. Pořady bez explicitního UTC offsetu nebo s neplatným časovým intervalem jsou přeskočeny, aby nedocházelo k tichému posunu programu.

M3U `tvg-id` se páruje s XMLTV `channel id` přesnou shodou. Automatické fuzzy párování ani ruční editor mapování zatím nejsou implementované.

Bezpečnost:
- playlist může obsahovat privátní nebo podepsané URL a přístupové tokeny;
- neodesílat obsah playlistu na externí analytiku;
- neukládat hesla v plain textu;
- u proxy serveru omezit cílové domény a chránit se proti SSRF;
- respektovat CORS na webu; nevypínat browser security;
- umožnit uživateli odstranit zdroj a všechna jeho cache data.

## 4. EPG / XMLTV

EPG importer načte XMLTV feed, zpracuje channel a programme položky a normalizuje časové údaje do UTC. UI zobrazuje čas v lokální časové zóně. Každý programme musí zachovat původní tvg-id/channel mapping, zdroj a update time.

Doporučený postup:
1. načíst feed přes bezpečný import pipeline;
2. ověřit velikost a strukturu XML, odmítnout entity expansion / XXE;
3. parsovat po blocích nebo streamingově, aby velký EPG nezahltit paměť;
4. mapovat channel id na M3U tvg-id nebo uživatelské mapování;
5. uložit indexované pořady v SQLite / IndexedDB;
6. mazat prošlé programy podle retention policy;
7. aktualizovat feed podle uživatelem nastavené frekvence a serverových limitů.

EPG časová pásma a DST musí projít testy: UTC offset, letní/zimní čas, chybějící timezone a noční přechod přes půlnoc. EPG data nejsou automaticky práva k vysílání.

Referenční projekt XMLTV:
- [XMLTV project](https://github.com/XMLTV/xmltv)

## 5. YouTube

YouTube integrace má být katalogové vyhledávání/metadata podle povolených API a oficiální embedded player. Nesmí:
- stahovat, ukládat nebo cachovat kopie audiovizuálního obsahu bez výslovného písemného povolení;
- blokovat reklamy nebo odstraňovat standardní funkce playeru;
- přepisovat player UI nebo skrývat prvky, které YouTube vyžaduje;
- obcházet age, region, account nebo content restrictions;
- vykreslovat samotný extrahovaný stream místo oficiálního playeru.

Když je uživatel na telefonu a YouTube aplikace je k dispozici, odkazy mají respektovat pravidla pro otevření v YouTube aplikaci nebo v systémovém browseru. Metadata a thumbnail musí být prezentovány v souladu s API policies.

Zdroje:
- [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [How to comply with YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies-guide)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)

## 6. SKTorrent a torrent/magnet konektor

SKTorrent je zatím pouze požadovaný kandidát na provider, nikoli ověřená technická integrace. Před implementací je nutné samostatně ověřit:
- zda existuje dokumentované a povolené API nebo rozhraní;
- podmínky webu, autentizaci, robot policy a limity;
- zda lze získaná metadata a odkazy legálně zpracovávat;
- zda má konektor pouze předat uživatelem zvolený odkaz externímu klientu, nebo zda MIO skutečně potřebuje vlastní torrent engine.

První bezpečný scope je pouze metadata/deep-link connector a zobrazení zdroje. Automatické získávání, indexování nebo streamování torrentů nebude implementováno bez jasného právního titulu a povolení zdroje. Torrent transport sám o sobě neříká nic o oprávnění sdílet konkrétní film.

Pokud MIO později implementuje torrent engine, oddělit jej do samostatného procesu/služby, přidat limity přenosu, kontrolu úložiště, mazání, síťové nastavení a audit právního původu. Torrent nesmí obcházet DRM ani omezení přístupových služeb.

## 7. Stremio addon kompatibilita

Stremio addon protokol je užitečný interoperabilní kontrakt pro manifest, katalogy, metadata, streamy a titulky. Není nutné používat pouze jejich Node SDK; protokol lze implementovat jiným jazykem. MIO by mělo:
- podporovat pouze explicitně uvedené resources;
- validovat manifest a každou odpověď;
- omezit timeouty a velikosti odpovědí;
- zobrazovat původ streamu a otevřít detail zdroje;
- neprovádět automatické přehrání bez uživatelské volby.

Zdroje:
- [Stremio Addon Protocol](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/protocol.md)
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- [Stremio Addon Guide](https://stremio.github.io/stremio-addon-guide/)

