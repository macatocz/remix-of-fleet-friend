# Oprava: mobilní cestovní příkazy vracejí na Domů

## Problém
Na mobilu seznam cestovních příkazů odkazuje na desktopové adresy (`/cestovni-prikazy/...`). Ochrana routování mobilního uživatele z desktopové adresy hned přesměruje zpět na `/m` — proto to "skočí na Domů".

## Řešení
- V mobilním seznamu příkazů odkazovat na mobilní adresy: detail `/m/cestovni-prikazy/<id>` a nový příkaz `/m/cestovni-prikazy/novy`.
- V detailu cestovního příkazu tlačítko Zpět nasměrovat podle toho, zda jsme v mobilní části (`/m/...`) nebo na desktopu.

## Technické detaily
- `src/pages/mobile/MobileTravelOrders.tsx`: prefix `/m` u obou `navigate()` volání.
- `src/pages/TravelOrderDetail.tsx`: zpětná navigace odvozená z `location.pathname.startsWith("/m")`.
