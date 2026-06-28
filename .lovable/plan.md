## Cíl
V kalendáři vozidla (detail vozu → tab Kalendář → Nová rezervace) nahradit textový input "Jméno řidiče" výběrem z databáze řidičů — stejně jako už funguje v sekci Rezervace.

## Změny
**`src/components/VehicleCalendar.tsx`**
- Načíst aktivní řidiče z `drivers` (`id, first_name, last_name`, filtr `status = 'aktivní'`, řazení podle příjmení) při mountu.
- Stav `formDriver` zůstává jako string s celým jménem (sloupec `reservations.driver_name` je text), ale vyplní se výběrem ze `Select`u.
- Nahradit `<Input placeholder="Jméno řidiče">` komponentou `<Select>` (shadcn) s položkami `"{first_name} {last_name}"`.
- Při resetu formuláře vyčistit i výběr.
- Validace zůstává (`!formDriver.trim()`).

## Mimo rozsah
- Schéma `reservations` neměním (zůstává `driver_name TEXT`). Vazba na `driver_id` by byla větší refaktor.
- Mobilní rychlou rezervaci a stránku Rezervace neřeším — tam už výběr funguje.
