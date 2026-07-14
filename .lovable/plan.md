## Problém

V kalendářním pohledu knihy jízd generátor v režimu „Dva řádky" ukládá do DB **dvě jízdy denně** (tam + zpět), ale kalendář zobrazuje jen první z nich (`existingRows.find(r => r.date === dateStr)` v `VehicleTripLogInline.tsx`). Proto:

- Pátek 17.: DB má outbound 126723→126872 a return 126872→127020. Kalendář ukáže jen outbound → jeví se to jako konec 126872.
- Sobota/neděle: placeholder si vezme „minulé km_end" = 126872 (chybně, protože ignoruje return).
- Pondělí 20.: DB má 127020 (skutečný stav po pátečním návratu) → vypadá to jako „skok".

Data jsou tedy správně, jen se špatně zobrazují. Rozdíl 148 km je páteční návratová jízda.

## Řešení: agregace dne v kalendářním pohledu

Upravit `buildCalendarRows` v `src/components/VehicleTripLogInline.tsx` tak, aby pro každý den:

1. Našel **všechny** trip_logs záznamy s tímto datem (ne jen první).
2. Sloučil je do jednoho zobrazeného řádku:
   - `km_start` = minimum z `km_start` všech jízd dne
   - `km_end` = maximum z `km_end` všech jízd dne
   - `km_total` = součet `km_total`
   - `time` = nejmenší (první odjezd)
   - `route_from` = `route_from` první jízdy dle času
   - `route_to` = pokud je více jízd a poslední končí v základně → `${prostředníDestinace} – ${base}`, jinak `route_to` poslední jízdy
   - `purpose` / `description` / `driver_id` = převzato z první jízdy (u round-tripu jsou stejné)
   - `fuel_quantity` / `fuel_price` / `other_*` = součet
3. Přidat vlajku `_aggregated = true` a `_sourceIds: string[]` (pole ID všech sloučených záznamů), aby při editaci/mazání kalendářního řádku mohla logika případně upozornit / promítnout změnu do všech zdrojových záznamů (v prvním kroku stačí zablokovat inline editaci `km_start`/`km_end` pro agregované řádky a nabídnout „Upravit v seznamu jízd").

### Změny v souborech

**`src/components/VehicleTripLogInline.tsx`**

- `buildCalendarRows`: místo `existingRows.find(...)` použít `existingRows.filter(r => r.date === dateStr)` a agregovat výše popsaným způsobem.
- Do `TripRow` interface přidat volitelné `_aggregated?: boolean` a `_sourceIds?: string[]`.
- `saveCalendar` (existující save handler kalendáře): při ukládání agregovaného řádku, který **nebyl editován** (`_dirty=false`), neprovádět nic; při editaci agregovaného řádku dočasně zobrazit toast „Řádek obsahuje 2 jízdy — otevřete detail v seznamu 'Volný zápis'." a save přeskočit (v tomto MVP kroku nedělíme zpět na dvě jízdy).
- Vykreslování řádku: pokud `_aggregated`, zobrazit malý badge „tam+zpět" u trasy, aby uživatel věděl, že jde o dvě jízdy.

**Bez změn:** `generateMonth.ts`, `TripLogGeneratorDialog.tsx`, `types.ts`, DB. Data zůstávají v pořádku, jen se lépe zobrazí.

## Ověření

Po nasazení znovu otevřít detail vozidla → záložka Kniha jízd → kalendářní pohled na aktuální měsíc:
- Pá 17. bude mít `km_start=126723`, `km_end=127020`, `km_total=297`, trasa „Praha – Plzeň – Praha".
- So/Ne placeholder `km_start=127020` (správně).
- Po 20. `km_start=127020` — plynulá návaznost.
- Součet „Celkem" bude odpovídat rozdílu `kmEnd - kmStart` z generátoru.
