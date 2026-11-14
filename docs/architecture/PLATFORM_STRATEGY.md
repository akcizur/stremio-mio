# Platformní strategie

**Stav:** doporučení k ověření prototypy  
**Datum kontroly zdrojů:** 14. listopadu 2026

## 1. Základní princip

MIO bude mít jeden produktový a doménový model, ale nebude předstírat, že všechna zařízení mají stejný přehrávač nebo stejné možnosti. Sdílíme co nejvíce TypeScriptové doménové logiky, kontraktů, validace, katalogových adaptérů a testů. Vykreslování a přehrávání přizpůsobíme platformě.

Tím se vyhneme dvěma extrémům:
- pěti nezávislým aplikacím s pěti oddělenými datovými modely;
- jednomu univerzálnímu WebView řešení, které na iOS nebo desktopu narazí na limity přehrávání, knihoven či systému.

## 2. Doporučená platformní skladba

| Platforma | První implementace | Přístup k médiím | Poznámka |
|---|---|---|---|
| Web | React + TypeScript + Vite, PWA | HTML video; hls.js/dash.js tam, kde je podporováno | Hlavní referenční UI a nejrychlejší distribuční kanál |
| iOS | Capacitor + vlastní Swift plugin | AVPlayer / AVFoundation | WKWebView slouží pro UI, ne jako jediný video engine |
| Android | Capacitor + vlastní Kotlin plugin | AndroidX Media3 / ExoPlayer | Nativní playback a oprávnění souborového systému |
| Windows | Tauri 2 + React UI | PoC MPV/libmpv; dočasně HTML video | WebView2; samostatně otestovat GPU a video kompozici |
| Linux | Tauri 2 + React UI | PoC MPV/libmpv; dočasně HTML video | WebKitGTK a závislosti se liší dle distribuce |

**Proč tato skladba:** web-first vývoj udrží krátkou cestu od změny UI k nasazení. Capacitor je navržen pro zabalení webové aplikace a rozšíření přes Swift/Java pluginy. To dovolí ponechat stejnou navigaci, knihovnu a katalog, ale předat vlastní přehrávání nativnímu enginu. Tauri 2 je kandidát pro desktop díky Rust host vrstvě a možnosti řídit systémová oprávnění. Finální desktopové rozhodnutí ale musí potvrdit PoC přehrávače.

