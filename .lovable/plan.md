## Cíl
Pod každou položku v levém menu (desktop sidebar) přidat drobnou vysvětlivku — sekundární řádek menším šedým písmem pod hlavním názvem. Zobrazí se jen v rozbaleném stavu sidebaru (v ikonkovém režimu zmizí, stejně jako titulky).

## Návrh textů

| Položka | Vysvětlivka |
|---|---|
| Dashboard | Přehled a upozornění |
| Vozidla | Evidence vozového parku |
| Řidiči | Zaměstnanci a oprávnění |
| Rezervace | Plánování jízd a schvalování |
| Servis | Servisní plány a záznamy |
| Škody | Nehody a pojistné události |
| Kniha jízd | Přehled jízd a export |
| Náklady | Provozní a leasingové výdaje |
| Tankovací karty | Palivové karty a PINy |
| Cestovní příkazy | Tuzemské i zahraniční CP |
| Nastavení | Firma, sazby, notifikace |

## Změny
**`src/components/AppSidebar.tsx`**
- Rozšířit `mainItems` a `settingsItems` o pole `description`.
- Upravit render `SidebarMenuButton`: místo jednořádkového textu vykreslit blok se dvěma řádky — název (`text-sm font-medium`) a popisek (`text-xs text-muted-foreground leading-tight`). Popisek skrýt v `collapsed` režimu.
- Lehce zvýšit výšku položek (`h-auto py-2`), aby se vešly dva řádky.

## Mimo rozsah
- Mobilní layout (`MobileLayout.tsx`) neupravuji — tam je prostorově malý footer/drawer.
- Žádné změny dat ani routingu.
