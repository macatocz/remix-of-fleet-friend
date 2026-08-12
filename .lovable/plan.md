# Z interní aplikace komerční produkt

Cíl: z dnešní interní verze CMFleet udělat samostatný produkt pod novou značkou, který lze prodávat více firmám včetně samoobslužného předplatného. Interní verze zůstává beze změny a poběží dál.

## Dvě cesty — porovnání

### A) Jedna sdílená aplikace pro všechny zákazníky (multi-tenant)
Všechny firmy v jedné instanci, data přísně oddělená podle firmy.

- Nová firma = registrace za 2 minuty, žádná ruční práce.
- Jedna oprava/novinka se projeví všem zákazníkům najednou.
- Provozní náklady zůstávají prakticky stejné i při 50 zákaznících.
- Nevýhoda: chyba v pravidlech oddělení dat by mohla ukázat data cizí firmě — vyžaduje pečlivé nastavení a testy.
- Nevýhoda: nelze dělat úpravy „na míru jedné firmě" v databázi, jen konfigurací.

### B) Samostatná kopie pro každého zákazníka
Každá firma dostane vlastní projekt a databázi.

- Maximální izolace dat, jednodušší na start (stačí zkopírovat projekt).
- Nevýhoda: každá aktualizace se musí nasadit ručně do každé kopie — při 5+ zákaznících to je hlavní náplň práce.
- Nevýhoda: samoobslužné předplatné prakticky nejde, zakládání je ruční.
- Nevýhoda: náklady na provoz rostou lineárně s počtem zákazníků.

### Doporučení
Jít cestou A (multi-tenant). Aplikace je už dnes rozsáhlá (20+ stránek, ~30 tabulek) a udržovat její kopie by se rychle stalo neúnosným. Izolaci dat vyřešíme databázovými pravidly na úrovni firmy, stejně jak už dnes řešíme role a přístup k vozidlům. Kopie dává smysl jen jako výjimka pro velkého zákazníka, který si vynutí vlastní databázi — to jde doplnit později.

## Postup

### Fáze 1 — Nový produktový projekt
- Založit nový projekt jako kopii současné aplikace (interní verze zůstane netknutá, včetně dat).
- Nová značka: nový název, logo, barvy vydavatelské společnosti, nový manifest a ikony PWA, nové texty v přihlašovací stránce a návodu k instalaci.
- Vyčistit produktovou verzi od interních specifik (naše pobočky, sazby, testovací data).

### Fáze 2 — Oddělení firem (tenancy)
- Nová tabulka firem (organizací) s názvem, IČO, logem a barvou.
- Každý uživatel patří do právě jedné firmy; role (Admin / Dispečer / Řidič) platí v rámci firmy.
- Ke všem provozním tabulkám (vozidla, rezervace, kniha jízd, škody, servis, karty, cesťáky, dokumenty, nastavení, notifikace) přibude příslušnost k firmě.
- Přepsat přístupová pravidla tak, aby uživatel z principu nemohl vidět nic mimo svou firmu — a doplnit i pravidla pro nahrané soubory a fotky.
- Nastavení, která jsou dnes globální (pobočky, cestovní sazby, upozornění, veřejná URL), se stanou nastavením firmy.

### Fáze 3 — Registrace a onboarding
- Veřejná registrace: zakladatel založí firmu, stane se jejím adminem a dál zve kolegy stávajícím mechanismem pozvánek.
- Průvodce prvním spuštěním: název firmy, logo, pobočky, import vozidel z Excelu (import už máme).
- Zkušební období (např. 14 dní) bez zadání karty.

### Fáze 4 — Předplatné
- Samoobslužné předplatné přes Stripe, měsíční i roční, ceníkové stupně podle počtu vozidel (např. do 20 / do 50 / do 100+).
- Stránka „Předplatné" v nastavení: aktuální tarif, počet vozidel, faktury, změna tarifu, zrušení.
- Po vypršení zkušebního období nebo neplacení se aplikace přepne do režimu jen pro čtení, data se nemažou.

### Fáze 5 — Provoz produktu
- Interní administrace pro vás: seznam firem, počet vozidel a uživatelů, stav předplatného.
- Vlastní doména produktu, e-maily (pozvánky, upozornění) z vaší domény a pod novou značkou.
- Veřejná stránka produktu s ceníkem a odkazem na registraci (může být samostatný projekt).
- Obchodní podmínky, zpracování osobních údajů, kontakt — na samostatných stránkách.

## Technické poznámky
- Tenancy klíč: `organizations` + `organization_id` na všech provozních tabulkách; členství přes `organization_members`, role zůstávají v `user_roles` rozšířené o firmu.
- Pomocná funkce v `private` schématu (např. `current_org_id()`) se použije v RLS všech tabulek, podobně jako dnešní `private.has_role` a `can_access_vehicle`.
- Storage: cesty souborů dostanou prefix s ID firmy, politiky bucketů se na něj navážou.
- Edge funkce (notifikace, kurzy ČNB, pozvánky) se upraví tak, aby pracovaly per firma.
- Předplatné: tabulka `subscriptions` napojená na Stripe + webhook edge funkce; kontrola limitu vozidel při vytváření vozidla.
- Migrace dat se dělat nemusí — produktová verze startuje prázdná, interní zůstává oddělená.

## Otevřené body na později
- Vlastní branding zákazníka (jeho logo v hlavičce a v PDF) — snadné doplnit ve Fázi 2.
- Přihlášení přes Microsoft 365 — pro firemní zákazníky časté, zatím odloženo.
- Varianta „vlastní databáze" pro velkého zákazníka jako prémiový tarif.
