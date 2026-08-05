# PWA: Instalovatelná mobilní aplikace (manifest-only)

Cíl: Umožnit uživatelům přidat CMFleet na plochu telefonu jako samostatnou aplikaci, bez nutnosti App Store / Google Play. Implementujeme jen home-screen podporu, nikoliv offline service worker (ten je potřeba až při explicitním požadavku na offline režim).

## Co se změní

### 1. Web App Manifest
- Vytvořit `public/manifest.webmanifest`.
- Obsah: `name` CMFleet, `short_name` CMFleet, `start_url` "/", `display` "standalone", `background_color` bílá, `theme_color` červená z aktuální identity (#C82127 / HSL 357 72% 46%).
- Ikony: 192x192 a 512x512 ve formátu PNG. Vygenerujeme jednoduchou červeno-šedou ikonu vozu, aby nebyla generická.

### 2. Head tagy v index.html
- Přidat `<link rel="manifest" href="/manifest.webmanifest" />`.
- Aktualizovat `<meta name="theme-color" content="#C82127" />`.
- Přidat `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`.
- Přidat `<meta name="apple-mobile-web-app-title" content="CMFleet" />`.
- Ponechat stávající `apple-mobile-web-app-capable` a upravit `apple-mobile-web-app-status-bar-style` na vhodnou hodnotu pro světlý/dark režim.

### 3. Stávající push service worker
- `public/sw.js` zůstane nedotčený, protože obsluhuje push notifikace, nikoliv app-shell cache. To je v souladu s PWA skill pro manifest-only přístup.

### 4. Ověření
- Spustit build a zkontrolovat, že manifest a ikony se správně servírují.
- V Chrome DevTools → Application → Manifest ověřit, že aplikace je instalovatelná.

## Technické poznámky
- Neinstalujeme `vite-plugin-pwa`, Workbox ani žádný app-shell service worker.
- Nepřidáváme offline podporu, protože uživatel požádal pouze o variantu 1 (instalovatelnou webovou aplikaci).
- Po publikování uživatelé na mobilu uvidí v prohlížeči nabídku „Přidat na plochu“ (Android) nebo „Sdílet → Přidat na plochu“ (iOS).
