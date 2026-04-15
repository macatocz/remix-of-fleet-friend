

# Výběr řidiče z databáze ve formuláři rezervace

## Co se změní
Pole „Řidič" ve formuláři nové/editované rezervace se změní z volného textového vstupu na **Select dropdown** s řidiči načtenými z tabulky `drivers` (pouze aktivní). Stále se uloží `driver_name` (textová hodnota), takže není potřeba měnit DB schéma.

## Technické kroky (1 soubor: `Reservations.tsx`)

1. **Fetch řidičů** — do `fetchData` přidat dotaz na `drivers` (`id, first_name, last_name`), filtr `status = 'aktivní'`, uložit do nového state `drivers`.

2. **Nahradit Input za Select** — pole „Řidič" bude `<Select>` s hodnotami ve formátu `"Jméno Příjmení"`. Hodnota `form.driver_name` se nastaví na vybraného řidiče jako text string (kompatibilní se stávajícím `driver_name` sloupcem v DB).

3. **Zachovat zpětnou kompatibilitu** — existující rezervace s ručně zadanými jmény se zobrazí beze změny v tabulce (sloupec `driver_name` zůstává text).

