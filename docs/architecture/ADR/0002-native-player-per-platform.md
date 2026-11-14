# ADR 0002 · Nativní přehrávač podle platformy

- **Stav:** doporučeno; čeká na PoC
- **Datum:** 14. listopadu 2026

## Kontext

Video je kritická funkce MIO. WebView, iOS, Android a desktop nemají stejné dekódování, DRM ani přístup k systémovým player API. Přehrávání všech formátů přes jediný HTML video element vytváří platformní slepá místa.

## Rozhodnutí

Zavést vlastní player contract a adaptér na každé platformě:
- web: HTML video + hls.js/dash.js podle podpory;
- iOS: AVPlayer;
- Android: Media3/ExoPlayer;
- Windows/Linux: MPV/libmpv PoC.

## Alternativy

- Jeden browser player všude: odmítnuto, protože iOS HLS a MSE, DRM a systémové funkce nejsou shodné.
- MPV na všech platformách: zamítnuto jako výchozí volba, protože browser a iOS integrace by vyžadovala další nativní vrstvy a licenci.
- Vlastní dekodér: mimo rozsah a zbytečně vysoké náklady.

## Důsledky

MIO musí normalizovat stav, tracky, chyby, timeline a lifecycle. Některé funkce budou platform-specific a UI je zobrazí pouze tehdy, pokud player deklaruje příslušnou capability.

## Podmínky úspěchu

Video je inline v MIO okně; seek, audio tracks, subtitles, fullscreen, reconnect a HW decoding fungují dle testovací matice. Ověřit i licence MPV, FFmpeg a kodeků před distribucí.
