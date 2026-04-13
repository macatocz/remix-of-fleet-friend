
# Správa vozového parku — Plán implementace

## Přehled
Moderní webová aplikace pro kompletní správu vozového parku (20–100 vozidel) s víceuživatelským přístupem, rolemi a dashboardem s grafy a statistikami.

## 1. Autentizace a role uživatelů
- Přihlášení e-mailem a heslem přes Lovable Cloud
- Tři role: **Admin** (plná správa), **Dispečer** (přiřazování vozidel, rezervace), **Řidič** (prohlížení svých vozidel, hlášení závad)
- Tabulka `user_roles` s RLS politikami

## 2. Databáze — hlavní tabulky
- **vehicles** — SPZ, značka, model, rok výroby, VIN, typ paliva, stav (aktivní/v servisu/vyřazeno), fotka
- **drivers** — jméno, telefon, e-mail, řidičský průkaz, propojení s auth uživatelem
- **vehicle_assignments** — přiřazení řidiče k vozidlu (od–do)
- **reservations** — rezervace vozidla (kdo, kdy, účel)
- **service_records** — servisní záznamy (typ, datum, náklady, popis)
- **inspections** — STK a emise (datum, platnost do)
- **insurance** — pojistné smlouvy (typ, pojišťovna, platnost)
- **fuel_logs** — tankování (datum, litry, cena, km)
- **costs** — souhrnné náklady (kategorie, částka, datum)

## 3. Dashboard (hlavní stránka)
- Přehledové karty: celkem vozidel, aktivních, v servisu, blížící se STK/pojištění
- Graf nákladů za posledních 12 měsíců (sloupcový)
- Graf spotřeby PHM (čárový)
- Seznam upozornění (expirující STK, pojištění, plánované servisy)

## 4. Správa vozidel
- Tabulka s filtrováním a vyhledáváním (značka, stav, SPZ)
- Detail vozidla — všechny údaje, historie servisu, tankování, náklady
- Formulář pro přidání/úpravu vozidla

## 5. Správa řidičů
- Seznam řidičů s přiřazenými vozidly
- Detail řidiče — kontakt, přiřazená vozidla, historie

## 6. Rezervace vozidel
- Kalendářový přehled dostupnosti
- Formulář pro vytvoření rezervace
- Schvalování rezervací (dispečer/admin)

## 7. Servis a údržba
- Plánování servisů s upozorněními
- Evidence STK a pojištění s datem expirace
- Historie oprav a nákladů na vozidlo

## 8. Evidence PHM a nákladů
- Záznam tankování (datum, litry, cena, najeté km)
- Přehled nákladů podle kategorie a vozidla
- Měsíční/roční reporting

## 9. Navigace a layout
- Postranní sidebar s ikonami: Dashboard, Vozidla, Řidiči, Rezervace, Servis, Náklady, Nastavení
- Responzivní design pro desktop i tablet
- Český jazyk v celém rozhraní

## 10. Design
- Moderní dashboard styl s barevnými kartami a grafy (Recharts)
- Tmavě modrá / bílá barevná paleta
- Shadcn UI komponenty (tabulky, karty, formuláře, dialogy)
