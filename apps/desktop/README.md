# MIO Desktop · Tauri

Experimentální desktopový shell pro Windows a Linux. Sdílí React/Vite webové UI.

## Stav

Toto je zatím shell PoC. Není připojen MPV/libmpv a video se stále vykresluje webovým HTML5 přehrávačem. Výběr finálního desktopového player hostu zůstává otevřený do provedení MPV inline-rendering testu.

## Požadavky

- Node.js 26.13.1 LTS a npm 11+
- Rust stable 1.90+
- Windows: Microsoft C++ Build Tools a WebView2 Runtime
- Linux: WebKitGTK 4.1 vývojové knihovny, GTK/appindicator a další systémové balíčky dle distribuce

Oficiální prerequisites: https://tauri.app/start/prerequisites/

## Spuštění z kořene repozitáře

```bash
npm ci
npm run desktop:dev
```

Produkční build:

```bash
npm run desktop:build
```

Tauri konfigurace je v `src-tauri/tauri.conf.json`. Linux a Windows používají systémové WebView runtime, proto je nutné testovat oba samostatně.
