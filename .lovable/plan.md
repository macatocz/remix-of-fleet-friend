

# Zrušení záložky Nájezdy – tachometr z knihy jízd

## Co se změní

Záložka **Nájezdy** na kartě vozidla se odstraní. Stav tachometru se bude počítat výhradně z posledního záznamu v `trip_logs.km_end`. Tabulka `vehicle_mileage` zůstane v DB (pro historická data), ale nebude se do ní zapisovat ani z ní číst.

## Dopad na komponenty

| Soubor | Změna |
|--------|-------|
| **VehicleDetail.tsx** | Odstranit tab „Nájezdy", import `VehicleMileage`, `Gauge`. Změnit fetch `vehicle_mileage` → fetch `trip_logs` (`km_end`, `date`) pro daný `vehicle_id`, seřazené sestupně. Předat do `VehicleAlerts`. |
| **VehicleAlerts.tsx** | Beze změny rozhraní — stále přijímá `mileageRecords` (pole `{km, recorded_at}`), jen data přijdou z `trip_logs` místo `vehicle_mileage`. |
| **VehicleNotifications.tsx** | Změnit fetch z `vehicle_mileage` na `trip_logs` — select `vehicle_id, km_end, date`, přemapovat na stejný formát `{vehicle_id, km, recorded_at}`. |
| **VehicleMileage.tsx** | Smazat soubor (již se nepoužívá). |

## Technické kroky

1. **VehicleDetail.tsx**: Odstranit tab „Nájezdy" a `TabsContent value="mileage"`. Změnit useEffect fetch na `trip_logs` (sloupce `km_end`, `date`), filtrovat záznamy kde `km_end` není null.
2. **VehicleNotifications.tsx**: Změnit fetch z `vehicle_mileage` na `trip_logs`, přemapovat pole.
3. **Smazat** `src/components/VehicleMileage.tsx`.

Žádné DB migrace nejsou potřeba.

