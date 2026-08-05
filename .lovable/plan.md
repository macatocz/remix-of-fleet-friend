# Oprava mobilního detailu škody

## Cíl
Po klepnutí na kartu škody zobrazit její skutečný detail v mobilním rozložení, nikoli přesměrovat uživatele na Domů.

## Změny
- Přidat mobilní trasu `/m/skody/:id` a samostatný detail škodní události.
- Na detailu načíst konkrétní škodu včetně vozidla a zobrazit datum, stav, místo, popis a odhadované náklady v kartovém rozložení bez horizontálního posouvání.
- Doplnit jasné tlačítko zpět do přehledu škod a odkaz na příslušné vozidlo, který zůstane uvnitř mobilních tras.
- Změnit kliknutí na kartu v přehledu škod tak, aby otevíralo `/m/skody/:id` místo desktopového detailu vozidla.
- Ošetřit načítání, nenalezený nebo nepřístupný záznam a chybu databáze bez pádu či přesměrování na Domů.

## Ověření
- Na mobilním viewportu otevřít přehled škod, klepnout na existující záznam a potvrdit správnou URL i zobrazená data.
- Ověřit návrat zpět, odkaz na vozidlo a absenci vodorovného posouvání.
- Ověřit přímé otevření URL detailu škody po obnovení stránky.

## Technické poznámky
Příčinou je současné volání `navigate('/vozidla/:vehicleId')` z mobilní karty. Pro netřidičskou roli je tato desktopová adresa na telefonu zachycena `ProtectedRoute` a převedena na `/m`, proto uživatel skončí na Domů.