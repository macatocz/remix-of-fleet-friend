

# Řazení sloupců v přehledových tabulkách

## Co se změní
Všechny hlavní přehledové tabulky získají možnost řazení kliknutím na záhlaví sloupce. Kliknutí přepne mezi vzestupným (▲) a sestupným (▼) řazením. Aktivní sloupec bude vizuálně odlišen šipkou.

## Dotčené stránky

| Stránka | Soubor | Tabulky |
|---------|--------|---------|
| Vozidla | `Vehicles.tsx` | Hlavní tabulka vozidel (dynamické sloupce) |
| Řidiči | `Drivers.tsx` | Tabulka řidičů |
| Servis | `Service.tsx` | Servisní záznamy, STK/emise, pojištění (3 tabulky) |
| Náklady | `Costs.tsx` | Tabulka nákladů |
| Kniha jízd | `TripLog.tsx` | Tabulka jízd |
| Tankování | `FuelCards.tsx` | Tabulka tankovacích karet |

## Technický přístup

1. **Vytvořit reusable hook `useSortableTable`** — state pro `sortKey` a `sortDirection` (`asc`/`desc`), funkce `handleSort(key)` pro přepínání, a `sortData(data)` pro seřazení pole.

2. **Vytvořit komponentu `SortableTableHead`** — wrapper kolem `TableHead`, který při kliknutí volá `handleSort` a zobrazuje šipku (▲/▼) u aktivního sloupce. Kurzor `cursor-pointer`.

3. **Aplikovat na každou stránku** — nahradit statické `<TableHead>` za `<SortableTableHead>`, data před renderem seřadit pomocí `sortData()`. Řazení bude pracovat s již filtrovanými daty (po vyhledávání).

4. **Řazení typů** — čísla numericky, datumy chronologicky, text abecedně (case-insensitive, české locale `cs-CZ`).

## Rozsah
- 1 nový soubor: `src/hooks/useSortableTable.ts`
- 1 nová komponenta: `src/components/ui/sortable-table-head.tsx`
- 6 upravených stránek

