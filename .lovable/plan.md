# Mobilní zobrazení: Škody a Servis bez vodorovného posouvání

Stejný přístup jako u Nákladů: vlastní mobilní stránky s kartami místo tabulek, vše se vejde do šířky 394 px.

## Škody (/m/skody)
- Nahoře kompaktní dlaždice: počet záznamů, otevřené, odhadované náklady.
- Hledání a filtr stavu pod sebou v plné šířce.
- Každá škoda jako karta: název vozu + RZ, datum, badge stavu, místo, popis (zalomený text), odhad nákladů, tlačítko „Detail vozidla".
- Tlačítko „Nová škoda" nahoře, formulář zůstává stejný dialog.

## Servis (/m/servis)
- Taby Servis / STK / Pojištění (posuvná lišta tabů, obsah se neposouvá).
- Servis: karta = vozidlo, typ, datum, náklad, stav, popis.
- STK: karta = vozidlo, typ, datum, platnost do, výsledek, badge blížící se expirace.
- Pojištění: karta = vozidlo, pojišťovna, typ, č. smlouvy, platnost do, roční náklad.
- Stávající filtry (hledání, vozidlo, stav) v jednosloupcovém rozložení.

## Technické detaily
- Nové soubory `src/pages/mobile/MobileIncidents.tsx` a `src/pages/mobile/MobileService.tsx`.
- V `src/App.tsx` mobilní routy `skody` a `servis` nasměrovat na nové komponenty; desktopové routy beze změny.
- Použití `min-w-0`, `break-words`, `truncate`, `overflow-x-hidden` proti vodorovnému přesahu.
- Datová logika (dotazy, filtry, ukládání) přebrána ze stávajících stránek beze změny chování.