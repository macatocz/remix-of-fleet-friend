Oprava čitelnosti textů ve widgetu "Vytíženost vozidel (30 dní)" na dashboardu.

## Problém
V horizontálním sloupcovém grafu (Recharts) se jména vozidel na Y ose překrývají a jsou utržena kvůli malému rezervovanému prostoru (`width={130}`). Dlouhé labely typu "1ACV762 – Toyota Hilux 2.8D-4D DC Inv. AT" se nevejdou.

## Řešení
1. **Rozšířit prostor pro Y osu** – zvýšit `width` z 130 px na ~220 px, aby se dlouhé názvy vešly.
2. **Zmenšit písmo a zalomit** – nastavit `fontSize` na 10–11 px a povolit `tick` zalamování (`wordWrap`), případně zkrátit text pomocí ellipsis.
3. **Zvýšit výšku grafu** – z 240 px na ~280 px, aby se více řádků vešlo bez překrývání.
4. **Volitelně: kompaktnější formát labelu** – např. zobrazit jen RZ + značka bez varianty motoru, pokud to uživatel preferuje.

## Soubory
- `src/components/DashboardExtraWidgets.tsx` (úprava `YAxis` props)

## Ověření
- Screenshot grafu po opravě, kontrola, že žádný text nepřesahuje a nepřekrývá se.