# Vybrané funkce k zapracování

Prošel jsem kód a databázi — část vybraných bodů je už hotová. Níže je jen to, co skutečně zbývá, plus poznámka u bodů, které jsou dokončené.

## Co je už hotové (ověřeno)

- **Bod 3 (účel jako výběr)** a **bod 6 (limity rezervací)** — Pracovně / Soukromě / Jiné i kontrola 21 dní dopředu a měsíčního limitu soukromých jízd fungují v hlavních rezervacích, v kalendáři vozidla i v mobilním formuláři.
- **Bod 8 (notifikace k cesťáku)** — na pozadí běží denní úloha v 6:30, která u schválených rezervací delších než 5 hodin upozorní řidiče na cestovní příkaz. Hotovo, nic nezbývá.
- **Bod 2 (název + SPZ)** — všechny rezervační formuláře a filtry už nabízejí „Název vozu — RZ“.
- **Bod 12 (hromadné operace)** — hromadná změna stavu, správce a kategorie i export do XLSX ve výpisu vozidel existují.

## Co zbývá udělat

### 1. Rezervace „teď hned“ (dopnění bodů 2, 3, 6)
Rychlá mobilní rezervace je jediné místo, kde chybí účel jako výběr a kontrola limitů.
- Přidat výběr **Pracovně / Soukromě / Jiné** (u „Jiné“ doplňující text).
- Uložit `purpose_type` stejně jako v ostatních formulářích.
- Doplnit kontrolu limitu soukromých jízd (limit 21 dní dopředu se u okamžité rezervace neuplatní).

### 2. Sjednocení názvů vozidel mimo rezervace (dokončení bodu 2)
Výběry vozidel na stránkách **Servis**, **Náklady**, **Škody** a **Řidiči** stále ukazují „Značka (RZ)“. Přepnout je na stejný formát „Název vozu — RZ“ jako v rezervacích.

### 3. Hromadné operace — doplnění (bod 12)
- Přidat hromadnou změnu **lokality**.
- Přidat **hromadný export QR kódů** vybraných vozidel do jednoho tiskového PDF (mřížka QR kódů s názvem vozu a RZ).

### 4. Karta vozidla do PDF (bod 13)
Nové tlačítko „Tisk karty vozidla“ v detailu vozu, které vygeneruje A4 PDF:
- hlavička s názvem vozu, RZ a značkou/modelem,
- QR kód pro rychlé otevření karty v mobilu,
- správce a hlavní uživatel včetně kontaktu,
- kategorie, lokalita, VIN, typ vlastnictví,
- platnost STK, pojištění, dálniční známky,
- místo uskladnění pneu, náhradní klíč, parkovací stání.

Použije se stejný generátor PDF s českou diakritikou jako u cestovních příkazů.

### 5. Notifikace o schválení / zamítnutí rezervace (bod 14)
- Při změně stavu rezervace na **schváleno** nebo **zamítnuto** odeslat řidiči notifikaci (v aplikaci i push).
- U zamítnutí přenést i důvod, pokud je vyplněn.
- Přidat **připomenutí před začátkem rezervace** — denní úloha, která ráno upozorní na rezervace začínající tentýž den.
- Oba typy zařadit mezi přepínatelné druhy notifikací v Nastavení.

### 6. Kvartální report vozového parku (bod 18)
Nová stránka **Reporty** v hlavním menu s výběrem čtvrtletí a roku:
- souhrn: celkové náklady, náklady na km, ujeté km, počet jízd, počet rezervací,
- rozpad nákladů na PHM a servis po měsících,
- vytížení vozidel (počet rezervovaných dní vůči dostupným),
- podíl pracovních a soukromých jízd,
- čerpání leasingového nájezdu u vozů na operativním leasingu,
- žebříček nejdražších a nejvytíženějších vozidel,
- porovnání s předchozím čtvrtletím (rozdíl v %),
- export do PDF a do XLSX.

## Technické poznámky

- Notifikace o rezervacích využijí stávající `notify()` a funkci `notify-send`; připomenutí před jízdou poběží jako nová naplánovaná denní úloha po vzoru `notify-travel-orders`.
- PDF karta vozidla a kvartální report použijí `jspdf` a stávající font s českou diakritikou (`src/lib/travel/pdfFont.ts`).
- Kvartální report čte z existujících tabulek (kniha jízd, servis, rezervace, vozidla) — bez změn schématu.
- Hromadná změna lokality a export QR jsou čistě frontendové rozšíření stávajícího výběru ve výpisu vozidel.
- Reporty budou dostupné jen pro Admina a Dispečera.
