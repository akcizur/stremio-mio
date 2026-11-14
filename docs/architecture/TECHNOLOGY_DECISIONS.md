# Srovnání technologií a doporučený stack

**Stav:** výchozí doporučení; rozhodnutí o player hostu čeká na PoC  
**Datum kontroly:** 14. listopadu 2026

## 1. Doporučený stack

| Vrstva | Doporučení | Proč |
|---|---|---|
| Web UI | React + TypeScript + Vite | Interaktivní SPA/PWA bez potřeby SSR v samotné aplikaci |
| Mobilní obal | Capacitor 8 | Opětovné použití webového UI, vlastní Swift/Kotlin pluginy |
| Mobilní playback | AVPlayer (iOS), Media3 (Android) | Přístup k platformnímu HLS/DRM/codec stacku |
| Desktop shell | Tauri 2, podmíněně | Lehký Rust host; přirozené rozšíření pro systémové funkce |
| Desktop playback | MPV/libmpv PoC | Široké formáty, titulky, audio tracky a HW backend; integrace není triviální |
| Doménová logika | TypeScript packages | Sdílení use-cases, normalizace dat, kontraktů a testů |
| Datové typy | Zod/JSON Schema nebo ekvivalent | Validace všech vstupů z konektorů |
| Web storage | IndexedDB | Asynchronní lokální úložiště v browseru |
| Native storage | SQLite | Transakční lokální knihovna pro nativní klienty |
| Backend (později) | Jeden modulární API server | Účty, sync, secrets, proxy a společná metadata cache |
| Testy | Vitest + Playwright + native platform tests | Jednotkové, integrační a skutečné playback testy |

Verze závislostí se mají připnout v lockfile až při založení aplikace a ověřit pomocí čistého install/build/test pipeline. Tato dokumentace záměrně nepředepisuje čísla verzí balíčků, která se mohou změnit.

## 2. Frontend: React + Vite vs Next.js

### React + Vite: doporučeno pro aplikaci

MIO je především klientská aplikace s dlouho běžícími obrazovkami, knihovnou, přehrávačem, vyhledáváním a lokálním stavem. Pro takový SPA/PWA profil je Vite jednodušší build/development základ. SSR není nutné pro primární aplikaci.

### Next.js: použít pouze pro samostatný veřejný web, pokud bude potřeba

Next.js dává smysl pro marketingové stránky, dokumentaci, veřejné SEO stránky nebo server-rendered produktové landing pages. Není důvod přidat složitější serverový framework do samotného lokálního mediálního klienta jen proto, že umí React.

