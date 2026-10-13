# Spolehlivé focení účtenky přímo v aplikaci

## Proč to nefunguje
Tlačítko „Vyfotit“ teď otevírá samostatnou aplikaci Fotoaparát v telefonu. Telefon mezitím aplikaci Vozový park na pozadí uspí nebo ukončí. Po potvrzení fotky se aplikace načte znovu a fotka se do formuláře nedostane. Vyplněné údaje se sice obnoví, ale fotka chybí. Galerie funguje, protože je lehčí a telefon aplikaci neukončí.

## Řešení
- **Vyfotit** otevře fotoaparát **přímo uvnitř aplikace** na celou obrazovku. Uvidíte živý obraz ze zadní kamery a velké tlačítko spouště, pak „Použít“ nebo „Znovu“. Aplikace se tak vůbec neopouští a fotka se nemůže ztratit.
- Fotka se hned zmenší a zobrazí jako náhled ve formuláři.
- Pořízenou fotku zároveň uložíme do telefonu (dočasná paměť prohlížeče). Když se aplikace přesto obnoví, formulář se otevře i s fotkou. Fotka se smaže po uložení nebo po stisknutí „Zrušit“.
- Když telefon přístup ke kameře nepovolí, aplikace zobrazí hlášku a automaticky použije původní systémový fotoaparát nebo galerii.
- **Z galerie** zůstane beze změny.
- Stejně opravíme i focení u hlášení škody.

## Technické detaily
- Nová komponenta `src/components/camera/InAppCamera.tsx`: celoobrazovkový `Dialog`, `getUserMedia({ video: { facingMode: "environment" } })`, snímek do canvas → JPEG File → `compressImage`. Při zavření se stream zastaví. Při chybě nebo chybějícím `mediaDevices` se použije záložní `<input capture>`.
- `FuelReceiptDialog.tsx` a `QuickIncidentDialog.tsx`: tlačítko „Vyfotit“ otevře InAppCamera místo štítku napojeného na input.
- Fotky konceptu tankování se uloží do IndexedDB (`fuel-draft-photos`) a při otevření se obnoví. Ve funkci `reset()` se smažou.
