# Ikona koše u záznamů tankování

## Co přibude
- Ikona koše u každého záznamu tankování na dvou místech:
  - Report → Přehled tankování (poslední sloupec tabulky, vedle „Účtenka")
  - Detail vozidla → Tankovací karty → seznam tankování
- Po kliknutí se objeví potvrzení „Smazat záznam tankování?" s datem, místem a částkou.
- Po potvrzení se smaže záznam i fotka účtenky (soubor i položka ve složce „Účtenky – tankování").
- Koš uvidí admin a dispečer; řidič jen u svého záznamu ze dneška (stejně jako pravidla v databázi).
- Po smazání se seznam a souhrny (litry, cena, počet) hned přepočítají.

## Technické detaily
- Nový sdílený helper `deleteFuelRecord(record, docPath?)` v `src/lib/fuel/deleteFuelRecord.ts`: smaže `fuel_records` řádek, pak `vehicle_documents` řádek a soubor ve storage `vehicle-documents` (chyba úklidu souboru jen zalogovat).
- `FuelReport.tsx` a `VehicleFuelRecords.tsx`: tlačítko `Trash2` (ghost, destruktivní barva) + `AlertDialog`; po úspěchu odebrat řádek ze stavu a toast.
- Viditelnost přes `useAuth()` role (admin/dispečer) nebo vlastní záznam s dnešním `created_at`.
