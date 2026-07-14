## Generátor knihy jízd (na detailu vozidla)

Přidáme do modulu **Kniha jízd** na detailu vozidla nové tlačítko **„Vygenerovat měsíc"**, které z pár pevných vstupů dopočítá věrohodné jednotlivé jízdy a nabídne je k hromadnému schválení.

### 1. Vstupní krok (dialog)

Formulář o jednom kroku, vše na jedné obrazovce:

- **Měsíc** – předvyplněný z aktuálně vybraného měsíce v knize.
- **Počáteční km** – auto-load z posledního záznamu (nebo z `vehicle.mileage`), lze přepsat.
- **Cílový stav km na konci měsíce** – povinné.
- **Domácí základna** – text (např. „Praha – sídlo"); auto-load z posledně použité hodnoty pro vozidlo.
- **Tankování** – editovatelná mini-tabulka řádků `datum | místo | litry | cena Kč` (Přidat / Odebrat). Předvyplní se ze `service_records`/existujících `trip_logs.fuel_*` v daném měsíci, pokud tam něco je; jinak prázdné.
- **Pracovní kalendář** – checkbox „Generovat jen v pracovních dnech" (default zapnuto). Základní CZ svátky napevno v `src/lib/tripGen/holidaysCZ.ts`.
- **Předdefinovaný seznam účelů + cílů** – dvě textarea (řádek = položka). Uložíme per uživatel do `app_settings` jako preference `trip_gen_purposes` / `trip_gen_destinations`, aby se příště předvyplnily.

### 2. Logika generátoru (`src/lib/tripGen/generateMonth.ts`, čistá TS funkce, unit-testovatelná)

Pravidla:

1. Spočítej **celkové km** = cílový stav − počáteční.
2. Sestav seznam **pracovních dnů** měsíce (dle přepínače, minus víkendy/svátky).
3. **Kotevní body** = dny tankování. Ke každému tankování přiřaď nejbližší pracovní den (nebo přímo daný den, i když je víkend) a označ jako „delší cesta" s cílem = místo tankování.
4. Rozděl celkové km:
   - Rezervuj přiměřený objem km pro každou tankovací jízdu (odhad podle vzdálenosti mezi kotevními místy; když neznáme, dej průměr proporčně podle litrů × orientační spotřeba z `vehicles.spotreba`, fallback 7 l/100 km).
   - Zbytek km rozprostři rovnoměrně přes ostatní pracovní dny.
5. Pro každý pracovní den vytvoř **dvě jízdy** (tam + zpět):
   - tam: `route_from = základna`, `route_to = cíl dne` (rotovaný z předdefinovaného seznamu, u tankovacích dnů = místo tankování), km = ½ denních km.
   - zpět: opačně, km = zbytek.
   - `purpose` = rotovaný z předdefinovaného seznamu.
   - `time` = 07:30 / 16:30 (konfigurovatelné konstantou).
6. K poslední jízdě dne, kdy bylo tankování, připoj `fuel_quantity` a `fuel_price` z odpovídajícího řádku.
7. Vypočti `km_start`/`km_end` narůstavě, aby souhlasil finální stav (poslední jízda dorovná zaokrouhlování).

### 3. Krok „Náhled"

- Tabulka všech vygenerovaných jízd (stejné sloupce jako v knize) + kontrolní součet **∑ km = cíl** a **∑ litrů / Kč = zadané tankování**.
- U každého řádku ikonka tužky → inline editace pole (route, purpose, km, čas).
- Tlačítko **„Přegenerovat"** (nový seed) a **„Uložit vše"** → jeden `insert` do `trip_logs` s celým polem (bulk insert).
- Po uložení se dialog zavře a kniha se obnoví.

### 4. Umístění v UI

- Nové tlačítko `Vygenerovat měsíc` v hlavičce `VehicleTripLog` vedle **Nový záznam**, viditelné jen když `!readOnly && vehicleId`.
- Otevře komponentu `TripLogGeneratorDialog` (nová složka `src/components/trip-log/`).

### 5. Uložení preferencí

Do `app_settings` (klíč per user) uložíme naposledy použité: základna, seznam účelů, seznam cílů, časy tam/zpět. Žádná změna schématu není potřeba, `app_settings` už existuje s `key/value` strukturou.

### 6. Bez zásahu do backendu

- Zápis probíhá standardním `supabase.from("trip_logs").insert([...])`, RLS zůstává beze změny.
- Žádné migrace, žádné edge funkce.

### Soubory, které přibudou / se změní

```
src/lib/tripGen/holidaysCZ.ts         (new)
src/lib/tripGen/generateMonth.ts      (new, čistá funkce)
src/lib/tripGen/types.ts              (new)
src/components/trip-log/TripLogGeneratorDialog.tsx  (new)
src/components/trip-log/GeneratorPreviewTable.tsx   (new)
src/components/VehicleTripLog.tsx     (přidání tlačítka a otevírání dialogu)
```

### Co záměrně NEDĚLÁM

- Neintegruji AI (uživatel zvolil rotovaný seznam).
- Neměním databázové schéma ani RLS.
- Negeneruji jízdy o víkendech, pokud den tankování není víkend.
