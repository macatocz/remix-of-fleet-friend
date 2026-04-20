

## Cíl
V mobilním formuláři rezervace (a ve "Najít volný vůz") nahradit `<input type="date">` plnohodnotným **vizuálním kalendářem** (Shadcn Calendar v Popoveru), aby si uživatel datum vždy vybral klikáním v kalendáři – nezávisle na tom, jaký prohlížeč/webview používá.

## Proč to teď nejde
`<input type="date">` se na mobilu spoléhá na nativní datepicker prohlížeče. V Lovable preview iframe (a v některých in-app webview) se nativní picker neotevře a uživatel vidí jen prázdné textové pole.

## Co se mění

### 1. Nová pomocná komponenta `src/components/ui/mobile-date-picker.tsx`
Tlačítko (h-12, full-width) zobrazující vybrané datum v českém formátu (např. „20. 4. 2026"). Po tapu se otevře `Popover` s `Calendar` (mode="single", `pointer-events-auto`, lokalizace `cs`). Po výběru se popover zavře a zavolá `onChange(YYYY-MM-DD)`. API:
```text
<MobileDatePicker
  value={dateFrom}          // "YYYY-MM-DD" nebo ""
  onChange={setDateFrom}
  placeholder="Vyberte datum"
  min="YYYY-MM-DD"          // volitelně, např. dnes
/>
```
Komponenta interně převádí mezi `string` (DB formát) a `Date`.

### 2. `src/components/mobile/NewReservationDialog.tsx`
- Nahradit oba `<Input type="date">` (Datum od / Datum do) komponentou `MobileDatePicker`.
- `Datum do` dostane `min={dateFrom}`, aby nešlo zvolit dřívější den.
- `<Input type="time">` pro Čas od/do **necháme** – nativní time picker funguje spolehlivě i v iframe (a uživatel si nestěžoval na čas, jen na datum). Pokud vyjde najevo i problém s časem, vyřešíme samostatně.

### 3. `src/components/mobile/FindVehicleSheet.tsx`
- Stejná náhrada datových polí na `MobileDatePicker` (Datum od / Datum do, `Datum do` má `min={dateFrom}`).

### 4. Lokalizace
Použít `date-fns/locale/cs` (knihovna už v projektu je) pro `Calendar` a pro formátování zobrazeného data.

## Co se NEmění
- Datový model, formát ukládání (`YYYY-MM-DD`), validační logika, overlap kontrola.
- Desktopové formuláře.
- Pole pro čas.

## Soubory
**Vytvořit:** `src/components/ui/mobile-date-picker.tsx`
**Upravit:** `src/components/mobile/NewReservationDialog.tsx`, `src/components/mobile/FindVehicleSheet.tsx`

## Jak to otestovat
1. Otevřít `/m/rezervace` → tap „Nová žádost".
2. Tap na pole „Datum od" → musí se vysunout vizuální kalendář s českými názvy měsíců/dnů.
3. Vybrat den → kalendář se zavře, datum se zobrazí jako „20. 4. 2026".
4. Pole „Datum do" nesmí dovolit dřívější datum než „Datum od".
5. Stejná kontrola pro „Najít volný vůz" na domovské obrazovce řidiče.

