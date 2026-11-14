# ADR 0001 · Web-first multiplatformní architektura

- **Stav:** navrženo, čeká na ověření PoC
- **Datum:** 14. listopadu 2026
- **Rozhodnutí:** React + TypeScript + Vite jako sdílená webová aplikace; Capacitor pro mobilní obal; Tauri 2 jako desktop kandidát.

## Kontext

MIO cílí na web, iOS, Android, Windows a Linux. Potřebujeme rychle vyvíjet vlastní UI, současně ale zachovat přístup k nativním playerům a systémovým funkcím. Jeden jediný multiplatformní framework by sice omezil počet projektů, ale neřeší automaticky rozdíly video DRM, kodeků a nativních player API.

## Rozhodnutí

Sdílet web UI a doménovou logiku, ale vytvořit platform adapters pro storage, player a systémové funkce. Mobilní MVP použije Capacitor a vlastní native plugins. Desktop začne s Tauri 2, pokud player PoC neukáže zásadní překážku.

## Zvažované alternativy

- **React Native + Expo pro všechno:** lepší nativní mobilní UI, ale web UI by stále vyžadovalo samostatnou implementaci nebo adaptaci komponent.
- **Flutter pro všechny platformy:** dobrá konzistence renderování, ale vyžaduje Dart a významně zvyšuje cenu sdílení webových prvků.
- **Tauri pro všechny platformy:** technicky pokrývá mobile i desktop, ale pro video a plugin maturity musíme nejprve ověřit konkrétní integraci.
- **Electron pro desktop:** stejné Chromium na desktopu a bohatý Node ekosystém, ale větší runtime a oddělený mobilní framework.

## Důsledky

Pozitivní:
- jedna hlavní React UI codebase pro web a mobilní shell;
- doménové balíčky zůstávají sdílené i při budoucím přechodu na React Native;
- native player zůstává nezávislý na UI frameworku.

Negativní:
- mobilní aplikace potřebuje vlastní Swift/Kotlin pluginy;
- některé React komponenty nebudou znovupoužitelné v případné React Native UI;
- více shellů znamená platformní CI a reálná zařízení.

## Podmínka potvrzení

ADR bude potvrzen až po player PoC a testech na iOS, Android, Windows a Linux.
