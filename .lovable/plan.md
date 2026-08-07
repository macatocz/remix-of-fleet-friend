# Typ účelu jízdy v knize jízd (služební / soukromé / jiné)

## Cíl
Umožnit v knize jízd označit, jestli jízda byla **služební (pracovní)**, **soukromá** nebo **jiná**, stejně jako u rezervací. V současné knize jízd je jen volný textový pole „Účel“.

## Co se změní

### Databáze
- Do tabulky `trip_logs` přibude sloupec `purpose_type` (text, výchozí `'pracovne'`).
- Sloupec bude součástí všech RLS politik, žádná změna oprávnění.

### Formuláře a zadávání
- **Detail vozidla > Kniha jízd (Excel-like tabulka)** — nový sloupec/šipka **Typ** s výběrem Pracovně / Soukromě / Jiné.
- **Dialog „Nová jízda / Upravit jízdu“** — pod pole „Účel“ přibude select **Typ jízdy**.
- **Mobilní „Zápis jízdy“** — pod „Účel“ přibude select **Typ jízdy** (výchozí Pracovně).
- **Generátor měsíce knihy jízd** — vygenerované jízdy dostanou typ `pracovne`, případně s možností změnit po vygenerování.
- **Offline fronta** — uloží a pošle `purpose_type` stejně jako ostatní pole.

### Přehledy a exporty
- Tabulka knihy jízd zobrazí typ barevně (např. modrá/červená/šedá) nebo textově.
- Filtrování podle typu (stejné jako filtr řidič).
- CSV export přidá sloupec „Typ jízdy“.
- Kvartální report může rozlišit pracovní vs. soukromé km pro statistiky vytížení.

### Technické poznámky
- Použije se stávající konstanta `PURPOSE_TYPES` z `src/lib/reservationRules.ts` (`pracovne`, `soukrome`, `jine`).
- Pro soukromé jízdy zůstává **volný text „Účel“** pro poznámku (např. „nákup“), ale typ bude přesně evidován.
- Všechny existující záznamy zůstanou bez změny, nové budou mít výchozí hodnotu „Pracovně“.

## Přestávka v jízdě

Přestávka je v knize jízd už evidovaná (pole „Přestávka (min)“ v dialogu i sloupec „Přest.“ v Excel-like tabulce), ale chybí na několika místech a není nijak zvýrazněná. Doplní se:

- **Mobilní „Zápis jízdy“** — nové pole **Přestávka (min)** s rychlými volbami 0 / 15 / 30 / 45 / 60 min, aby se nemuselo psát ručně. Uloží se do `break_minutes` (i přes offline frontu).
- **Dialog „Nová jízda / Upravit jízdu“** — vedle číselného pole doplnit stejné rychlé volby.
- **Excel-like tabulka** — sloupec „Přest.“ zůstane, přidá se možnost hromadného vyplnění (Ctrl+D / kopie z předchozího řádku) stejně jako u ostatních sloupců.
- **Přehled a export** — přestávka se přidá do CSV exportu a zobrazí se v mobilním detailu jízdy.

Žádná změna databáze pro přestávku není potřeba — sloupec `break_minutes` v `trip_logs` již existuje.
