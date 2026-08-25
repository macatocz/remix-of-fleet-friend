# Co zapracovat z Fleetio do CMFleet

Cíl: doplnit do produktové verze funkce, kterými Fleetio předbíhá běžnou evidenci vozidel, a posunout se ze "seznamu aut" směrem k "řízení životního cyklu vozového parku".

## Co Fleetio dělá dobře (shrnutí průzkumu)

- **Maintenance-first** platforma — servisní zakázky jsou jádrem, ne vedlejší záznam.
- Cena ~4 USD/vozidlo/měsíc, neomezení uživatelé, mobilní aplikace Fleetio Go.
- Silné oblasti: servisní zakázky se stavy, sklad náhradních dílů, digitální inspekce (DVIR), otevřené API + webhooky, marketplace integrace (telematika, palivové karty, mýtné), vlastní pole, TCO reporting, životní cyklus vozidla.
- Slabina: nemá vlastní GPS/telematiku, spoléhá se na Samsara, Geotab, Motive.

## Aktuální stav CMFleet (co už máme)

- Evidence vozidel, řidičů, rezervací, kalendář, kniha jízd, servisní záznamy, škody, náklady, tankovací karty, cestovní příkazy, leasing, dokumenty, QR kódy, notifikace, reporty, PWA mobilní aplikace, role, RLS.

## 9 mezer a návrh jejich zapracování

### 1. Servisní zakázky se workflow
Nová tabulka `work_orders` s životním cyklem: naplánováno → přijato do servisu → v servisu → hotovo → zfakturováno.
- Propojení s vozidlem, přiřazení technika/servisu, odhad a skutečné náklady, fotky, poznámky.
- Vytvoření zakázky přímo z prošlé STK, kontroly vozidla nebo škody.

### 2. Evidence náhradních dílů
Tabulka `parts_inventory` se základním skladem: díl, množství, minimální zásoba, cena, dodavatel.
- Výdej na servisní zakázku, automatické snížení stavu.
- Upozornění při podzásobění.

### 3. Digitální inspekce vozidla (DVIR) s fotkami
Rozšířit stávající `vehicle_checklists` o šablony kontrol (před jízdou, po jízdě, technická kontrola).
- Každý bod: OK / Vada / N/A, foto důkazu, poznámka.
- Z vady rovnou vytvořit servisní zakázku nebo upozornit správce vozu.
- Mobilní optimalizace — technik řeší přímo na telefonu.

### 4. REST API + webhooky
Otevřít data produktu přes API s dokumentací a klíči.
- Webhooky pro události: nová rezervace, změna stavu zakázky, upozornění na STK, nový záznam v knize jízd.
- Rate limiting a správa tokenů v nastavení.

### 5. Integrace marketplace (začít lokálně)
- **České palivové karty (CCS, Shell)** — automatický import transakcí tankování do nákladů a knihy jízd.
- **Telematika** — Samsara, Geotab, OwnTracks — stáhnout najeté km a polohu vozidla.
- **Mýtné** — import průjezdů pro dálniční známky / mýtné transakce.
- ERP integrace (např. Pohoda, Money) — export faktur servisu.

### 6. TCO reporting a predikce životního cyklu
Rozšířit reporty o Total Cost of Ownership:
- Pořizovací cena / leasing, náklady na provoz, servis, PHM, pojištění, mýtné, odpisy.
- Náklady na km a porovnání vozidel ve flotile.
- Predikce: kdy se vozidlo vyplatí prodat/vyměnit (lifecycle replacement).

### 7. Konfigurovatelné vlastní pole
Uživatel si sám definuje extra pole na vozidle, řidiči, servisu nebo zakázce.
- Typy: text, číslo, datum, ano/ne, výběr.
- Použitelné ve filtrech a reportech.
- Umožní přizpůsobit produkt různým typům flotil (nákladní auta, stavební stroje, osobní vozy).

### 8. Mobilní role technika / skladníka
Rozšířit mobilní aplikaci mimo řidiče a správce:
- **Technik** — přijímá zakázky, doplňuje stav, nahrává fotky, vydává díly.
- **Skladník** — pohyby skladu, kontrola zásob, příjem zboží.
- Jednoduché notifikace „máš novou zakázku“.

### 9. Cenový model per vozidlo
Zvažovat prodejní stupně podle počtu vozidel (do 20 / do 50 / do 100 / enterprise).
- Základní balíček: evidence + rezervace + kniha jízd.
- Vyšší balíčky: servisní zakázky, sklad, API, integrace, TCO reporty.

## Navrhované pořadí implementace

### Fáze 1 — Servisní workflow (základ konkurenceschopnosti)
- Servisní zakázky (`work_orders`).
- Digitální inspekce vozidla s fotkami a napojením na zakázky.
- Evidence náhradních dílů a jejich výdej na zakázky.

### Fáze 2 — Integrace a API (otevření produktu)
- REST API + webhooky.
- Import transakcí z českých palivových karet (CCS, Shell).
- TCO reporting a predikce životního cyklu.

### Fáze 3 — Pokročilá přizpůsobení a prodejní model
- Vlastní pole na vozidlech, řidičích a zakázkách.
- Mobilní role technika/skladníka.
- Marketplace integrace (telematika, ERP, mýtné).
- Per-vozidlové tarify ve Stripe.

## Kde to udělat

Tyto funkce patří do **nového produktového projektu** (remixnutá verze), nikoli do interní CM verze. Interní CM aplikace zůstává beze změny — produkt vzniká odděleně s multi-tenant architekturou a novou značkou.

## Doporučený první krok

Začít Fází 1: servisní zakázky + inspekce + sklad dílů. To dává největší obchodní hodnotu a využije stávající servisní záznamy a kontrolní seznamy, které už v CMFleet máme.
