# MIO Mobile · Capacitor

Experimentální nativní obal webového MIO pro iOS a Android.

## Stav

Tato složka obsahuje pouze Capacitor konfiguraci a závislosti. Platformní projekty je nutné vygenerovat pomocí CLI. Nativní AVPlayer a Media3 plugin zatím nejsou implementované; tento scaffold zatím zobrazuje webovou vrstvu.

## Požadavky

- Node.js 26.13.1 LTS a npm 11+
- iOS: macOS, Xcode a odpovídající Apple signing setup
- Android: Android Studio, Android SDK a JDK kompatibilní s vygenerovanou Gradle šablonou

## První příprava z kořene repozitáře

```bash
npm install
npm run build --workspace=@mio/web
npm run add:android --workspace=@mio/mobile
npm run add:ios --workspace=@mio/mobile
npm run sync --workspace=@mio/mobile
```

Otevření nativních projektů:

```bash
npm run open:android --workspace=@mio/mobile
npm run open:ios --workspace=@mio/mobile
```

iOS projekt lze sestavit pouze na macOS s Xcode. Capacitor obaluje webové UI, ale přehrávání videa má být následně předáno nativnímu AVPlayeru na iOS a Media3 na Androidu.