Zdroje:
- [Vite documentation](https://vite.dev/guide/)
- [Next.js documentation](https://nextjs.org/docs)

## 3. Mobil: Capacitor vs React Native vs Flutter vs Kotlin Multiplatform

| Technologie | Silné stránky | Náklady/omezení pro MIO | Doporučení |
|---|---|---|---|
| Capacitor | Zachová webové UI; pluginy v Swift/Java; rychlá cesta do App Store a Google Play | WebView UI; vlastní player pluginy jsou nutné; iOS MSE omezení nevyřeší | **První volba pro MVP** |
| React Native + Expo | Nativní UI, JS/TS ekosystém, vlastní native modules a development builds | Samostatné komponenty a navigace proti webu; player pluginy a native buildy stále nutné | Záložní strategie, pokud web UI nestačí |
| Flutter | Jeden renderovací systém, dobré animace a konzistence na mobilech i desktopu | Dart; webová aplikace by se z velké části přepisovala; přenos stávajících React prvků minimální | Nedoporučeno pro aktuální web-first start |
| Kotlin Multiplatform | Sdílení doménové logiky mezi Kotlin/Android a Swift/iOS UI | iOS a Android UI se stále vyvíjejí samostatně; další jazyk a toolchain | Příliš nákladné v počáteční fázi |

Důležitá nuance: komponenty React pro web nelze automaticky sdílet jako React Native komponenty. Sdílet lze především TypeScriptové modely, API klienty, validátory, use-cases a design tokeny. Pokud MIO později přejde na React Native, znovu použije logiku, ne celé DOM UI.

React Native podporuje vývoj na macOS, Windows a Linux, ale cílové nativní OS jsou Android a iOS; build iOS vyžaduje Xcode na macOS. Expo podporuje custom native code v development builds, zatímco Expo Go má omezenou sadu nativních knihoven.

Zdroje:
- [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Expo custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo FAQ](https://docs.expo.dev/faq/)
- [Capacitor overview](https://capacitorjs.com/docs)

## 4. Desktop: Tauri vs Electron

| Kritérium | Tauri 2 | Electron |
|---|---|---|
| Runtime | Systémový WebView + Rust host | Vlastní Chromium + Node.js |
| Engine konzistence | Rozdíly Windows/WebView2, Linux/WebKitGTK, macOS/WKWebView | Stejný Chromium runtime na podporovaných desktop OS |
| Velikost/runtime | Obvykle menší balíček, protože nebalí vlastní Chromium | Větší balíček, přináší vlastní Chromium a Node.js |
| Nativní integrace | Rust commands a pluginy, permission/capability model | Velký Node ekosystém, main/renderer procesy |
| Media PoC | Nutné ověřit systémový WebView a native video surface | Snazší konzistentní HTML media runtime, MPV integrace stále vyžaduje práci |
| Bezpečnost | Explicitní permissions/capabilities; nesprávná konfigurace je stále riziko | Bezpečnost závisí na izolaci rendereru, sandboxu a vypnutém Node integration |
| Výsledek | **Výchozí kandidát** | Rezervní volba, pokud WebView rozdíly nebo ekosystém blokují produkt |

Rozhodnutí není pouze o velikosti instalátoru. Pro mediální aplikaci je důležitější, jak video surface koexistuje s React UI, jak se řeší HW decode a jak se balí MPV. Proto Tauri schválíme až po PoC. Pokud bude Tauri/WebKitGTK příčinou opakovaných problémů, Electron je legitimní pragmatická volba, nikoli selhání.

Zdroje:
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri capabilities](https://v2.tauri.app/security/capabilities/)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)

## 5. Stremio Core: využít selektivně

Stremio Core je Rust engine pro typy, modely, addon protokol a aplikační stav. Projekt dokumentuje rozhraní Env, které odděluje HTTP fetch, storage, task execution a čas od core logiky. Existuje WASM bridge publikovaný jako @stremio/stremio-core-web, který běží ve Web Workeru v prostředí stremio-web.

To je cenný základ k evaluaci, ale:
- neznamená to, že máme převzít stremio-web UI;
- WASM bridge je určen pro browser Worker a jeho spuštění v React Native/Capacitor/desktopu je nutné ověřit samostatně;
- Android Kotlin binding repository bylo archivováno v květnu 2026, proto ho nepovažujeme za dlouhodobý integrační základ;
- MIO musí mít vlastní abstrakci přehrávače, knihovny a provider konektorů, i kdyby některé modely používaly Core.

Zdroje:
- [Stremio Core](https://github.com/Stremio/stremio-core)
- [Stremio Core Web bridge](https://github.com/Stremio/stremio-core/tree/development/stremio-core-web)
- [Archived stremio-core-kotlin](https://github.com/Stremio/stremio-core-kotlin)

## 6. Doporučené uspořádání repozitáře

Monorepo je vhodné, protože aplikace má více shellů a sdílené balíčky. Nemusíme ale v první iteraci zakládat každou budoucí složku.

```text
stremio-mio/
├── apps/
│   ├── web/                 # React + Vite + PWA
│   ├── mobile/              # Capacitor; iOS + Android
│   └── desktop/             # Tauri 2 shell
├── packages/
│   ├── domain/              # modely, use-cases, normalizace
│   ├── contracts/           # API, source, player a plugin kontrakty
│   ├── providers/           # katalogové a stream source adaptéry
│   ├── stremio-compat/      # volitelná kompatibilita se Stremio
│   ├── player-contract/     # platform-neutral player API
│   └── ui/                  # sdílené web komponenty/design tokens
├── native/
│   ├── ios-player/          # Swift + AVPlayer bridge
│   ├── android-player/      # Kotlin + Media3 bridge
│   └── desktop-player/      # MPV/libmpv experiment
├── services/
│   └── api/                 # pozdější sync/API
├── docs/
│   └── architecture/
└── tests/
    ├── fixtures/
    └── compatibility/
```

Složky native a services lze zakládat až ve chvíli, kdy pro ně existuje běžící PoC. Nezakládejme prázdné balíčky pro budoucí nápady.

## 7. Rozhodnutí

- **Přijmout nyní:** React + TypeScript + Vite pro web.
- **Přijmout jako mobilní MVP cestu:** Capacitor; podmínkou je úspěšný nativní player bridge.
- **Podmíněně přijmout:** Tauri 2 pro desktop po MPV PoC.
- **Nepoužít jako výchozí UI základ:** Next.js, Flutter, KMP.
- **Nechat jako fallback:** React Native + Expo pro mobil; Electron pro desktop.
- **Vyhodnotit jako integrační komponentu:** Stremio Core a addon protokol.
