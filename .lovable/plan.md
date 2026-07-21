## Cíl
Přidat sloupec **Název vozu** (`nazev_vozu`) — krátký, čitelný identifikátor auta v seznamech a detailech. Původní `znacka` (plný popis modelu z leasingu) zůstává beze změny.

## Konvence názvu
- **Přiřazené vozidlo** → `Příjmení + zkrácený model`
  - např. „Táborský VW Golf", „Mai Toyota Hilux", „Peták VW Golf"
- **POOL vozidlo** → `Pool <lokalita/číslo> + zkrácený model`
  - Zachovám existující rozlišení z pole `spravce` (např. „POOL PHA 1", „POOL LBC 2 - Josef Kohout") → „Pool PHA 1 VW Golf", „Pool LBC 2 VW Golf".
  - U 7 vozidel s prostým „POOL" bez čísla doplním průběžné číslo v rámci lokality (Pool PHA 1, 2, …). Pokud preferuješ globální číslování „Pool 1 / Pool 2 …" bez lokality, řekni a přehodím logiku.

## Zkracování modelu (`znacka` → krátká forma)
Odvození bez ztráty dat — plný text zůstává v `znacka`:
- prefix mapping: `Volkswagen → VW`, `Škoda → Škoda`, `Hyundai → Hyundai`, `Toyota → Toyota`, `Volvo → Volvo`, `Dacia → Dacia`, `BMW → BMW`
- řada: vezme se první „slovo" po značce a očistí od verzí (`Golf Var.1.0TSI …` → `Golf`, `M340i` → `M340i`, `Octavia` → `Octavia`, `XC60` → `XC60`, `Hilux 2.8D-4D …` → `Hilux`, `Duster 1.2 TCe …` → `Duster`, `i30` → `i30`, `Yeti` → `Yeti`)
- výsledek: `VW Golf`, `BMW M340i`, `Škoda Octavia`, `Toyota Hilux`, `Dacia Duster`, `Volvo XC60`, `Hyundai i30`, `Škoda Yeti`

## Kroky

1. **DB migrace** — přidat `vehicles.nazev_vozu TEXT` (nullable).
2. **Utility** `src/lib/vehicleName.ts` — funkce `buildVehicleName(vehicle)` implementující pravidla výše (zkrácení modelu + kompozice s příjmením/pool labelem). Použije se pro auto-generování při vytvoření/editaci vozidla i pro backfill.
3. **Backfill** — jednorázový UPDATE, který nastaví `nazev_vozu` pro všechna existující vozidla podle logiky. Pool číslování se odvodí ze současného `spravce` textu, chybějící čísla doplní podle `lokalita` + pořadí.
4. **Detail vozidla** (`src/pages/VehicleDetail.tsx`):
   - Přidat editovatelné pole „Název vozu" jako první v základní sekci.
   - Tlačítko „Vygenerovat z modelu + správce" pro přepsání navrženou hodnotou.
   - Auto-návrh při změně `spravce_id` / `znacka` / `spravce`, pokud pole nebylo ručně upraveno.
5. **Seznam vozidel** (`src/pages/Vehicles.tsx`):
   - Přidat sloupec „Název vozu" (defaultně viditelný, řaditelný, hledatelný).
   - Rozšířit fulltext hledání o `nazev_vozu`.
6. **Mobilní seznam** (`src/pages/mobile/MobileVehicles.tsx`):
   - Zobrazovat `nazev_vozu` jako hlavní titulek karty, RZ jako sekundární.
7. **Import z Excelu** (`src/components/VehicleImport.tsx`):
   - Přijmout hlavičku „Název vozu" → `nazev_vozu`.
   - Pokud chybí, po importu spustit stejné auto-generování jako u backfillu.
8. **Ostatní zobrazení** (find sheet, notifikace, kalendář titulky): kde se dnes ukazuje `znacka + rz`, přepnout na `nazev_vozu ?? znacka` (fallback).

## K potvrzení
- Pool číslování: **lokalita-based** (Pool PHA 1, Pool LBC 1 …) — pokud chceš globální (Pool 1…N), řekni a upravím krok 3.
- Použít **příjmení** správce (ne celé jméno). OK?
