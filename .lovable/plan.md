

# Zobrazení stavu tachometru na kartě vozidla

## Aktuální stav
Data z `trip_logs.km_end` se načítají, ale slouží pouze pro výpočet upozornění v `VehicleAlerts`. Samotný stav tachometru (poslední km) se nikde nezobrazuje.

## Návrh
Přidat **informační kartu** do horní části detailu vozidla (vedle RZ, značky, modelu) zobrazující:
- **Stav tachometru**: poslední hodnota `km_end` z knihy jízd (formát: `123 456 km`)
- **K datu**: datum posledního záznamu
- Pokud nejsou žádné záznamy v knize jízd → zobrazit „Žádný záznam"

## Technický rozsah
Jediný soubor: `src/pages/VehicleDetail.tsx`
- Z již načtených `mileageRecords` (seřazených sestupně) vzít první záznam = aktuální stav
- Zobrazit v hlavičce vozidla (oblast s RZ a základními info) jako malý badge nebo info řádek s ikonou `Gauge`

