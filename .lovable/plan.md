

# Přidání navigace po rocích v kalendáři

react-day-picker v8 má vestavěnou podporu pro dropdown navigaci měsíců a roků přes props `captionLayout`, `fromYear` a `toYear`.

## Změna

Upravíme `src/components/ui/calendar.tsx` — přidáme:
- `captionLayout="dropdown-buttons"` — zobrazí dropdown pro měsíc i rok vedle navigačních šipek
- `fromYear={2015}` a `toYear={2035}` jako výchozí rozsah (lze přepsat přes props)
- Stylování dropdownů přes `classNames` (`caption_dropdowns`, `dropdown`, `dropdown_month`, `dropdown_year`, `vhidden`)

Tím se v hlavičce kalendáře místo prostého textu „duben 2026" zobrazí dva selecty (měsíc + rok), které umožní rychlý skok na libovolný rok/měsíc.

## Rozsah
- 1 soubor: `src/components/ui/calendar.tsx`
- 0 DB migrací

