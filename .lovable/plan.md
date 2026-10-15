# Sjednocení barev všech PDF výstupů

## Cíl
Všechny PDF dokumenty budou používat vaši firemní **červenou #C82127 a tmavě šedou #565656**, s bílým a světle šedým pozadím pro dobrou čitelnost i tisk.

## Co upravíme
- **Kvartální report, tankování a servisy:** shodné červené hlavičky tabulek s bílým textem, tmavě šedý běžný text a střídání bílých a světle šedých řádků.
- **Cestovní příkazy:** stejná paleta ve všech tabulkách, nadpisech, součtech i podpisových a oddělovacích linkách.
- **Karta vozidla a list QR kódů:** červené nadpisy nebo akcenty, šedé popisky a jemné šedé rámečky. Samotné QR kódy zůstanou černobílé kvůli spolehlivému načítání.
- Barvy budou stejné bez ohledu na světlý či tmavý režim aplikace.

## Zachováme
Obsah, výpočty, českou diakritiku, rozložení dokumentů, názvy souborů a stávající možnosti stažení. Bez změn CSV, Excelu nebo vzhledu aplikace; bez přidávání loga.

## Technické řešení
- Zavést společné PDF barevné tokeny v globálním stylu a pomocný modul pro jejich převod do barev používaných PDF generátory; použít přesné firemní odstíny, nikoli zaokrouhlené barvy motivu obrazovky.
- Společné styly použít v `src/lib/report/tablePdf.ts`, `src/pages/FleetReport.tsx`, `src/lib/travel/pdf.ts` a obou exportech v `src/lib/vehicle/cardPdf.ts`.
- Explicitně nastavit hlavičky, běžné řádky, střídání řádků a linky, aby žádná tabulka nepřebírala výchozí barevnou paletu knihovny.
- Zapsat pravidlo společného PDF stylu do architektonických pokynů projektu.

## Ověření
- Stáhnout všechny uvedené typy PDF přes aplikaci s dostupnými skutečnými záznamy a zkontrolovat výsledné dokumenty, nejen tlačítka.
- Ověřit barvy, čitelnost českého textu a návaznost tabulek na více stránkách; chybějící typ skutečného záznamu případně ověřit odděleným testovacím vstupem a tuto hranici uvést.
- Zkontrolovat, že se obsah a součty nezměnily a že QR kódy zůstaly čitelné.