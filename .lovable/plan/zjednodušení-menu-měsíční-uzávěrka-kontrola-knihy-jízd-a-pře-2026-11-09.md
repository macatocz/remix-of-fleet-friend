# Zjednodušení menu + měsíční uzávěrka, kontrola knihy jízd a předání vozu

## 1. Nové menu (místo 11 položek 7)
1. Přehled
2. Vozidla
3. Kniha jízd (nahoře výběr vozidla; import, generátor, export)
4. Řidiči a rezervace (dvě záložky)
5. Servis a škody (dvě záložky)
6. Finance a reporty (záložky: Náklady, Report, Přehled tankování, Tankovací karty, Cestovní příkazy)
7. Nastavení

Staré adresy (např. /naklady, /skody) dál fungují a přesměrují na správnou záložku, aby nepřestaly fungovat odkazy a QR kódy. Mobilní menu se upraví stejně.

## 2A. Měsíční uzávěrka pro účetní
Tlačítko „Stáhnout měsíční uzávěrku“ ve Finance a reporty: výběr měsíce, stáhne ZIP s
- souhrnem nákladů (PHM + servis) v PDF a Excelu,
- oficiální knihou jízd každého auta (Excel),
- schválenými cestovními příkazy (PDF),
- fotkami účtenek seřazenými podle data a auta.

## 2B. Kontrola knihy jízd před exportem
Tlačítko „Zkontrolovat“ v Knize jízd. Upozorní na:
- služební jízdy o víkendu a ve státní svátek,
- nereálnou průměrnou rychlost (nad 130 km/h),
- nenavazující tachometr,
- tankování o víkendu bez jízdy v ten den.
Jen upozorní, nic samo neopravuje.

## 2C. Předání vozu na mobilu s fotkami
Na mobilní kartě auta tlačítko „Předat / převzít“: stav tachometru, palivo, 2–3 fotky z kamery v aplikaci (stejná, jaká je u tankování), poznámka. Uloží se do existujícího předávacího protokolu a fotky k dokumentům vozu.

## Odhad kreditů (orientační)
- Menu: cca 5–8
- Měsíční uzávěrka: cca 8–12
- Kontrola knihy jízd: cca 4–6
- Předání na mobilu: cca 5–8
- Celkem zhruba 22–34 kreditů, včetně ověření. Skutečná spotřeba záleží na počtu oprav a dalších požadavků.

## Technické poznámky
- Nové stránky skládají existující stránky jako záložky (Tabs, záložka v URL ?tab=).
- ZIP přes JSZip v prohlížeči, znovupoužití TripLogExport, PDF theme a fuel_records/vehicle_documents.
- Kontrola: čistá funkce v src/lib/tripLog/audit.ts + testy (víkend, svátek, rychlost, mezera tachometru).
- Předání: rozšíření stávající tabulky protokolů, InAppCamera + draftPhotos.
