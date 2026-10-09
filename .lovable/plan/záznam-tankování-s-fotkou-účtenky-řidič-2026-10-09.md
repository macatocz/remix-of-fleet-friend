# Záznam tankování s fotkou účtenky (řidič)

## Co řidič uvidí
- V mobilu na domovské stránce a na kartě „Moje vozidlo“ přibude velké tlačítko **„Tankování“**. Na desktopu bude stejná volba v řidičském panelu.
- Formulář na jeden zátah:
  - **Vozidlo**: předvybrané vlastní nebo dnes vypůjčené auto.
  - **Datum a čas**: předvyplní se aktuální čas, dá se upravit.
  - **Místo**: tlačítko „Použít moji polohu“ zjistí adresu přes GPS, případně se místo vepíše ručně (např. „Shell Brno, Vídeňská“).
  - **Fotka účtenky**: tlačítko otevře rovnou fotoaparát; jde přidat i více fotek.
  - Nepovinné údaje: litry, cena celkem, stav tachometru.
- Po uložení se objeví potvrzení „Tankování uloženo“.

## Kam se to uloží
- Fotka účtenky se automaticky uloží do dokumentů vozu, do složky **„Účtenky – tankování“**. Pokud složka neexistuje, aplikace ji vytvoří.
- Název souboru bude obsahovat datum, čas a místo, například `2026-10-09 15-30 Shell Brno.jpg`, aby šel snadno najít.
- Tankování se zároveň zapíše do přehledu tankování u vozu, s datem, časem, místem, litry, cenou a odkazem na fotku.
- Pokud se zadá stav tachometru, započítá se i do sledování nájezdu leasingu.

## Kdo to vidí
- Řidič zapisuje jen u vozu, ke kterému má přístup: svůj vůz nebo vůz z dnešní schválené rezervace.
- Admin a dispečer uvidí všechna tankování a účtenky.
- Řidič může smazat jen svůj záznam, a to jen ve stejný den.

## Mimo rozsah
- Bez připojení k síti nepůjde tankování s fotkou uložit; aplikace na to upozorní. Stejně se dnes chová hlášení škody.
- Automatické čtení údajů z účtenky (OCR) nebude součástí první verze. Lze doplnit později.

## Technické detaily
- Nová tabulka `fuel_records`: vehicle_id, driver_id, user_id, fueled_at (timestamptz), location, lat, lng, liters, total_price, km, document_id, note. Součástí bude GRANT pro authenticated a service_role a RLS. SELECT bude povolen přes `private.can_access_vehicle(vehicle_id)`. INSERT bude povolen, když user_id = auth.uid() a řidič má k vozu přístup. Admin a dispečer budou mít plný přístup.
- Řidič dnes nemůže nahrávat do úložiště dokumentů ani zapisovat do `vehicle_documents` a `document_folders`. Přidám úzké politiky:
  - INSERT do úložiště `vehicle-documents` jen pod cestou `{vehicle_id}/uctenky/...` a jen pro vůz, ke kterému má uživatel přístup.
  - INSERT do `vehicle_documents` jen s kategorií „Účtenky – tankování“.
  - Vytvoření složky jen s tímto názvem.
- Stav tachometru se zapíše do `vehicle_mileage`. Pokud tam řidič nemá právo zápisu, doplním k tomu odpovídající politiku.
- Polohu zjistí `navigator.geolocation`. Zpětné dohledání adresy proběhne přes OpenStreetMap Nominatim. Když se nepodaří, uloží se souřadnice.
- Nové komponenty `FuelReceiptDialog` (mobilní drawer a desktopový dialog) a výpis `VehicleFuelRecords` v detailu vozu.
