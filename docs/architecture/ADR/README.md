# Architektonická rozhodnutí (ADR)

ADR zaznamenávají důležitá rozhodnutí, jejich kontext, alternativy a dopady. Stav **navrženo** znamená, že rozhodnutí ještě není potvrzené implementačním PoC.

| ADR | Téma | Stav |
|---|---|---|
| [0001 · Web-first multiplatformní architektura](0001-web-first-cross-platform.md) | React/Vite, Capacitor, Tauri | Navrženo; čeká na PoC |
| [0002 · Nativní přehrávač podle platformy](0002-native-player-per-platform.md) | AVPlayer, Media3, MPV | Doporučeno; čeká na PoC |
| [0003 · Selektivní využití Stremio Core](0003-stremio-core-selective-adoption.md) | Core, WASM bridge, addon protokol | Navrženo; čeká na PoC |

Nové ADR pojmenovávat vzestupně jako 0004-short-topic.md. Existující ADR se zpětně nepřepisují při změně názoru; jejich stav se změní na superseded a vznikne nové ADR.
