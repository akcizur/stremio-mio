# Licence, práva a compliance

**Stav:** technická kontrolní dokumentace; nenahrazuje právní stanovisko  
**Datum kontroly:** 14. listopadu 2026

## 1. Pravidlo pro závislosti

Před přidáním každé knihovny ověřit:
- licenci v konkrétní verzi a distribuovaném artefaktu;
- tranzitivní závislosti a volitelné build flags;
- povinnosti při redistribuci binárek;
- zda je knihovna staticky/dynamicky linkována nebo běží jako samostatný proces;
- ochranné známky, patenty kodeků a případné placené SDK;
- kompatibilitu s distribucí pro iOS App Store a Google Play.

V repozitáři bude později potřeba automatický SBOM/licence audit a soubor THIRD_PARTY_NOTICES.md.

## 2. Stremio upstream

| Komponenta | Zjištěný stav | Doporučení |
|---|---|---|
| stremio-web | GPL-2.0 | Nepřebírat UI jako základ MIO; vlastní implementace |
| stremio-core | MIT | Kandidát na selektivní použití; zachovat copyright/license notice |
| stremio-core-web | součást repozitáře core; bridge pro WASM/Worker | Ověřit konkrétní npm artifact, API a tranzitivní licence |
| stremio-addon-sdk | MIT (upstream GitHub) | Lze zvažovat pro server-side konektor; respektovat license |
| stremio-video | player abstraction; licence zkontrolovat v připnuté verzi před použitím |
| stremio-shell-ng | samostatný Rust shell; licenci ověřit v konkrétním revisionu a všech bundlovaných artefaktech |

Odkazy:
- [stremio-web licence a README](https://github.com/Stremio/stremio-web)
- [stremio-core licence](https://github.com/Stremio/stremio-core/blob/development/LICENSE.md)
- [stremio-core-web bridge](https://github.com/Stremio/stremio-core/tree/development/stremio-core-web)
- [stremio-addon-sdk](https://github.com/Stremio/stremio-addon-sdk)
- [stremio-video](https://github.com/Stremio/stremio-video)
- [stremio-shell-ng](https://github.com/Stremio/stremio-shell-ng)

### Důležitá korekce k GPL a App Store

Není správné tvrdit zjednodušeně, že každá GPL knihovna automaticky "nejde do App Store". Skutečný problém je kompatibilita licenčních podmínek GPL, způsobu spojení/distribuce, podpisových a distribučních podmínek konkrétního store a dalších smluvních omezení. To vyžaduje právní analýzu konkrétního produktu. Nejnižší riziko pro MIO je převzít pouze komponenty s licencí kompatibilní s cílovým obchodním modelem, mít vlastní UI a nepřebírat GPL aplikaci jako celek bez compliance plánu.

## 3. MPV, FFmpeg, kodeky a nativní knihovny

Před balením MPV/libmpv je nutné zkontrolovat přesnou licenci sestavení, volby FFmpeg a další komponenty v něm zahrnuté. Rozdíl mezi dynamickým linkováním, statickým linkováním a samostatným procesem má právní dopady. Samostatný proces ale neznamená automaticky nulové licenční povinnosti: distribuovaný MPV/FFmpeg balík stále musí splnit vlastní licence.

Stejně je nutné ověřit patenty/licence kodeků a případné omezení komerční distribuce. Nepředpokládat, že schopnost zařízení dekódovat formát znamená právo MIO jej redistribuovat.

Zdroje:
- [MPV project](https://mpv.io/)
- [FFmpeg licensing](https://ffmpeg.org/legal.html)
- [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html)

## 4. Obsahové právo a zdrojové konektory

MIO je agregátor uživatelem nakonfigurovaných zdrojů a osobní knihovny, nikoli automatická licence k obsahu. Každý konektor musí respektovat:
- práva uživatele k přehrávání/stahování/sdílení;
- podmínky poskytovatele a přístupová omezení;
- autorské právo a související práva;
- geografická omezení a licenční podmínky;
- ochranu DRM a technická opatření;
- pravidla obchodů pro distribuci aplikací.

Nedělat automatické stahování nebo sdílení děl bez doloženého oprávnění. Neobcházet DRM, paywally, geoblocking, autentizaci ani reklamy.

## 5. YouTube

YouTube API policies výslovně omezují ukládání a offline přehrávání audiovizuálního obsahu bez písemného souhlasu a zakazují zhoršovat či měnit standardní funkce playeru. Integrace proto zůstane u oficiálního embedu/API a povolených metadat. MIO nebude implementovat extrakci přímé stream URL ani blokování reklam.

Zdroj:
- [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies)

## 6. TMDB

TMDB uvádí, že Developer API je bez poplatku pro nekomerční použití s požadovanou atribucí. Pokud je primárním účelem projektu generovat příjmy, TMDB jej považuje za komerční a požaduje komerční dohodu. Před veřejným nebo komerčním uvedením MIO ověřit podmínky a umístění loga/atribuce.

Zdroj:
- [TMDB FAQ](https://developer.themoviedb.org/docs/faq)

## 7. Ochrana osobních údajů a bezpečnost

Přihlášení k IPTV účtu, playlisty, URL se signed tokeny, historie sledování a preference jsou citlivé uživatelské údaje. Nutné:
- minimalizovat sběr a uchovávání;
- šifrovat přenos;
- používat secure storage;
- poskytnout export a smazání;
- nezapisovat secret do logů;
- transparentně popsat případnou telemetrii;
- mít zásady ochrany osobních údajů, kontaktní místo a postup bezpečnostního hlášení.

Před App Store / Google Play vydáním ověřit aktuální pravidla review, privacy labels/data safety a deklarace oprávnění. Samotný obal webové aplikace nesmí být jedinou hodnotou mobilní aplikace; MIO má poskytovat skutečnou funkčnost mobilního zařízení, zejména nativní playback, práci s knihovnou a systémové integrace.

Zdroje:
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/)

