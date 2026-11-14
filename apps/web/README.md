# MIO Web

První webový základ MIO: React + TypeScript + Vite.

## Požadavky

- Node.js 26.13.1 LTS (viz kořenový .nvmrc)
- npm 11+

## Spuštění

Z kořene repozitáře spusť:

- npm install
- npm run dev
- npm run typecheck
- npm test
- npm run build
- npm run preview

## Player Lab

- Přímá HTTP(S) mediální URL se předá HTML5 video elementu.
- HLS M3U8 používá nativní podporu prohlížeče nebo HLS.js nad MSE.
- MPEG-DASH je zatím rozpoznán, ale přehrávání ještě není implementované.
- Webové zdroje musí správně povolovat CORS.
- Přihlašovací údaje vložené do URL jsou odmítnuty.
- DRM, vlastní request headers, externí titulky a nativní bridge nejsou součástí tohoto prvního PoC.

Tato aplikace je základ pro testování rozhraní. Nejde o finální přehrávač ani o katalog s reálnými zdroji.


## GitHub Pages demo

Nasazená ukázka: https://akcizur.github.io/stremio-mio/

Publikační workflow sestaví Vite s podadresářovou základní cestou `/stremio-mio/`, vytvoří Pages artifact a nasadí jej při pushi do `main`. Stejný projekt přitom v lokálním vývoji používá kořenovou cestu `/`.

Při prvním otevření IPTV sekce se v prázdném lokálním úložišti vytvoří vzorový M3U playlist a průběžně generované EPG. Stream je veřejný testovací HLS klip, ne skutečný televizní kanál.
