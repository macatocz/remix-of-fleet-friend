# Karta vozidla v mobilu: méně záložek, lepší zobrazení

Platí jen pro telefon. Na počítači zůstává vše beze změny.

## Záložky, které v mobilu zůstanou
1. **Údaje** – dlaždice pod sebou v jednom sloupci, řádky „popisek / hodnota“ zalomené, aby nic nepřetékalo do strany. Termíny (STK, zelená karta, pojištění, leasing) nahoře jako barevné štítky. Nájezd leasingu jako jeden kompaktní pruh.
2. **Kalendář** – jen přehled vytížení na 14–30 dní a seznam rezervací jako karty (místo velkého týdenního kalendáře).
3. **Dokumenty** – složky jako rozbalovací seznam, soubory jako řádky s ikonou a tlačítkem otevřít; nahrání fotky/souboru jedním tlačítkem.
4. **Tankovací karty** – každá karta jako lístek (poskytovatel, konec čísla, platnost); pod tím poslední tankování jako karty s účtenkou a košem.
5. **Škody** – karty se stavem, datem, kdo hlásil; tlačítko „Hlásit škodu“.
6. **Kniha jízd (zjednodušená)** – jen seznam posledních jízd jako karty (datum, odkud–kam, km, typ) a tlačítko „Zapsat jízdu“. Bez tabulkového editoru, generátoru a exportů.

## Skryté v mobilu
- Servis a servisní plán, Předání vozidla – zůstávají jen na počítači.

## Ovládání záložek
- Lišta záložek vodorovně posuvná s ikonou a krátkým názvem, obsah samotný se do strany neposouvá.

## Technické detaily
- V `VehicleDetail.tsx` přes `useIsMobile()` filtrovat `TabsTrigger`/`TabsContent`; pokud je aktivní skrytá záložka, přepnout na „info“.
- Mobilní varianty: nová komponenta `MobileTripList` (posledních ~20 z `trip_logs` + `QuickTripDialog`), kartové rozložení v `VehicleIncidents`, `VehicleFuelCards`, `VehicleDocuments`, kalendář přes `SpravceCalendarStrip` + seznam rezervací.
- `InfoCard` na mobilu `grid-cols-1`, `min-w-0`, `break-words`; kontejner `overflow-x-hidden`.
- Datová logika beze změny. Ověření Playwrightem na 394 px šířce.
