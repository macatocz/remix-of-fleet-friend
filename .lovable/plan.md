# Optimalizace velikosti dashboardu

## Cíl
Zmenšit přehnaně velké dlaždice na dashboardu, aby se vešlo více informací na obrazovku bez zbytečného scrollování a prázdného místa.

## Analýza aktuálního stavu
Dashboard má tyto oblasti:
- Notifikace: 3 sloupce (Kritické / Varování / Informace) vedle sebe, zabírají hodně šířky a výšky i při malém počtu záznamů.
- Termíny, leasing a rezervace: 3 karty pod sebou/vedle sebe — Blížící se termíny, Čerpání nájezdu leasingových vozů, Čekající rezervace. Karty mají velké paddingy a vysoký řádek na jednotlivé položky.
- Přehled a Náklady a provoz: 4 statové karty s paddingy a sparkline grafy, které zabírají slušnou část výšky.

## Zvolený směr
Volím kompaktní hustotu ve stylu „Condensed list“: karty se sjednocenou hlavičkou, řádky místo velkých bloků, menší paddingy a fonty, tenké barevné statusové pruhy místo velkých ikon. Modrobílá paleta, čeština a všechen obsah zůstávají.

## Návrh optimalizace

### 1. Kompaktní notifikace
- Z tří sloupců udělat jednu horizontální lištu (tzv. "alert bar") s 3 segmenty vedle sebe, každý jen s číslem a krátkým štítkem.
- Po kliknutí na segment se rozbalí detailní seznam pod lištou.
- Ušetří se vertikální i horizontální prostor, zvlášť když je např. varování prázdné.

### 2. Kompaktní statové karty
- Zmenšit padding uvnitř karet (z p-5 na p-3–4).
- Zmenšit ikony a hodnoty, zkrátit hinty nebo je zobrazit jen na hover.
- Sparkline grafy zachovat, ale zmenšit na 24–28 px výšky.
- Na desktopu ponechat 4 karty v řadě, ale s menší výškou.

### 3. Sloučení Termíny + Leasing + Rezervace do kompaktního řádku
- **Blížící se termíny** – zmenšit paddingy, zúžit řádky, zkrátit popisy.
- **Čerpání nájezdu** – zachovat sklápěcí logiku z předchozí úpravy, ale zmenšit výšku jednotlivých řádků (z p-3 na p-2) a progress bar na 6 px.
- **Čekající rezervace** – pokud je prázdná, nezobrazovat jako plnohodnotnou kartu, ale jen kompaktní stavovou značku nebo ji sloučit s Termíny.
- Na desktopu všechny 3 karty vedle sebe v jednom řádku, nahoře sdílená sekce s jedním nadpisem.

### 4. Lepší využití prázdného místa
- Odstranit přebytečné mezery mezi sekcemi (z space-y-8 na space-y-6).
- Sjednotit paddingy všech karet na menší hodnotu.
- Karty s malým počtem dat zobrazit menší výšku (auto-height místo fixní).

### 5. Responzivita
- Na mobilech zachovat svislý stack, ale s menšími paddingy a menšími fonty.
- Na tabletech a desktopu využívat více sloupců a menší výšku.

## Technické detaily
- Změny pouze v UI souborech: `src/pages/Dashboard.tsx`, `src/components/VehicleNotifications.tsx`, `src/components/dashboard/StatCard.tsx`, `src/components/dashboard/DeadlinesCard.tsx`, `src/components/leasing/LeasingMileageWidget.tsx`, `src/components/PendingReservationsWidget.tsx`.
- Použít Tailwind utility pro kompaktní varianty (např. `p-3`, `gap-4`, `text-sm`, `h-5`).
- Zachovat designové tokeny — nezavádět hardcoded barvy.
- Bez změny datového modelu nebo backend logiky.
- Po úpravě ověřit build a typovou kontrolu.
