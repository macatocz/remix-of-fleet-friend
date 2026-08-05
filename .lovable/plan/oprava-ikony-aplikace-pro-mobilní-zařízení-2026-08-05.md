# Oprava ikony aplikace pro mobilní zařízení

## Problém
Aktuální PWA ikona zobrazuje auto jako velmi malý symbol uprostřed velkého tmavého kruhu. Na mobilní ploše nebo v seznamu aplikací je proto auto špatně viditelné a na některých zařízeních téměř nezřetelné.

## Cíl
Vytvořit novou sadu ikon aplikace, kde bude auto graficky výraznější a lépe vyplní dostupný prostor ikony, aby bylo na mobilní ploše dobře čitelné.

## Kroky implementace

1. **Návrh nové ikony**
   - Zvětšit auto tak, aby zabíralo výrazně větší část plochy ikony (cca 60–70 % šířky/výšky místo současného malého středového symbolu).
   - Ponechat brandové barvy červená (#C82127) a tmavě šedá/tmavé pozadí.
   - Zachovat dostatečný bezpečný okraj pro adaptivní ikony (Android adaptive mask) a Apple zaoblené rohy.

2. **Generování assetů**
   - Vytvořit zdrojový obrazek pro ikony (alespoň 1024×1024 px).
   - Vygenerovat z něj potřebné velikosti:
     - `icon-192.png` (192×192) – PWA ikona
     - `icon-512.png` (512×512) – PWA ikona
     - `apple-touch-icon.png` (180×180) – iOS ikona na plochu
     - `favicon.png` (64×64) – favicon
   - Uložit zdroj jako `public/app-icon-source.png` (nebo obdobné) pro budoucí úpravy.

3. **Aktualizace manifestu a HTML**
   - Ponechat `public/manifest.webmanifest` beze změn, pokud cesty ikon zůstanou stejné.
   - Ponechat odkazy v `index.html` beze změn, pokud cesty zůstanou stejné.
   - Případně doplnit `purpose` ikon pro lepší kompatibilitu (např. `any maskable`).

4. **Kontrola**
   - Ověřit rozměry a vzhled nových ikon v náhledu.
   - Zkusit zobrazit aplikaci v mobilním viewportu a zkontrolovat, že ikona na ploše/iOS bude výraznější.

## Očekávaný výsledek
Aplikace bude mít novou, dobře viditelnou ikonu auta v předepsaných brandových barvách. Auto bude zabírat větší část ikony a bude čitelné na mobilní ploše i jako favicon.

## Soubory k úpravě
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png`
- `public/favicon.png`
- `public/app-icon-source.png` (zdrojová verze)
- `public/manifest.webmanifest` (pouze pokud bude nutné změnit metadata)
- `index.html` (pouze pokud bude nutné změnit odkazy)
