# Lepší dashboard termínů a nájezdu

## Vybraný grafický směr
Použít zvolený návrh **Modern fleet tracking**: tři rovnocenné přehledové bloky, vzdušná hierarchie, výrazné termíny v kruhových ukazatelích a nájezd jako barevné průběhové pruhy. Zachovat současnou červeno-šedou identitu aplikace a české popisky.

## Co upravíme na hlavním dashboardu

### 1. Blížící se termíny
- Hlavička s ikonou, názvem a počtem kritických položek.
- Pod ní prioritní seznam napříč STK, pojištěním, leasingem a servisem.
- Každý řádek ukáže zbývající počet dní, vozidlo, typ povinnosti a konkrétní datum nebo zbývající km.
- Kritické, blížící se a běžné položky budou jasně barevně rozlišené.
- Záložky typů zůstanou dostupné jako kompaktní filtr, ne jako výchozí překážka před prioritním seznamem.

### 2. Čerpání nájezdu leasingových vozů
- Řádky vozidel podle rizika, nejrizikovější nahoře.
- U každého vozu: aktuální čerpání proti plánu, ujeto od začátku, smluvní nájezd a barevný pruh.
- Doplnit odhad překročení nebo rezervy na konci smlouvy, aby nebylo vidět pouze dnešní procento.
- Viditelně označit vozy s chybějícími údaji; „Bez dat“ se nebude tvářit jako bezproblémový stav.
- Zachovat proklik do detailu vozidla a rozbalení všech vozů.

### 3. Čekající rezervace
- Sladit vzhled se dvěma předchozími bloky.
- Zobrazit nejbližší žádosti jako kompaktní řádky; schválení a současná logika zůstanou beze změny.
- Prázdný stav bude menší, aby karta zbytečně nezvyšovala celý řádek.

### 4. Souhrn pro rychlé rozhodování
Nad trojicí bloků přidat kompaktní přehled:
- po termínu,
- do 30 dní,
- rizikový nájezd,
- chybějící údaje.

Kliknutí na ukazatel zvýrazní odpovídající položky v přehledech pod ním.

### 5. Manažerský pohled v rámci stejného dashboardu
Pod hlavními bloky doplnit dva kompaktní grafy:
- termíny v následujících 30, 60, 90 a 180 dnech podle typu,
- rozdělení leasingových vozů na V pořádku / Sledovat / Varování / Kritické / Bez dat.

## Technické poznámky
- Změny budou jen v hlavním dashboardu a jeho sdílených prezentačních prvcích; databázové schéma se nemění.
- Výpočet leasingového nájezdu zůstane založený na současném společném modulu; doplní se jen agregace pro souhrn a grafy.
- Barvy budou vedené přes existující sémantické tokeny projektu, nikoli hodnotami převzatými napevno z prototypu.
- Grafy zůstanou na Recharts.
- Zamezit duplicitnímu zobrazení stejného termínu současně v notifikační liště a prioritním seznamu.
- Ověřit načítání, prázdné stavy, dlouhé názvy vozidel a rozložení na desktopu i užších obrazovkách.
