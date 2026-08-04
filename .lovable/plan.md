# Bezpečnostní kontrola a zpřísnění přístupu k datům

## Zjištění

Kontrola databáze potvrdila hlavní problém: **téměř všechny tabulky mají čtení nastavené na "kdokoli přihlášený vidí vše"** (politika `read_authenticated` s podmínkou `true`). Zápis je naopak správně omezen na Admina/Dispečera.

Prakticky to znamená, že běžný řidič si přes API může přečíst:
- telefony, e-maily a poznámky všech řidičů,
- **čísla tankovacích karet včetně PINů** (nejzávažnější),
- cesťáky, výdaje a účtenky všech zaměstnanců,
- všechny nehody a předávací protokoly,
- leasingové ceny, VIN a vlastnictví všech vozidel,
- e-maily a jména ostatních uživatelů,
- firemní kontakty a finanční sazby.

Databázový linter navíc hlásí 3 upozornění na SECURITY DEFINER funkce a 1 na rozšíření v `public` schématu.

## Návrh úprav (migrace RLS)

Zavedeme jednotné pravidlo: **Admin/Dispečer vidí vše, řidič jen to, co potřebuje ke své práci.**

| Oblast | Nové pravidlo čtení |
|---|---|
| Tankovací karty | Admin/Dispečer; řidič jen kartu vozu, který má právě aktivní schválenou rezervaci (už existující logika) |
| Řidiči | Admin/Dispečer; řidič vidí sebe + jen jméno/příjmení ostatních (bez telefonu, e-mailu, poznámek) přes bezpečný pohled pro výběr ve formulářích |
| Profily | Vlastní profil + Admin |
| Cesťáky (příkazy, etapy, stravné, výdaje) | Admin/Dispečer nebo řidič, kterého se příkaz týká |
| Nehody a předávací protokoly (vč. fotek) | Admin/Dispečer nebo řidič dané události/vozidla |
| Firemní nastavení | Sazby čte kdokoli (potřeba pro výpočet cesťáku), kontakty a IČO/DIČ jen Admin/Dispečer |
| Vozidla | Základní údaje (název, RZ, značka, stav, lokalita) všem přihlášeným — potřeba pro rezervace; leasing, VIN, ceny jen Admin/Dispečer |

Ostatní tabulky (rezervace, kniha jízd, servis, STK, pojištění, dokumenty, kurzy měn) necháme čitelné pro přihlášené — jsou to provozní data celého vozového parku.

Dále:
- Prověříme SECURITY DEFINER funkce a odebereme `EXECUTE` těm, které nemá volat klient (interní trigger funkce). `has_role`, `is_driver_id`, `is_driver_named` zůstanou — používají se v RLS.
- Rozšíření v `public` schématu vyhodnotíme; pokud jde o Supabase systémové rozšíření, ponecháme a označíme jako přijaté riziko.

## Technická část

- Jedna migrace: nahrazení `read_authenticated` politik cílenými `SELECT` politikami s `has_role(auth.uid(), 'admin')`, `has_role(auth.uid(), 'dispatcer')`, `is_driver_id()` / `user_id = auth.uid()`.
- Pro vozidla a řidiče vznikne pohled (`view`) s omezenou sadou sloupců pro nepřivilegované role, aby formuláře a mobilní seznamy dál fungovaly.
- Po migraci projdu frontend (`Drivers.tsx`, `FuelCards.tsx`, `VehicleDetail.tsx`, `TravelOrders*.tsx`, mobilní stránky) a přepnu dotazy tam, kde by řidič nově dostal prázdný výsledek.
- Ověření: znovu spustím bezpečnostní sken a linter, plus test přihlášení jako řidič.
