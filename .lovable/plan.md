# Oprava kalendáře vytížení a rezervací v mobilu

## 1. Posun data o jeden den (chyba)

Na domovské obrazovce v pruhu „Vytížení vozu" ukazuje detail pod pruhem o den dřívější datum (klik na 14.9. → 13.9.). Příčina: dny se převádějí na text přes UTC, takže v českém čase (UTC+2) vzniká posun o jeden den zpět.

Oprava: v komponentě pruhu použít místní datum (rok-měsíc-den bez převodu na UTC) a vybraný den zobrazovat přímo z tohoto data, ne přes nové parsování textu. Tím se srovná i barevné označení volno/částečně/obsazeno, které je dnes posunuté stejně.

Stejný posun opravím i tam, kde se ze stejného důvodu počítá „dnešek" na mobilních obrazovkách (domů, moje rezervace, moje vozidlo, hledání volného vozu, rychlé zápisy) — v ranních hodinách letního času by jinak mohly ukazovat včerejšek.

## 2. Odkazy „Vše" vedou na stejné místo

Dnes obě tlačítka („Nadcházející rezervace mého vozu" i „Mé vlastní rezervace") vedou na stejnou stránku Rezervace, kde se ale zobrazují **jen moje vlastní** rezervace (jakéhokoliv vozu) a vedle nich záložka žádostí ke schválení. Rezervace, které na mém voze udělal někdo jiný, tam vidět nejsou — proto to působí duplicitně a zároveň chybně.

Navrhuji na stránce Rezervace tři záložky:

- **Moje** – rezervace, kde jsem řidič (aktivní + ukončené), jako dnes.
- **Můj vůz** – všechny rezervace vozidel, která spravuji (i od jiných řidičů). Zobrazí se jen správci.
- **Ke schválení** – čekající žádosti, jako dnes.

Odkaz „Vše" u bloku *Nadcházející rezervace mého vozu* otevře záložku **Můj vůz**, odkaz u *Mé vlastní rezervace* záložku **Moje**. Tím přestanou být odkazy duplicitní a každý ukáže to, co slibuje.

## Technické detaily

- `src/components/mobile/SpravceCalendarStrip.tsx`: nahradit `toISOString()` lokálním formátováním, `selected` držet jako `Date` nebo formátovat nadpis z odpovídajícího `Date` z `range`.
- Zavést sdílenou pomocnou funkci `localDateStr(d: Date)` v `src/lib/utils.ts` a použít ji místo `new Date().toISOString().split("T")[0]` v mobilních souborech (`DriverHome`, `MyReservations`, `MyVehicle`, `FindVehicleSheet`, `NewReservationDialog`, `QuickTripDialog`, `QuickIncidentDialog`, `QuickNowReservation`, `MobileService`, `MobileIncidents`).
- `src/pages/mobile/MyReservations.tsx`: přidat záložku „Můj vůz" (dotaz na `reservations` filtrovaný `vehicle_id in myVehicles`), podporovat výchozí záložku přes query parametr `?tab=`.
- `src/pages/mobile/DriverHome.tsx`: navigovat na `/m/rezervace?tab=vozidlo` resp. `?tab=moje`.
