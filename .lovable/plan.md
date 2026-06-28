## Cíl
Opravit českou diakritiku v PDF exportu cestovního příkazu a doladit drobné nedostatky výstupu.

## Problém
`src/lib/travel/pdf.ts` používá výchozí font jsPDF **Helvetica**, který je WinAnsi-kódovaný a neumí české znaky (ř, š, ě, č, ů, ž…). V PDF se zobrazují jako otazníky nebo prázdné obdélníky. Stejný problém má i `TripLogExport`, ale ten exportuje do XLSX (Excel), takže ho neřeším.

## Řešení diakritiky
Vložit do jsPDF Unicode TTF font a používat ho pro celý dokument.

1. Přidat balíček s otevřeným fontem podporujícím českou diakritiku (DejaVu Sans / Roboto / Noto Sans). Doporučuji **`@fontsource/roboto`** (běžně používaný, čistá licence Apache 2.0, váhy 400/700) — soubory TTF natáhneme jako Base64 jen jednou při generování PDF.
2. Vytvořit nový helper `src/lib/travel/pdfFont.ts`:
   - načte TTF (Roboto Regular + Bold) jako base64 (přes `fetch` lokálního assetu nebo statický import),
   - zaregistruje fonty přes `doc.addFileToVFS` + `doc.addFont` jako "Roboto" normal/bold,
   - vrátí název fontu k použití.
3. V `generateTravelOrderPDF` po inicializaci `doc` zavolat helper a nastavit `doc.setFont("Roboto","normal")`. Všechna místa kde se teď volá `setFont("helvetica", ...)` přepnout na `"Roboto"`. Pro autoTable nastavit `styles.font = "Roboto"` a `headStyles.font = "Roboto"` (bold) v každém volání (uděláme přes společný default objekt).

## Další zjištěné nedostatky v PDF
1. **Překryv hlavičky** – titulek "CESTOVNÍ PŘÍKAZ" se vykresluje na `y+4`, ale firemní info zabírá `y..y+8`. Při delší adrese se texty překryjí. Posunout titulek do pravého horního bloku nebo zvýšit volné místo (start tabulky až po `max(headerEnd, titleEnd)+6`).
2. **Chybí stránkování** – u dlouhých cest přeteče obsah na další stranu bez čísla stránky / patičky. Přidat `doc.setPage` loop na konci: `"Strana X / Y · č. <number>"`.
3. **Podpisové bloky mimo stranu** – kontrola `if (y > 250)` ale 4 bloky potřebují ~44 mm; zvednout práh na 230 a force `addPage` když se nevejdou všechny 4.
4. **Měna `formatCurrency`** – ověřit, že `Intl.NumberFormat("cs-CZ")` vrací znaky jako `Kč`, `€` korektně (Roboto je obsahuje, takže OK po fix #1).
5. **Prázdné sekce** – pokud nejsou žádné výdaje / stravné, vykreslí se tabulka jen s hlavičkou. Místo toho vypsat "—" (jako už děláme u `legs`).
6. **Souhrn `EUR→CZK`** – ostatní měny než EUR/CZK se v `totalCzk` neberou v potaz (komentář říká "1:1 orientačně", ale ve skutečnosti je vůbec nepřičítá). Buď je započítat 1:1 a označit hvězdičkou, nebo do textu pod tabulkou připsat poznámku "Ostatní měny nejsou přepočteny".
7. **Telefon souboru** – `doc.save()` se v komponentě volá s názvem; ověřit, že název obsahuje `number` bez diakritiky (čísla cesťáků jsou ASCII, OK).

## Technické změny – seznam souborů
- `package.json` — přidat `@fontsource/roboto` (nebo stáhnout TTF do `src/assets/fonts/`).
- `src/lib/travel/pdfFont.ts` — **nový**, registrace Roboto Regular + Bold do jsPDF.
- `src/lib/travel/pdf.ts` — async init fontu, všechny `setFont` → Roboto, sdílený default pro autoTable, stránkování v patičce, ošetření prázdných tabulek, oprava překryvu titulku, poznámka u přepočtu měn, zvednutý práh na podpisové bloky.
- `src/pages/TravelOrderDetail.tsx` a `MobileTravelOrders` (pokud volají `generateTravelOrderPDF` synchronně) — upravit volání na `await generateTravelOrderPDF(...)`, protože načtení fontu bude async.

## Verifikace
1. Vygenerovat PDF u existujícího příkazu `34ab798d-…` (aktuálně otevřený).
2. Stáhnout PDF a vizuálně zkontrolovat: české znaky v hlavičce, jménech, popiscích tabulek, měně `Kč`.
3. Vytvořit dlouhý záznam s 15+ legs a ověřit stránkování a podpisové bloky.
