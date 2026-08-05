# Grafické vylepšení karty vozidla (tab Údaje)

Cíl: přehledy na detailu vozidla udělat vizuálně přitažlivější a čitelnější. Jen prezentační vrstva — data, pole ani ukládání se nemění.

## Co se změní

**1. Hlavička karet**
- Každá sekce dostane ikonu v jemném barevném kroužku (Základní informace = auto, Leasing = smlouva, Dokumenty a kontroly = štít, Provozní údaje = nastavení, QR = kód).
- Tenký barevný pruh nahoře karty podle sekce (červená / antracit) místo dnešní ploché bílé.
- Nadpis větší, s jemným oddělovačem pod ním.

**2. Řádky s údaji**
- Střídavé jemné podbarvení řádků + zvýraznění při najetí myší, aby oko drželo řádek přes celou šířku.
- Hodnota tučně, popisek decentně šedý (dnes je popisek příliš výrazný).
- Prázdné hodnoty jednotně jako "—" ve slabé šedi.

**3. Zvýraznění klíčových údajů**
- RZ jako výrazný "štítek" (monospace, rámeček) — je to nejhledanější údaj.
- ANO/NE hodnoty (Malý TP, Tankovací karty, Lékárnička…) jako zelený/šedý badge místo textu.
- Datumy platnosti (STK, zelená karta, leasing do, v užívání do) barevně podle zbývající doby: po termínu = červená, do 30 dní = jantarová, jinak neutrální — vč. drobného textu „za 4 měsíce“.
- Kategorie A–D jako barevný badge s popiskem role (A – Ředitel atd.).
- Ceny a km zarovnané a formátované jednotně (mezera po tisících, „Kč“ / „km“ menším písmem).

**4. Leasing — mini vizualizace**
- Do karty Leasing malý progress pruh čerpání nájezdu (výchozí → konečný stav tachometru) a pruh uplynulé doby leasingu, se zbývajícími měsíci.

**5. Rozvržení**
- Karty stejné výšky v řádku, jemný stín a zaoblení, hover mírné zvednutí.
- QR karta kompaktnější a posunutá jako poslední, na celou šířku pod ostatní.
- Taby nahoře: aktivní tab podbarvený primární barvou místo bílého rámečku.

## Technické poznámky
- Dotčené soubory: `src/pages/VehicleDetail.tsx` (komponenty `EditableCard`, `FieldRow`) a nová sdílená komponenta `src/components/vehicle/InfoCard.tsx` + drobné formátovací helpery.
- Vše přes sémantické tokeny z `src/index.css` (červeno-šedá identita), žádné natvrdo zadané barvy.
- Režim úprav (editace polí) zůstává funkčně stejný, jen zdědí nový vzhled.
