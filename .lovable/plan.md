# Vylepšení grafiky dashboardu (desktop)

Cíl: učinit stávající dashboard výraznější a přehlednější — stejná data a karty, hezčí grafika. Jen desktopové zobrazení, mobil zůstává beze změny. Zachováváme červeno-šedou identitu (Red #C82127 + Dark Gray #565656).

## Co se změní

### 1. Karty se statistikami (StatCard)
- Větší a vzdušnější karty: výšší hodnota (čísla výraznější), ikona v barevném kroužku s jemným gradientem podle tónu (červená/zelená/žlutá/modrá).
- Pozadí karty s jemným barevným gradientem od tónu k bílé (už částečně je, zvýrazníme).
- Sparkline (mini graf vývoje) viditelnější — vyšší a s výraznějším gradientem výplně.

### 2. Pás „Vyžaduje pozornost" (AttentionStrip)
- Počty jako barevné pilulky (badge) místo prostého textu: červená „po termínu", oranžová „kritické", šedá „nadcházející".
- Jemnější ohraničení a pozadí, aby pás vypadal jako samostatná horní lišta.

### 3. Blížící se termíny (DeadlinesCard)
- Tloušťka proužku z 6 px na 8 px, s přechodem barvy (gradient) a zaoblenými konci.
- Barevné rozlišení naléhavosti: červená (po termínu), oranžová (kritické), modrá/šedá (běžné) — přehledněji.
- Větší řádkování a čitelnější badge zbývajících dnů.

### 4. Čerpání nájezdu leasingu (LeasingMileageWidget)
- Proužky s gradientem podle stavu (zelená v limitu, oranžová riziko, červená přečerpání) a zaoblením.
- U hlavních vozidel zvýraznění procent (85 % plánu) barevně podle stavu.

### 5. Grafy v záložce Náklady a analytika
- Sloupcový graf „Vývoj nákladů": výrazně vyšší (z ~288 px na ~340 px), sloupce se zaoblenými horními rohy a jemným gradientem (červená Servis, tmavě šedá PHM).
- Hezčí legenda a mřížka, číselná osa s jednotkami (tis. Kč).
- TOP 5 seznamy: barevné řádky s ikonou pořadí (1–5) místo prostého textu.

### 6. Hlavičky karet (ChartCard)
- Ikona v barevném chipu s pozadím (stejný styl u všech karet) — sjednocení vzhledu.

### 7. Prázdné místo pod kartami
- Karty ve stejném řádku se zarovnají do stejné výšky (vyplní prostor místo bílé mezery pod „Blížícími se termíny").

## Technické detaily
- Barvy se berou ze stávajících tokenů v `src/index.css` (–primary, --success, --warning, --info, --destructive, --chart-1..6); žádné natvrdo zapsané barvy. Případné nové gradienty přidáme jako tokeny do `index.css`.
- Upravované soubory: `src/components/dashboard/StatCard.tsx`, `AttentionStrip.tsx`, `DeadlinesCard.tsx`, `ChartCard.tsx`, `src/components/leasing/LeasingMileageWidget.tsx`, `src/components/dashboard/RankList.tsx`, `src/pages/Dashboard.tsx`, `src/index.css`.
- Data ani databáze se nemění — jen prezentační vrstva.
- Ověření: typecheck + Playwright screenshot obou záložek dashboardu a porovnání s původním stavem.
