
## Cíl
Zlepšit mobilní rozložení (`/m`) tak, aby bylo skutečně optimalizované pro telefony – nejen zúžená desktop verze. Aktuální mobilní UI funguje, ale má drobné neduhy: malé klikací plochy, nečitelné texty, dialogy přes celou výšku, formuláře s desktopovými inputy.

## Co je potřeba zlepšit

### 1. Hlavička a navigace
- Větší výška headeru (56 → 64 px), bezpečné okraje pro notch (`env(safe-area-inset-top)`).
- Bottom nav s vyšší klikací plochou (min. 48 px), safe-area pro spodní lištu (iPhone home indicator).
- Aktivní stav s jemným pozadím, ne jen barvou ikony.

### 2. FAB (plovoucí tlačítko)
- Posunout výš nad bottom nav, respektovat safe-area-inset-bottom.
- Zvětšit na 56 px (Material guideline) a přidat výraznější stín.

### 3. Dialogy → Drawery (bottom sheet)
- `NewReservationDialog`, `QuickTripDialog`, `QuickIncidentDialog` aktuálně používají `Dialog` – na mobilu vypadá jako desktopové okno.
- Přepnout na **Drawer** (vaul, už máme `src/components/ui/drawer.tsx`) – vysouvá se zespodu, přirozené pro mobil, swipe-to-close.

### 4. Formulářové prvky
- Inputy výška 44 px (iOS doporučení) místo 40.
- `font-size: 16px` na inputech (zabrání auto-zoomu v Safari při focusu).
- Date/time pickery: použít nativní `<input type="date">` / `type="time"` na mobilu místo custom – uživatel dostane systémový picker.
- Selecty: větší ikona šipky, větší padding položek.

### 5. Karty a typografie
- Větší mezery mezi kartami (gap-4), větší klikací plochy.
- Nadpisy mírně větší (text-xl → text-2xl pro hlavní), popisky čitelnější (text-sm minimum).
- Všechny tlačítka „Zrušit / Schválit / Odeslat" plně přes šířku obrazovky (`w-full h-12`).

### 6. Stránky `/m`
- **DriverHome**: dvě statistické karty zvětšit, přidat sekci „Nadcházející rezervace" (3 nejbližší) jako quick preview.
- **MyVehicle**: kompaktní karta vozidla s velkým tlačítkem „Zápis km" / „Hlásit škodu".
- **MyReservations**: každá rezervace jako velká karta s jasnou hierarchií (vozidlo, datum, status badge), akční tlačítka přes celou šířku.

### 7. Globální mobilní vylepšení
- Přidat do `index.html` meta `viewport-fit=cover` (kvůli safe-area).
- V `index.css` definovat utility třídy pro safe-area paddingy.
- Zakázat tap highlight (`-webkit-tap-highlight-color: transparent`).
- Plynulé scrollování (`-webkit-overflow-scrolling: touch`).

## Soubory ke změně
- `index.html` – viewport meta
- `src/index.css` – safe-area utility, tap highlight
- `src/components/MobileLayout.tsx` – hlavička, bottom nav, FAB se safe-area
- `src/components/mobile/NewReservationDialog.tsx` – Dialog → Drawer, nativní date/time inputy
- `src/components/mobile/QuickTripDialog.tsx` – Dialog → Drawer
- `src/components/mobile/QuickIncidentDialog.tsx` – Dialog → Drawer
- `src/pages/mobile/DriverHome.tsx` – větší karty, sekce nadcházejících rezervací
- `src/pages/mobile/MyVehicle.tsx` – mobilní karta vozidla
- `src/pages/mobile/MyReservations.tsx` – velké karty, full-width akce

## Co se NEmění
- Logika (queries, validace kolizí, auth, role-based routing).
- Desktop rozhraní (`AppLayout` a stránky mimo `/m`).
- Datový model.

## Jak to otestovat
Po nasazení otevřít sdílený náhled na telefonu (Share → Share preview) a projít: vytvořit rezervaci přes nový bottom-sheet, zápis jízdy, hlášení škody. Ověřit, že nic nezakrývá home indicator a že se Safari nezoomuje při focusu inputu.
