# Lepší dashboard termínů a nájezdu

## Cíl
Na hlavním dashboardu spojit rychlé řízení problémů s manažerským pohledem. Uživatel nejdřív uvidí, co musí řešit, a pod tím stav a vývoj celé flotily. Výpočty leasingového nájezdu zůstanou společné s detailem vozidla.

## Navržené rozložení

### 1. Souhrnná lišta „Termíny a nájezd“
Čtyři kompaktní ukazatele v jednom řádku:
- **Po termínu** – STK, pojištění, servis a leasing po splatnosti.
- **Do 30 dní** – nejbližší povinnosti.
- **Rizikový nájezd** – leasingové vozy nad plánem nebo s očekávaným přejezdem.
- **Chybějící údaje** – leasingové vozy bez výchozího tachometru, ročního nájezdu nebo termínů smlouvy.

Kliknutí na ukazatel přepne podrobnosti na odpovídající skupinu.

### 2. Akční seznam „Co řešit teď“
- Jeden společný prioritní seznam místo hledání v několika kartách.
- Řazení: prošlé položky, rizikový nájezd, termíny do 30 dní, ostatní.
- Každý řádek ukáže vozidlo, typ problému, konkrétní hodnotu a termín.
- Přímý proklik na detail vozidla.
- Filtry: **Vše / Termíny / Nájezd / Chybějící data**.

### 3. Přehled leasingového nájezdu
Přehledná tabulka všech leasingových vozů se sloupci:
- vozidlo a RZ,
- aktuální stav tachometru a datum posledního údaje,
- ujeto od začátku leasingu,
- plán k dnešku,
- odchylka proti plánu,
- odhad nájezdu na konci smlouvy,
- očekávané přejetí nebo nedojetí,
- konec leasingu.

Řádky budou řazené podle rizika a doplněné kompaktním pruhem skutečnost versus plán. Bezproblémové vozy půjde skrýt přepínačem „Jen rizikové“.

### 4. Manažerské grafy
- **Termíny v čase** – počty expirací v následujících 30, 60, 90 a 180 dnech, rozdělené podle typu.
- **Nájezd flotily** – počty leasingových vozů v kategoriích V pořádku / Sledovat / Varování / Kritické / Bez dat.
- Grafy budou kompaktní a budou používat současnou červeno-šedou identitu a sémantické stavové barvy.

### 5. Zachování zbytku dashboardu
- Rezervace, provozní ukazatele a nákladové grafy zůstanou funkčně beze změny.
- Současné duplicitní zobrazení termínů v notifikacích a kartě termínů se sjednotí, aby stejná událost nebyla na hlavní stránce dvakrát.
- Na menších obrazovkách se souhrn a grafy složí pod sebe bez vodorovného posouvání.

## Technické poznámky
- Přepracovat prezentační část hlavního dashboardu a sdílené prvky pro termíny a leasingový nájezd.
- Vytvořit jeden společný datový model pro prioritní položky, souhrnné počty, tabulku a grafy.
- Použít stávající výpočty leasingového nájezdu; doplnit pouze agregace a zobrazení, ne měnit význam vstupních údajů.
- Barvy pouze přes existující designové tokeny; grafy zůstanou na Recharts.
- Doplnit načítání, prázdné stavy a stav „Bez dat“ tak, aby nechybějící data nebyla zaměněna za bezproblémový stav.
- Ověřit výpočty na hraničních případech a výsledné rozložení na počítači i mobilní šířce.
