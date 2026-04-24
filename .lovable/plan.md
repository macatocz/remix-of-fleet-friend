
## Kniha jízd — „jak v Excelu" pro hromadné zadávání zpětně

Současný stav (`VehicleTripLogInline`) už má slušný základ: kalendářní mód s řádkem na každý den, řetězení `km_start` z předchozího `km_end`, Ctrl+S, Tab/Enter, výpočet km. Co reálně chybí pro pohodlné doplnění týdnů/měsíců najednou — a co uděláme:

### 1. Paste z Excelu / Tabulky (TSV)

Když máš data v Excelu nebo v poznámkách, jen `Ctrl+V` do tabulky a řádky se vyplní.

- Detekce paste eventu na tabulce (TSV — taby mezi sloupci, `\n` mezi řádky)
- Mapování sloupců podle aktuální pozice kurzoru (vloží od fokusované buňky doprava/dolů)
- Inteligentní parsování:
  - Datum: `15.4.`, `15.4.2026`, `2026-04-15`, `15/4`
  - Čas: `7:30`, `07:30`
  - Čísla: `12 345`, `12.345`, `12,345` → 12345
  - PHM: `45,5 l`, `45.5` → 45.5
- Náhled „Vložit X řádků?" s tlačítky Potvrdit / Zrušit
- Tlačítko **„Vložit ze schránky"** v toolbaru (pro mobil/dotyk, kde paste není v `<input>`)

### 2. Fill-down (Ctrl+D) jako v Excelu

- Označit více buněk ve stejném sloupci → `Ctrl+D` vyplní hodnotu z první buňky dolů
- Drag handle v pravém dolním rohu fokusované buňky (jako v Excelu) → tažením dolů kopíruje hodnotu
- Funguje pro: řidič, účel, popis, trasa Z/Do, čas, PHM cena/l (přepočítá množství podle `km_total` a průměrné spotřeby vozidla)

### 3. Šablony pravidelných tras

Často se opakuje „Praha → Brno", „domov → kancelář". Uložená šablona = klik a celý řádek je předvyplněný.

- Nová tabulka `trip_templates` (`vehicle_id` nebo `driver_id`, `label`, `route_from`, `route_to`, `km_total`, `purpose`, `description`)
- Tlačítko **„Šablony"** otevře popover se seznamem → klik vloží do aktuálního řádku
- Z každého řádku tlačítko „📌 Uložit jako šablonu"
- Auto-detekce: pokud trasa Z→Do byla použita 3×+, nabídne uložit jako šablonu

### 4. Autocomplete míst (datalist)

- `route_from` a `route_to` mají datalist sestavený z předchozích záznamů toho vozidla / řidiče
- Po napsání 2 znaků se nabídnou doplnění
- Při výběru páru, který už byl, automaticky doplní `km_total` z mediánu předchozích jízd této trasy (uživatel může přepsat)

### 5. Rychlé akce na řádku

V kalendářním módu přibude na konci každého řádku menu:

- **„Stejné jako včera"** — zkopíruje předchozí den (řidič, trasa, km/100)
- **„Duplikovat"** — vloží stejný řádek pro vybraný den
- **„Pracovní týden"** — vyplní Po–Pá stejnou trasou (např. dojíždění)
- **„Víkend / dovolená"** — označí dny jako bez jízdy (žádný záznam, šedé pozadí)

### 6. Hromadné akce (multi-select)

- Checkbox vlevo na každém řádku
- Toolbar nad tabulkou se objeví při výběru: **Smazat vybrané · Nastavit řidiče · Nastavit účel · Duplikovat do…**
- `Shift+klik` na druhý checkbox = výběr rozsahu

### 7. Smart defaults při otevření měsíce

