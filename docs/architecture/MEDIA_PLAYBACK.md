# Přehrávání, streamy a DRM

**Stav:** kritický technický návrh; před implementací vyžaduje PoC  
**Datum kontroly:** 14. listopadu 2026

## 1. Zásada: jedno API, více přehrávačů

MIO potřebuje jednotný aplikační kontrakt pro přehrávání, nikoli jeden jediný engine pro všechny systémy.

Navrhované rozhraní na úrovni domény:
- open(source, options)
- play(), pause(), stop()
- seek(position), setVolume(value)
- getPlaybackState()
- getTracks() a selectTrack(kind, id)
- setSubtitle(uri) / disableSubtitles()
- setPlaybackRate(value)
- enterFullscreen() / exitFullscreen()
- subscribe(eventHandler) a dispose()

Implementace:
- Web: HTMLMediaElement; hls.js nebo dash.js tam, kde platforma podporuje MSE; nativní HLS fallback.
- iOS: vlastní Swift bridge nad AVPlayer/AVFoundation.
- Android: vlastní Kotlin bridge nad AndroidX Media3/ExoPlayer.
- Windows/Linux: nejprve HTML video + samostatný MPV PoC; později MPV/libmpv, pokud se prokáže stabilní inline rendering.

UI pracuje s normalizovanými událostmi. Nesmí vědět, zda pod ním běží MPV, AVPlayer, ExoPlayer nebo HTML video.

## 2. Web playback

Pro progresivní soubory a přímé podporované media URL lze využít HTML video. Pro adaptivní streamy:
- hls.js využívá Media Source Extensions (MSE);
- dash.js využívá MSE pro MPEG-DASH;
- pokud je MSE nedostupné, použít nativní HLS, pokud jej platforma nabízí;
- pokud není podporováno ani jedno, zobrazit srozumitelnou chybu a nabídnout externí kompatibilní přehrávač pouze v rozsahu práv uživatele.

U hls.js je nutné ověřit MSE a povolené MIME typy; všechny segmenty, manifesty a key endpointy musí mít správně nastavený CORS. CORS nelze bezpečně "opravit" vypnutím ochrany v klientu.

