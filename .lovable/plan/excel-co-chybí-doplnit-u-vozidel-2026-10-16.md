# Excel: co chybí doplnit u vozidel

Jednorázový soubor ke stažení (aplikace se nemění): `chybejici-udaje-flotila.xlsx`.

## Listy

1. **Souhrn** – počet aut, počet chybějících údajů celkem, podle kategorie a TOP auta s nejvíce mezerami (počty přes vzorce).
2. **Vozidla – přehled** – řádek = auto (RZ, název, značka, správce/POOL), sloupec = sledovaný údaj. Prázdné = červeně „CHYBÍ“, vyplněné = zeleně „OK“. Na konci počet chybějících a % úplnosti.
   Sledované údaje: VIN, název vozu, kategorie, lokalita, vlastník, typ vlastnictví, STK, zelená karta, dálniční známka, pojištění, výchozí tachometr, aktuální odečet tachometru, parkovací stání, uskladnění pneu, lékárnička, náhradní klíč, velký/malý TP; u leasingu navíc leasingová společnost, číslo smlouvy, začátek/konec, nájezd/rok, měsíční splátka.
3. **Úkoly k doplnění** – seznam po řádcích: RZ, auto, správce, co chybí, kategorie, priorita (Vysoká = termíny a leasing/tachometr, Střední = smlouvy, karty, Nízká = ostatní). Filtr a seřazení podle priority, správce může dostat svůj seznam.
4. **Tankovací karty** – auta bez karty a karty bez čísla nebo platnosti.

Údaje, které u daného auta nedávají smysl (např. leasingová pole u vlastních aut, pneu u motorky), se označí „N/A“ a nepočítají se.

## Technicky
Data z databáze (vehicles, insurance, inspections, vehicle_vignettes, vehicle_mileage, trip_logs, fuel_cards) přes čtecí dotazy, workbook přes openpyxl se vzorci COUNTIF, podmíněné formátování, firemní barvy, ukotvené záhlaví, automatický filtr. Přepočet a kontrola bez chyb vzorců.
