# Vizuální vylepšení hlavičky detailu vozidla

Zvolený směr: **Premium hlavička s alert bloky** — kartový blok s barevným levým pruhem, kruhovou ikonou vozu, SPZ jako plackou, metadaty vedle sebe a akčními tlačítky vpravo. Ponecháváme existující notifikační pruhy a využijeme je jako alert bloky v novém stylu.

Cíl: sjednotit hlavičku detailu vozidla s nedávno překreslenými kartami v tabu Údaje. Jen prezentační vrstva — data, pole ani ukládání se nemění.

## Co se změní

**1. Hlavičkový blok**
- Celá hlavička se obalí do kartového bloku s jemným stínem, zaoblením a barevným levým pruhem.
- Barevný pruh bude primární červená (`--primary`) pro aktivní vozidla, případně se odvíjí od stavu (pro vyřazená vozidla šedá/destruktivní).
- Vlevo ikona vozu v kruhu (styl karet) — `Car` z lucide.
- Název vozu jako větší tučný titulek, vedle něj stavový badge (aktivní/vyřazené).
- SPZ jako samostatná placka (znovupoužití `PlateBadge`) v metadatovém řádku.
- Správce, model a aktuální nájezd s datem zůstanou v jednom řádku s malými ikonami, decentní šedí.
- Akce Upravit / Smazat zůstanou vpravo, zachováme existující dialogy a chování.

**2. Notifikace / alert bloky pod hlavičkou**
- Stávající `VehicleNotifications` (zelená karta, leasing apod.) se překreslí do stejného stylu alert bloků jako v kategoriích karet: barevné kroužky s ikonami, podbarvený blok, datum a tlačítko Info.
- Zachováme barevné kódy: modrá/info pro běžné upozornění, žlutá pro termíny končící brzy, červená pro prošlé.
- Ponecháme logiku výpočtu dnů a zobrazení data, jen převedeme na kartový vzhled.

**3. Responzivita a mobilní zobrazení**
- Na desktopu se metadata a tlačítka zobrazí vedle sebe, na mobilu pod sebou.
- SPZ zůstane viditelná i na úzkých obrazovkách.
- Název vozu se zalamuje při nedostatku místa.

**4. Pohyb a stavy**
- Jemný hover efekt celé hlavičky (mírné zvednutí stínu) ve shodě s kartami.
- Zachováme stávající hover stavy u tlačítek.

## Technické poznámky

- Dotčené soubory: `src/pages/VehicleDetail.tsx` (hlavička a notifikace), případně drobná rozšíření `src/components/vehicle/InfoCard.tsx` pokud bude potřeba sdílená komponenta pro alert blok.
- Vše přes sémantické tokeny z `src/index.css` (červeno-šedá identita), žádné natvrdo zadané barvy. Prototyp používal zelenou/emerald — tu převedeme na šedou/červenou paletu aplikace.
- Režim úprav (editace polí) zůstává funkčně stejný, jen se zachová vizuální rám hlavičky.
- Stávající `VehicleNotifications` nebo notifikační data zůstanou, pouze se převedou na kartový vzhled.