Zdroje:
- [hls.js: kompatibilita a CORS](https://github.com/video-dev/hls.js)
- [dash.js](https://github.com/Dash-Industry-Forum/dash.js)
- [MDN: Media Source Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API)
- [MDN: Encrypted Media Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API)

## 3. iOS: AVPlayer, nativní HLS a FairPlay

Apple AVPlayer umí přehrávat místní i vzdálená média a HLS. Proto pro iOS nevytváříme vlastní MSE pipeline. Capacitor UI odešle playback request do Swift pluginu a nativní player zobrazí video v řízené platformní ploše.

PoC musí ověřit:
- HLS live a VOD;
- výběr variant/bandwidth a přepínání kvality, pokud jej API dovolí;
- audio jazyky a subtitle tracky;
- externí titulky ve formátech vyžadovaných produktem;
- AirPlay, PiP a background režim;
- chování při zamknutí obrazovky, hovoru, přerušení a návratu do aplikace;
- lokální soubory a autorizovaný přístup k nim;
- synchronizaci lifecycle událostí mezi Swift a React UI.

FairPlay není obecný způsob odemknutí cizího streamu. Je to systém ochrany obsahu pro poskytovatele obsahu a jeho autorizované klienty. Produkční nasazení vyžaduje oprávnění, certifikáty a key-server infrastrukturu od poskytovatele.

Zdroje:
- [Apple AVPlayer](https://developer.apple.com/documentation/avfoundation/avplayer)
- [Apple HTTP Live Streaming](https://developer.apple.com/documentation/http-live-streaming)
- [Apple FairPlay Streaming](https://developer.apple.com/streaming/fps/)

## 4. Android: Media3 / ExoPlayer

Android implementace použije Media3. Samotné přidání přehrávačové knihovny neznamená podporu každého kodeku nebo DRM systému na každém zařízení; rozhoduje verze Androidu, hardware, profil, kontejner, DRM schéma a firmware.

PoC ověří:
- HLS (MPEG-TS i CMAF/fMP4 podle reálných zdrojů);
- DASH;
- Widevine pouze na kompatibilním zařízení a u autorizovaného poskytovatele;
- audio/subtitle track selection;
- live stream latency a reconnect;
- HW decode, HDR pokud bude požadováno;
- PiP, audio focus, Bluetooth/headphones, background playback;
- lokální soubory, scoped storage a MediaStore/Storage Access Framework;
- Android TV remote navigation jako samostatný požadavek, pokud bude v rozsahu.

Zdroje:
- [Android Media3: HLS](https://developer.android.com/media/media3/exoplayer/hls)
- [Android Media3: DRM](https://developer.android.com/media/media3/exoplayer/drm)
- [Android Media3: supported devices](https://developer.android.com/media/media3/exoplayer/supported-devices)

## 5. Desktop: MPV/libmpv PoC

MPV je silný kandidát kvůli kodekům, titulkům, audio trackům a různým video output backendům. Klíčové riziko není umět spustit MPV, ale integrovat jeho obraz do okna MIO a udržet synchronizaci UI.

PoC porovná tři cesty:
1. **MPV jako externí proces:** nejjednodušší ovládání přes JSON IPC, ale samostatné okno a neúplné UI překrytí.
2. **libmpv render API:** přímější integrace, ale vyžaduje správné grafické kontexty a nativní host integraci.
3. **oddělený video surface / child window:** může oddělit video od webového compositingu; nutno ověřit překryvy a resize.

Testovat samostatně Windows (WebView2 + D3D11) a Linux (dostupný GPU backend a distribuce). Zvláštní pozornost:
- přechody mezi oknem a fullscreen;
- změna velikosti/HiDPI/multi-monitor;
- hardwarové dekódování a vykreslování;
- titulky a jejich překrytí;
- více audio stop, synchronizace;
- sleep/resume a audio device changes;
- file associations a deep links.

Stremio shell-ng popisuje přímé MPV vykreslování v okně jako zásadní část své Windows architektury. Je to užitečný referenční příklad, nikoli důkaz, že stejný postup bude bez úprav fungovat v Tauri a na Linuxu.

Zdroje:
- [Stremio shell-ng README](https://github.com/Stremio/stremio-shell-ng)
- [MPV manual](https://mpv.io/manual/master/)
- [libmpv reference](https://mpv.io/manual/master/#embedding-into-other-programs-(libmpv))

## 6. HLS vs DASH vs přímý soubor

| Formát | Použití | Poznámky |
|---|---|---|
| HLS | IPTV live, VOD | Nativní cesta na Apple; Android Media3 má HLS modul; na webu závisí na MSE nebo native HLS |
| DASH | adaptivní VOD/live | Android Media3; web přes MSE/dash.js; iOS vyžaduje ověřit poskytovatelovu cestu a nativní podporu |
| MP4 / MKV / jiné lokální kontejnery | lokální knihovna | Podpora kodeků a kontejnerů se liší dle nativního enginu |
| YouTube embed | YouTube video | Použít oficiální embed/API player; nepřesměrovávat stream mimo povolený player |

Playlist IPTV v M3U/M3U8 a HLS manifest M3U8 nejsou zaměnitelné pojmy. Uživatelský playlist M3U může popisovat řadu kanálů; URL konkrétního kanálu pak může ukazovat na HLS stream.

## 7. DRM a licencovaný obsah

DRM implementace vyžaduje dohodu s poskytovatelem obsahu. Typicky se setkáme s:
- Widevine na podporovaných Android zařízeních / ekosystémech;
- FairPlay Streaming na Apple platformách;
- případně dalšími schématy podle poskytovatele.

MIO nesmí obsah dešifrovat, extrahovat klíče, obcházet DRM ani napodobovat autorizované zařízení. Pokud poskytovatel nedodá legální playback URL, entitlement a potřebné licenční parametry, daný titul se v MIO zobrazí pouze jako metadata nebo odkaz na oficiální aplikaci/službu.

## 8. Minimální matice testů

| Test | Web Chromium | iOS | Android | Windows | Linux |
|---|---:|---:|---:|---:|---:|
| MP4 H.264/AAC | Ano | Ano | Ano | Ano | Ano |
| HLS VOD | hls.js/native | AVPlayer | Media3 | web/MPV | web/MPV |
| HLS live | ověřit | ověřit | ověřit | ověřit | ověřit |
| DASH | dash.js/MSE | ověřit | Media3 | web/MPV | web/MPV |
| DRM | podle browser/CDM | FairPlay entitlement | Widevine entitlement | podle runtime/DRM | podle runtime/DRM |
| více audio stop | ověřit | ověřit | ověřit | MPV PoC | MPV PoC |
| titulky SRT/ASS/VTT | ověřit | ověřit | ověřit | MPV PoC | MPV PoC |
| HW decode | browser/device | device | device | D3D/MPV | GPU stack |

Tabulka je testovací plán, ne záruka podpory.

## 9. Kritéria úspěchu player PoC

PoC je úspěšný, pokud:
- na webu umíme správně detekovat a zvolit HLS/DASH přehrávací větev;
- iOS a Android používají nativní player bridge a vrací stejné normalizované události;
- desktop umí zobrazit MPV video uvnitř MIO okna nebo jasně prokáže, že externí player je zatím jediná stabilní možnost;
- track selection, titulky, seek, fullscreen a error reporting fungují;
- testovací streamy jsou legálně použitelné a obsahují známé kodeky;
- jsou změřeny start playback, rebuffering a CPU/GPU na reálných zařízeních.

