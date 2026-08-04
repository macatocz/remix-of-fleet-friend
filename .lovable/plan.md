# Grafické vylepšení dashboardu

Cíl: udělat hlavní dashboard vizuálně propracovanější a čitelnější — bez změny dat a logiky, jen prezentační vrstva.

## Co se změní

**1. KPI karty nahoře**
- Větší dlaždice s jemným barevným gradientem podle typu (vozidla / rezervace / náklady / km).
- Ikona v barevném kroužku, velké číslo, pod ním kontext (např. „z 35 vozidel“).
- Mini sparkline (mikro-graf trendu) přímo v kartě u nákladů a najetých km.
- Jemný hover efekt a proklik na příslušnou sekci.

**2. Grafy**
- Sjednocená paleta z design tokenů (modrobílá identita) místo dnešní směsi napevno zadaných HSL barev.
- Sloupcové grafy dostanou gradientovou výplň a zaoblené rohy, spojnicový graf plochu pod křivkou.
- Vlastní tooltip ve stylu aplikace (dnes výchozí bílý recharts box).
- Popisky os decentnější, mřížka jen vodorovná.
- Prázdné stavy: místo holé věty ikona + krátký text.

**3. Rozvržení**
- Bento layout: notifikace nahoře přes celou šířku, pak řádek KPI, pak asymetrická mřížka (velký graf trendu nákladů + menší postranní widgety).
- Sekce oddělené nadpisy („Přehled“, „Náklady a provoz“, „Blížící se termíny“).
- Konzistentní výška karet v řádku.

**4. Seznamy termínů (STK, pojištění, leasing, servis)**
- Sloučení do jedné karty s taby místo čtyř bloků, každý tab s počtem položek.
- Barevný levý pruh podle naléhavosti (po termínu / do 30 dní / do 90 dní).

**5. Top žebříčky (náklady, nájezd)**
- Řádky doplněné o vodorovný proporční pruh vůči nejvyšší hodnotě.

**6. Drobnosti**
- Skeleton loading místo prázdných karet při načítání.
- Jemný fade-in hodnot po načtení.

## Technické poznámky

- Dotčené soubory: `src/pages/Dashboard.tsx`, `src/components/DashboardExtraWidgets.tsx`, `src/components/VehicleNotifications.tsx`, `src/components/PendingReservationsWidget.tsx`, plus nové sdílené komponenty v `src/components/dashboard/` (StatCard, ChartCard, ChartTooltip, EmptyState).
- Barvy jen přes sémantické tokeny v `index.css` / `tailwind.config.ts`; chybějící tokeny pro grafy (`--chart-1` … `--chart-6`) doplním tam.
- Grafy zůstávají na Recharts, žádná nová knihovna.
- Datové dotazy a výpočty se nemění.