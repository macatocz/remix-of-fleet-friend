# Návod: jak si aplikaci nainstalovat do mobilu

Přidám do aplikace veřejnou stránku s návodem, jak si Vozový park přidat na plochu telefonu (iPhone i Android), plus odkazy, aby ji uživatelé našli.

## Co vznikne

**Stránka „Instalace do mobilu" (`/instalace`)**
- Krátký úvod: co instalace přinese (ikona na ploše, spuštění na celou obrazovku, rychlejší přístup, přihlášení zůstane).
- Automatická detekce zařízení — nahoře se rovnou zobrazí správný postup podle toho, z čeho uživatel stránku otevře (iPhone / Android / počítač), druhý postup je pod ním rozbalený jako alternativa.
- **iPhone / iPad (Safari):** otevřít odkaz v Safari → tlačítko Sdílet → „Přidat na plochu" → Přidat. Upozornění, že v Chromu na iPhonu to nejde.
- **Android (Chrome):** menu se třemi tečkami → „Instalovat aplikaci" / „Přidat na plochu" → potvrdit. Případně automatická nabídka instalace prohlížečem.
- **Počítač (Chrome/Edge):** ikona instalace v adresním řádku.
- Tlačítko „Nainstalovat" — pokud prohlížeč podporuje nativní výzvu (Android/desktop), zobrazí se a instalaci spustí jedním klepnutím; jinak zůstane skrytý.
- Blok „Adresa aplikace" s odkazem na publikovanou verzi a tlačítkem „Zkopírovat odkaz" (aby si ho člověk mohl poslat do telefonu).
- Krátké FAQ: přihlašuji se znovu? / co když nevidím „Přidat na plochu"? / jak aplikaci aktualizovat? / jak ji odinstalovat?
- Stav „Aplikace už je nainstalovaná" — když je stránka otevřená v režimu standalone, návod se skryje a zobrazí se potvrzení.

## Kudy se tam uživatel dostane

- Mobilní menu **Více** → nová položka „Instalace do mobilu".
- **Nastavení → Obecné** → odkaz na návod (desktop i mobil).
- **Přihlašovací stránka** → drobný odkaz „Jak si appku dát do mobilu" (aby ho viděl i nepřihlášený uživatel).

Stránka bude přístupná i bez přihlášení, aby šla poslat komukoli.

## Technické detaily

- Nový soubor `src/pages/InstallGuide.tsx` (responzivní, karty, `max-w-full overflow-x-hidden`, čeština, stávající barevné tokeny).
- `src/App.tsx`: veřejná routa `/instalace` (mimo `ProtectedRoute`) a mobilní routa `/m/instalace` na stejnou komponentu.
- Detekce: `navigator.userAgent` pro iOS/Android, `window.matchMedia('(display-mode: standalone)')` a `navigator.standalone` pro už nainstalovaný stav.
- Instalační tlačítko přes odchycenou událost `beforeinstallprompt` (uloženou v `useState`), volání `prompt()`; na iOS se nezobrazuje.
- Odkazy v `src/components/MobileLayout.tsx` (moreItems), `src/components/settings/GeneralSettings.tsx` a `src/pages/Login.tsx`.
- Žádné změny v databázi, žádný service worker — manifest už v projektu je.
