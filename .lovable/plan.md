## Cíl
Pod hlavní nadpis (`<h1>`) každé stránky přidat stejný typ popisku jako má Kniha jízd — drobný šedý řádek s vysvětlením, co stránka dělá.

## Návrh textů

| Stránka | Popisek |
|---|---|
| Dashboard | Přehled vozového parku, statistiky a notifikace |
| Vozidla | Evidence vozidel — leasing, doklady, servis, dokumenty |
| Řidiči | Zaměstnanci a uživatelé aplikace, jejich oprávnění a vozidla |
| Rezervace | Plánování jízd, schvalování a kalendář všech vozů |
| Servis a údržba | Servisní plány, STK, emise a historie oprav |
| Škody a pojistné události | Evidence nehod a pojistných událostí včetně fotodokumentace |
| Náklady a PHM | Provozní náklady, leasingové splátky a spotřeba pohonných hmot |
| Tankovací karty | Palivové karty, alokace k vozidlům a správa PINů |
| Cestovní příkazy | Tuzemské i zahraniční cesťáky včetně výpočtu stravného a export PDF |
| Nastavení | Údaje firmy, cestovní sazby, notifikace a uživatelé |

## Změny
V každé z těchto stránek obalit `<h1>` divem (pokud už není) a pod něj přidat `<p className="text-sm text-muted-foreground mt-1">…</p>`, podle vzoru `src/pages/TripLog.tsx`. Konkrétně:

- `src/pages/Dashboard.tsx`
- `src/pages/Vehicles.tsx`
- `src/pages/Drivers.tsx`
- `src/pages/Reservations.tsx`
- `src/pages/Service.tsx`
- `src/pages/Incidents.tsx`
- `src/pages/Costs.tsx`
- `src/pages/FuelCards.tsx`
- `src/pages/TravelOrders.tsx`
- `src/pages/SettingsPage.tsx`

Na stránkách, kde je vedle nadpisu tlačítko (Vozidla, Řidiči, Rezervace, Servis, Cestovní příkazy), nadpis + popisek vložím do levého sloupce flex layoutu, tlačítko zůstane vpravo.

## Mimo rozsah
- Detailové stránky (Detail vozidla, Detail cesťáku) — tam má každá karta vlastní kontext.
- Mobilní obrazovky.
