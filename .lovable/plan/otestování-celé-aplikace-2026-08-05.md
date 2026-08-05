# Otestování celé aplikace

## Cíl
Projít aplikaci od začátku do konce a ověřit, že klíčové moduly fungují — od přihlášení přes vozidla, rezervace, knihu jízd, cesťáky až po mobilní zobrazení. Výstupem bude přehled "funguje / nefunguje" s konkrétními nálezy.

## Co se bude testovat

### 1. Automatické testy a stabilita kódu
- Spuštění stávající sady testů (pravidla rezervací, nájezd leasingu, výpočty stravného).
- Typová kontrola a produkční build — odhalí rozbité importy a chyby, které nejsou na první pohled vidět.

### 2. Průchod aplikací v prohlížeči (desktop)
Postupně otevřít a proklikat každou položku levého menu a zaznamenat chyby v konzoli i chybějící data:
- Dashboard — notifikace, filtry období/vozidlo/řidič, KPI dlaždice, grafy, termíny, leasing, rezervace
- Vozidla — seznam, filtry, detail vozidla a jeho záložky (leasing, servis, dokumenty, karty, kniha jízd, předání, incidenty)
- Kalendář a rezervace — vytvoření rezervace, výběr řidiče z databáze, editace neschválené rezervace, schválení
- Kniha jízd — report, filtr vozidla, export CSV; zápis přes detail vozidla včetně vkládání z Excelu a generátoru měsíce
- Cestovní příkazy — založení, načtení z knihy jízd, přepočet stravného, uložení, workflow stavů, export PDF včetně diakritiky
- Karty, náklady, incidenty, servis, řidiči, notifikace, nastavení (sazby, uživatelé, firma)

### 3. Mobilní zobrazení
Ve zúžené šířce projít domovskou obrazovku řidiče, moje rezervace, moje vozidlo, mobilní přehled vozidel a karet, rychlé akce (zápis jízdy, rezervace, incident) a ověřit, že se karta paliva zobrazuje jen během aktivní rezervace.

### 4. Backend a data
- Kontrola stavu backendu a nedávných chyb v logu funkcí (upozornění na expirace, cesťáky, pozvánky uživatelů, kurzy ČNB).
- Bezpečnostní sken — RLS a přístupová práva.
- Kontrola, zda klíčové tabulky obsahují data (prázdná tabulka často vypadá jako rozbitá funkce).

### 5. Responzivita a chyby v konzoli
U každého kroku sledovat chyby v konzoli a neúspěšné síťové požadavky; snímky obrazovky u problémových míst.

## Výstup
Souhrnná zpráva rozdělená na: funguje bez výhrad / drobné nedostatky / chyby k opravě. Opravy navrhnu jako samostatný krok — v rámci tohoto testování se nic neupravuje.

## Technické detaily
- Prohlížečové průchody přes Playwright proti běžícímu dev serveru, s obnovenou přihlášenou relací; snímky do `/tmp/browser/`.
- Testy přes Vitest, dotazy na data přes read-only SQL, logy funkcí přes nástroj pro logy.
- Testování je pouze pro čtení. Kde je nutné vytvořit záznam (rezervace, cesťák), použije se zřetelně označený testovací záznam, který se na konci smaže.