Zdroje:
- [Capacitor: oficiální dokumentace](https://capacitorjs.com/docs)
- [Capacitor iOS a WKWebView](https://capacitorjs.com/docs/ios)
- [Tauri 2: prerequisites a platformní závislosti](https://v2.tauri.app/start/prerequisites/)
- [Tauri: capabilities a oprávnění podle platformy](https://v2.tauri.app/security/capabilities/)

## 3. Web a PWA

Web je první cílová platforma, ne pouhá mezistanice k desktopu. Měl by nabídnout:
- katalogy, detail titulu, vyhledávání a filtrování;
- správu knihovny, historie a pokračování ve sledování;
- správu IPTV playlistů a EPG;
- správu konektorů a zdrojů;
- přehrávání kompatibilních webových streamů;
- offline dostupnost shellu aplikace a vybraných metadat.

PWA offline režim není totéž co offline video. Service Worker může cacheovat aplikační prostředky a zvolené datové odpovědi, ale dostupnost přehrávání médií, ukládání velkých segmentů, background tasků a chráněného obsahu závisí na prohlížeči a poskytovateli. V dokumentaci proto rozlišujeme **offline UI/data** od **offline media playback**.

Zdroj: [MDN: offline a background operation v PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).

## 4. iOS

Doporučený první krok je Capacitor v kombinaci s vlastním Swift pluginem pro AVPlayer. UI může být sdílené s webem, ale přehrávání by mělo být nativní:
- AVPlayer pro podporované místní a vzdálené soubory i HLS;
- AVFoundation pro načítání, přehrávání a případně řízené ukládání podporovaných HLS streamů;
- FairPlay pouze tehdy, pokud obsahový poskytovatel udělí potřebné oprávnění a zajistí licenční infrastrukturu;
- systémová integrace podle fáze produktu: AirPlay, PiP, audio session, background playback a externí displeje.

iOS build vyžaduje macOS a Xcode. Vývojářský počítač s Windows sám o sobě nestačí pro lokální podepsání a sestavení finální nativní iOS aplikace; bude potřeba Mac nebo macOS CI runner.

Pozor na WebView: nelze plánovat, že hls.js/MSE pokryje všechny iOS scénáře. HLS je na iOS nativní schopnost platformy a AVPlayer je spolehlivější hranice pro produktový playback.

Zdroje:
- [Apple: AVPlayer](https://developer.apple.com/documentation/avfoundation/avplayer)
- [Apple: HTTP Live Streaming](https://developer.apple.com/documentation/http-live-streaming)
- [Apple: FairPlay Streaming](https://developer.apple.com/streaming/fps/)
- [Capacitor: iOS](https://capacitorjs.com/docs/ios)

## 5. Android

Použijeme stejné webové UI přes Capacitor, ale přehrávání svěříme vlastnímu Kotlin pluginu s AndroidX Media3/ExoPlayer. Tím získáme nativní práci s HLS, vhodnými DASH profily, track selection, audio/subtitle tracky, DRM capability podle zařízení a systémové audio/video API.

Testovací matice musí zahrnout fyzická zařízení různých výrobců. Emulátor není dostatečnou náhradou za test skutečných kodeků, DRM a hardwarových dekodérů.

Android TV / Google TV není automaticky vyřešením telefonního UI. Pokud se stane cílem, je nutný samostatný režim pro dálkové ovládání, focus navigation, vzdálenost textu a 10-foot layout.

Zdroje:
- [Android Media3 ExoPlayer: podporovaná zařízení a formáty](https://developer.android.com/media/media3/exoplayer/supported-devices)
- [Android Media3: HLS](https://developer.android.com/media/media3/exoplayer/hls)
- [Android Media3: DRM](https://developer.android.com/media/media3/exoplayer/drm)

## 6. Windows

Tauri 2 je výchozí kandidát pro shell. Na Windows používá WebView2 a nativní host vrstvu v Rustu. Video PoC porovná:
1. HTML5 video v WebView2;
2. samostatný proces MPV ovládaný IPC;
3. integrované libmpv/render API nebo jiný nativní video surface.

Cílem je video vykreslit přímo do oblasti přehrávače, nepřijít o hardwarovou akceleraci a zachovat overlaye MIO, titulky, audio stopy, full-screen a resize. Pouhé otevření externího okna MPV není hotová integrace.

Zdroje:
- [Tauri: prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Stremio shell-ng: WebView2 + MPV architektura](https://github.com/Stremio/stremio-shell-ng)

## 7. Linux

Tauri je kandidát, ale WebKitGTK a systémové balíčky přinášejí distribuční rozdíly. Je nutné testovat alespoň aktuální Ubuntu LTS, jednu rolling distribuci a čistou instalaci bez vývojových knihoven.

MPV/libmpv nebo MPV proces se prověří odděleně od UI hostu. Balíčkování (AppImage, Flatpak, deb/rpm) se vybere až podle výsledků testu přehrávače, přístupu ke GPU, oprávnění k lokálním souborům a aktualizačního modelu.

Zdroje:
- [Tauri: Linux system dependencies](https://v2.tauri.app/start/prerequisites/)
- [mpv: oficiální projekt](https://mpv.io/)

## 8. Kdy změnit mobilní strategii

Capacitor není dogma. Po přehrávačovém PoC a ověření UX vyhodnotíme React Native + Expo, pokud:
- web UI v WKWebView / Android WebView nebude dostatečně plynulé;
- bude potřeba výrazně více nativní navigace, background práce nebo systémových UI prvků;
- bude cílem Android TV nebo další zařízení s odlišným ovládáním;
- náklady na vlastní nativní pluginy převýší cenu druhého UI.

Expo umí vlastní nativní kód přes development builds a config plugins; Expo Go je jen omezené prostředí a pro produkční aplikaci s vlastním player pluginem nestačí.

Zdroje:
- [React Native: environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Expo: custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo: FAQ a limity Expo Go](https://docs.expo.dev/faq/)

## 9. Co nebudeme dělat

- Nebudeme tvrdit, že jeden WebView engine zajistí stejný DRM, HLS, kodeky a HW decode na všech platformách.
- Nebudeme stavět přehrávač pouze na HTML video elementu.
- Nebudeme zakládat pět samostatných frontendů před tím, než se prokáže nutnost.
- Nebudeme přidávat Android TV, Apple TV nebo chytré televize do prvního MVP bez samostatného zadání.


## 10. Aktuální stav repozitáře

V repozitáři jsou nyní připravené:
- Capacitor 8.6.2 workspace, app ID a konfigurace cest pro iOS/Android;
- Tauri 2 desktop workspace, Rust entrypoint, capability a výchozí konfigurace pro Windows/Linux;
- root npm scripts pro generování/synchronizaci mobilních projektů a spuštění desktop shellu.

Jde o **konfigurační scaffold**, nikoli o hotové nativní aplikace. iOS/Android projekty je nutné vygenerovat pomocí Capacitor CLI na připraveném vývojovém stroji. Tauri je zatím bez MPV/libmpv a bez ověřeného instalátoru. CI v této fázi ověřuje webovou vrstvu; nativní build matrix bude samostatný krok.

Příkazy z kořene repozitáře:
- `npm run mobile:add:android`
- `npm run mobile:add:ios`
- `npm run mobile:prepare`
- `npm run desktop:dev`
- `npm run desktop:build`

iOS build vyžaduje macOS + Xcode. Windows a Linux je potřeba ověřit na odpovídajících host systémech.
