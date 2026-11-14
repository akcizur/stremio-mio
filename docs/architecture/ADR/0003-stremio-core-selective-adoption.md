# ADR 0003 · Selektivní využití Stremio Core a addon protokolu

- **Stav:** navrženo, PoC nutný
- **Datum:** 14. listopadu 2026

## Kontext

Stremio nabízí Rust core s modely, addon transportem a WASM web bridge. MIO chce interoperabilitu se zdroji a addon protokolem, ale potřebuje vlastní UI, vlastní player orchestration a vlastní data model pro IPTV/EPG.

## Rozhodnutí

Nebereme stremio-web jako základ UI. Vyhodnotíme stremio-core a addon protocol odděleně:
- Core jako kandidát pro modely/runtime, pokud jeho rozhraní odpovídá MIO use-cases;
- addon protocol jako interoperabilní adapter;
- vlastní MIO provider contract zůstane hlavním interním rozhraním.

## Zvažované alternativy

- Kompletně fork stremio-web: odmítnuto jako výchozí varianta kvůli GPL-2.0 UI a produktové nezávislosti.
- Převzít pouze Stremio Addon SDK: možné pro konektory, ale SDK není povinné pro implementaci samotného HTTP protokolu.
- Vytvořit vlastní katalog engine bez core: legitimní fallback, pokud integrace Core přidá více složitosti než hodnoty.

## Rizika

WASM bridge je určen pro web worker. Kompatibilita s Capacitor/WKWebView, Android WebView, Tauri a nativními shelly musí být otestována. Stremio Kotlin bindings byly archivovány, takže je nelze považovat za aktivní dlouhodobý základ Androidu.

## Podmínky rozhodnutí

PoC ověří init core, addon fetch, persistent storage adapter, state updates, bundle size a licenční/transitive dependency report. Pokud se core ukáže jako příliš svázané s původním runtime, MIO použije jen kompatibilní addon protokol a vlastní doménovou logiku.
