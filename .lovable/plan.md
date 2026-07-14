## Cíl
Umožnit u každé jízdy zvolit, zda cesta tam a zpět bude zapsaná jako dva řádky (dnešní chování) nebo jako jeden řádek ve formátu `Praha – Brno – Praha`.

## Kde přepínač bude

1. **Generátor knihy jízd** (`TripLogGeneratorDialog`)
   - V nastavení generátoru přidat volbu `Formát jízdy tam a zpět`:
     - `Dva řádky` (výchozí, dnešní chování)
     - `Jeden řádek (kruhová trasa)`
   - Volba se uloží do `localStorage` spolu s ostatními preferencemi.

2. **Ruční přidání řádku v knize jízd** (`VehicleTripLogInline`)
   - U tlačítka `+ Řádek` přidat vedle malý přepínač / rozbalovací volbu se stejnými dvěma režimy.
   - Při volbě „jeden řádek" se automaticky vyplní `route_to` jako `cíl – základna` a čas se nastaví na jeden interval.

## Chování generátoru v režimu „jeden řádek"

- Místo dvou řádků (`Praha → Brno` a `Brno → Praha`) vygeneruje jeden řádek s:
  - `route_from` = základna (např. `Praha – sídlo`)
  - `route_to` = `cíl – základna` (např. `Brno – Praha – sídlo`)
  - `time` = čas odjezdu (`timeOut`)
  - `km_start`, `km_end` = celý denní nájezd v jednom kuse
  - `fuel_quantity` / `fuel_price` = na tomtéž řádku, pokud v ten den bylo tankování
- Počet vygenerovaných záznamů se tím sníží zhruba na polovinu.

## Chování v ruční knize jízd

- Volba u tlačítka `+ Řádek` přepne formulář nového řádku:
  - `Dva řádky` = přidá dvě prázdné jízdy (tam, zpět), jak funguje dnes.
  - `Jeden řádek` = přidá jednu jízdu s předvyplněným polem `route_to` ve tvaru `… – <základna>`.

## Co se nemění

- Databázové schéma zůstává beze změny (`trip_logs` má už dnes textová pole `route_from`, `route_to`).
- Export do Excelu, šablony a zbytek UI se nemění.
- Existující záznamy se nijak nepřepočítávají.

## Technické detaily

- `PrefState` v `TripLogGeneratorDialog.tsx` dostane pole `roundTripMode: "split" | "single"`.
- `generateMonth` v `src/lib/tripGen/generateMonth.ts` dostane parametr `roundTripMode`; při `single` vytvoří v každém aktivním dni jen jeden `GeneratedTrip` místo dvou a formát `route_to` složí jako `${destination} – ${base}`.
- `VehicleTripLogInline.tsx` dostane lokální stav pro režim řádku a upraví handler tlačítka `+ Řádek`.
- Žádná změna migrací ani RLS.
