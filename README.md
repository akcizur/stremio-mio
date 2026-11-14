# MIO · Media Interface Options

MIO je návrh vlastní multiplatformní mediální aplikace pro **web, iOS, Android, Windows a Linux**.

Cíl: jednotný katalog filmů a seriálů, osobní knihovna, vyhledávání, historie, přehrávač, IPTV/EPG, YouTube integrace, lokální média a rozšiřitelné konektory.

Projekt je ve fázi architektonického návrhu. Zatím zde není implementováno aplikační UI ani přehrávač.

## Architektura

Začínáme web-first přístupem: React + TypeScript + Vite. Mobilní aplikace jsou plánovány přes Capacitor s nativním AVPlayerem na iOS a Media3/ExoPlayerem na Androidu. Pro Windows a Linux je kandidátem Tauri 2 s MPV/libmpv, jehož finální výběr závisí na přehrávačovém PoC.

## Dokumentace

Podrobný výzkum, platformní strategie, technické porovnání, playback návrh, datová architektura, integrace, compliance a roadmapa:

➡️ [MIO Architecture Documentation](docs/architecture/README.md)

## Stav

- [x] Počáteční architektonický výzkum a dokumentace
- [ ] Player proof-of-concept na webu, iOS, Androidu, Windows a Linuxu
- [ ] Schválení finálního stacku na základě PoC
- [ ] Web MVP
- [ ] Mobilní a desktopové shell builds

Dokumentace odděluje ověřené vlastnosti platforem od návrhů, které je nutné potvrdit prototypem.
