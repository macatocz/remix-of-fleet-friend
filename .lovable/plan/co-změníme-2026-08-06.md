Upravit návod na instalaci (`src/pages/InstallGuide.tsx`) tak, aby Android/Chrome byl hlavní a nejpřístupnější cesta.

## Co změníme

- Při automatickém rozpoznání platformy bude `desktop` brán jako „pravděpodobně Android/Chrome“ pouze v případě, že UA není iOS. Pro ostatní desktopové prohlížeče bude výchozí karta nastavena na Android, protože většina uživatelů používá Chrome/Android.
- Na desktopu zobrazíme Android postup jako první rozšířený v akordeonu „Ostatní zařízení“ a přidáme krátkou poznámku, že na telefonu s Chrome postup vypadá stejně.
- Výrazněji zvýrazníme tlačítko „Nainstalovat aplikaci“ pro Android (pokud je `beforeinstallprompt` dostupné) – větší, plné šířky, s vysvětlením, že jde o nejrychlejší cestu.
- Přidáme stručný „Proč Android/Chrome?“ box: Chrome na Androidu podporuje nativní instalaci jedním klepnutím, zatímco na iOS je nutné Safari + Sdílet.
- Upravíme pořadí karet v akordeonu: Android nahoře, iOS pod ním, desktop poslední.
- iOS návod zůstane zachován, ale bude označen jako „Pokud máte iPhone“.

## Technické detaily
- `detectPlatform()` zachová stávající logiku, pouze se změní výchozí stav komponenty, pokud platforma = desktop.
- Pořadí `GUIDES` objektu upravit na `android`, `ios`, `desktop`.
- Přidat `Chrome` ikonu vedle `Smartphone` pro Android sekci.
- Zachovat responzivitu a zabránit horizontálnímu posouvání na mobilu.
