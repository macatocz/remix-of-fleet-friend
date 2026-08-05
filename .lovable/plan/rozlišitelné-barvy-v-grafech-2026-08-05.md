# Rozlišitelné barvy v grafech

## Problém
V dashboardovém grafu "Náklady" mají řady PHM a Servis oba červený odstín (`--chart-4` světlejší červená, `--chart-1` červená). Po přechodu na červeno-šedou identitu jsou vizuálně skoro k nerozeznání a oba sloupce navíc mají gradient do světla.

Některé další grafy zároveň stále používají staré natvrdo zadané barvy (modrá, oranžová), které do nové palety nepatří.

## Řešení
1. **Paleta grafů v `src/index.css`** – přeskládat `--chart-1..6` tak, aby sousední indexy byly kontrastní: střídat červenou a tmavě šedou/antracit, doplnit neutrální tmavý a světlý odstín. Dvě sousední řady se pak liší tónem i jasem.
2. **Dashboard graf nákladů** – PHM = tmavě šedá řada, Servis = červená řada. Gradient zůstane, ale s menším rozpětím průhlednosti, aby se spodky sloupců neslévaly do bílé.
3. **Sjednocení natvrdo zadaných barev** – v `src/pages/Costs.tsx` a `src/pages/FleetReport.tsx` nahradit `hsl(217, 71%, 45%)`, `hsl(38, 92%, 50%)`, `hsl(0, 84%, 60%)` tokeny z `CHART_COLORS`.
4. **Legenda a koláčové grafy** – ověřit, že koláč v Nákladech a rozpady v `DashboardExtraWidgets.tsx` berou barvy z nové palety a sousední výseče jsou rozlišitelné.
5. **Kontrola** – vykreslit Dashboard, Náklady a Fleet report v prohlížeči a na screenshotech ověřit odlišnost řad (včetně odstínů šedi pro tisk).

## Technické detaily
- Soubory: `src/index.css` (proměnné `--chart-1..6` pro light i dark), `src/pages/Dashboard.tsx` (gradienty `gradPhm`, `gradServis`), `src/pages/Costs.tsx`, `src/pages/FleetReport.tsx`, `src/components/DashboardExtraWidgets.tsx`.
- Žádné změny datové logiky, pouze prezentační vrstva.