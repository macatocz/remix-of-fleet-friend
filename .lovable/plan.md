# Ukazatel úplnosti údajů v aplikaci

Cíl: místo Excelu ukázat přímo v aplikaci, co u auta, tankovací karty a řidiče chybí, s proklikem k doplnění. Kontroluje stejná pole jako kompletní Excel přehled.

## Co přibude
1. **Karta vozidla** – v hlavičce odznak „Úplnost 78 %“ (zelená nad 90 %, oranžová 60–90 %, červená pod 60 %). Po kliknutí panel „Co chybí“: seznam chybějících údajů rozdělený na Důležité / Ostatní, u každého tlačítko, které otevře příslušnou záložku nebo úpravu (např. Leasing, Tankovací karty, Pojištění).
2. **Seznam vozidel** – nový sloupec „Úplnost“ (procento s barevným proužkem) a filtr „Jen neúplné“. Řazení podle úplnosti.
3. **Tankovací karty** – u karty bez čísla nebo platnosti červený štítek „Chybí číslo / platnost“ (na detailu vozu i v přehledu karet).
4. **Řidiči** – na stránce Řidiči sloupec „Chybí“ (telefon, e‑mail, oddělení, účet) a filtr „Neúplní“.

Nesmyslná pole se nepočítají: leasing u aut ve vlastnictví firmy, dálniční známka a pneu u motorky.

## Ověření
Porovnám počty v aplikaci s Excel přehledem (246 údajů) a projdu kartu BMW, seznam vozidel a řidiče na obrazovce.

## Technické detaily
- Nový sdílený modul `src/lib/completeness.ts`: definice polí (klíč, popisek, priorita, podmínka platnosti, cílová záložka) a funkce `vehicleCompleteness(vehicle, related)`, `fuelCardMissing(card)`, `driverMissing(driver)`.
- Související data (pojištění, STK, dálniční známky, odečty tachometru, karty) se načtou souhrnně jedním dotazem na seznamu vozidel.
- Úpravy: `VehicleDetail.tsx` (odznak + panel), `Vehicles.tsx` (sloupec + filtr), `VehicleFuelCards.tsx`, `FuelCards.tsx`, `Drivers.tsx`.
- Bez změn databáze; barvy z existujících tokenů.