- **Auto-fill počáteční km**: při prvním otevření měsíce, kde není první den vyplněn, doplní `km_start` z posledního známého `km_end` (i z předchozího měsíce)
- **Předvyplnění řidiče**: pokud má vozidlo `spravce_id` a žádné jízdy, předvyplní řidiče u všech dnů
- **Týdenní vzor**: pokud minulý týden měl řidič stejný vzor (Po–Pá), nabídne tlačítkem „Použít vzor minulého týdne"

### 8. Mobilní rychlé zadání (FAB + bottom sheet)

Na mobilu je tabulka nepoužitelná. Přidáme rychlou cestu:

- Na `/m/moje-vozidla` → karta vozidla už má „Zápis jízdy" (existující `QuickTripDialog`) — **rozšíříme**:
  - 1 obrazovka, velká pole
  - „Stejná trasa jako naposledy" jako 1. tlačítko (vyplní vše)
  - Šablony (chip vyber „Domov → Kancelář")
  - **„Více dní najednou"** — multi-select kalendáře, vyplní všechny vybrané dny stejnou trasou

### 9. Indikátor neuložených změn + autosave

- Sticky banner nahoře: „Máte X neuložených změn — uloží se za 30 s, nebo Ctrl+S"
- Autosave debounce 30 s (volitelné, lze vypnout v nastavení)
- Indikátor saving / saved (jako Google Docs)

### 10. Validace „před uložením"

Když uložíš měsíc, ukáže se mini souhrn rizik:

- ⚠️ Den X má `km_end` < `km_start`
- ⚠️ Den Y nenavazuje na předchozí (mezera 200 km)
- ⚠️ Dva dny mají stejný `km_end` (možná duplikát)
- Klikem skok na řádek

### Technická realizace

**Soubory k úpravě**
- `src/components/VehicleTripLogInline.tsx` — paste handler, fill-down, multi-select, autosave, validace, rychlé akce
- `src/components/QuickTripDialog.tsx` — „stejná jako naposledy", šablony, multi-day
- `src/lib/tripParse.ts` (nový) — parser TSV / formátů datum/čas/čísla
- `src/components/TripTemplatesPopover.tsx` (nový) — UI pro šablony
- `src/hooks/useRouteHistory.ts` (nový) — autocomplete míst + medián km

**Migrace DB (1×)**
```sql
CREATE TABLE trip_templates (
  id uuid PK default gen_random_uuid(),
  vehicle_id uuid null,
  driver_id uuid null,
  label text not null,
  route_from text, route_to text,
  km_total int, purpose text, description text,
  use_count int default 0,
  created_at timestamptz default now()
);
-- RLS authenticated CRUD
```

**Klávesové zkratky** (rozšíření)
- `Ctrl+V` — paste z Excelu
- `Ctrl+D` — fill down ve výběru
- `Ctrl+S` — uložit (už je)
- `Ctrl+Klik` na den — multi-select
- `Shift+Šipky` — rozšíření výběru
- `Esc` — zrušit změny v aktivním řádku

### Co se NEMĚNÍ

- Datový model `trip_logs` — beze změny
- Stávající mód „Volný seznam" zůstává
- Statistiky, grafy, export — beze změny
- Routing, RLS, autentizace

### Mimo scope (řekni, jestli přidat)

- **Import celého .xlsx souboru** s mapováním sloupců (zatím jen paste)
- **OCR z fotky tankovací účtenky** → vyplnění PHM řádku
- **GPS / mapa** pro automatický výpočet vzdálenosti mezi místy
- **AI návrh** — „chceš, abych ti vyplnil chybějící dny podle vzoru?" (LLM)
- **Sdílení šablon** mezi řidiči ve firmě

### Otázka před implementací

Pokud chceš jen **podmnožinu** (např. nejdřív paste + šablony + fill-down a zbytek později), řekni — udělám menší iteraci. Doporučuji jako **MVP** body **1, 2, 3, 4, 5** (paste, fill-down, šablony, autocomplete, rychlé akce „stejné jako včera") — to pokryje 80 % bolesti při zpětném vyplňování.
