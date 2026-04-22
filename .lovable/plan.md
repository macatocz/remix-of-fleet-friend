

## Modul „Cestovní příkaz"

Přidám nový modul, který z dat aplikace (vozidlo, řidič, jízdy z knihy jízd) vygeneruje vyplněný **cestovní příkaz** ve stylu cestak.com — k tisku/PDF a k uložení historie.

### Co uvidí uživatel

**Nová stránka `/cestovni-prikazy`** (v menu „Cestovní příkazy" 📋):

- Seznam vystavených příkazů: číslo, řidič, vozidlo, datum od–do, účel, stav (koncept / schválený / vyúčtovaný), částka náhrad
- Tlačítko **„+ Nový cestovní příkaz"**
- Filtry: řidič, vozidlo, období, stav

**Formulář (dialog / stránka detailu)** — sekce dle běžného CP:

1. **Hlavička**: číslo (auto), datum vystavení, účel cesty, schvaluje (jméno)
2. **Cestující**: řidič (z `drivers`) → auto-doplnění bydliště, oddělení
3. **Vozidlo**: výběr z `vehicles` → RZ, značka, typ paliva, prům. spotřeba
4. **Trasa & čas**:
   - Místo nástupu / cíl, datum + čas odjezdu / příjezdu
   - Tlačítko **„Načíst z knihy jízd"** — předvyplní řádky tras z `trip_logs` za zvolené období + vůz
5. **Dopravní prostředek**: vlastní vůz / služební / MHD / vlak (volitelné kombinace)
6. **Stravné** (tuzemsko / zahraničí)**:
   - Automatický výpočet podle délky pobytu a sazeb (vyhláška MPSV — sazby uložené v `app_settings`)
7. **Náhrada za vozidlo** (jen u vlastního/služebního s nárokem):
   - Km × sazba za km + spotřeba × cena PHM (z trip_logs / z nastavení)
8. **Další výdaje**: parkovné, dálnice, ubytování (řádky s částkou + popis)
9. **Souhrn**: stravné + km náhrady + výdaje − záloha = **k vyplacení / vrácení**
10. **Akce**: Uložit koncept · Schválit · **Tisk / Stáhnout PDF** · Duplikovat

### Výstup PDF

- Layout 1:1 podle ČR standardu (jako cestak.com): hlavička firmy z `company_settings`, tabulka tras, výpočty, podpisové pole
- Generováno klientsky pomocí `jspdf` + `jspdf-autotable` (žádný server navíc)
- Soubor: `CP-{cislo}-{prijmeni}.pdf`

### Datový model (nové tabulky)

```text
travel_orders
  id, number (auto), status, created_at, updated_at
  driver_id, vehicle_id, purpose
  date_from, time_from, date_to, time_to
  place_from, place_to
  transport_mode (jsonb: ['vlastni','sluzebni','mhd','vlak'])
  advance_payment, approved_by, approved_at, notes

travel_order_legs       (jednotlivé úseky trasy)
  id, travel_order_id, date, time_from, time_to,
  place_from, place_to, km, transport, note

travel_order_expenses   (parkovné, dálnice, ubytování…)
  id, travel_order_id, type, description, amount, currency, receipt_path

travel_order_meals      (stravné — řádek za den/úsek)
  id, travel_order_id, date, hours, country, rate, amount

app_settings keys:
  travel.km_rate_personal     (Kč/km — sazba základní)
  travel.km_rate_average_fuel (Kč/l — průměr PHM ČR aktuální)
  travel.meal_rates_cz        (jsonb: pásma 5–12h, 12–18h, >18h)
```

RLS: `authenticated` může CRUD (stejný vzor jako `service_records`).

### Mobilní verze `/m/cestovni-prikazy`

- Kartový seznam + tlačítko „+"
- Zjednodušený formulář — krokový (Wizard: Cesta → Trasa → Stravné → Výdaje → Souhrn)

### Technická realizace

1. **Migrace**: 4 nové tabulky + RLS + default sazby do `app_settings`
2. **Soubory**:
   - `src/pages/TravelOrders.tsx` — seznam + filtry (desktop)
   - `src/pages/TravelOrderDetail.tsx` — formulář + výpočty + PDF
   - `src/pages/mobile/MobileTravelOrders.tsx` — mobilní seznam
   - `src/components/travel/TravelOrderForm.tsx` — sdílený formulář
   - `src/components/travel/TravelOrderPDF.ts` — generátor PDF (jspdf)
   - `src/lib/travel/calc.ts` — výpočty stravného, km náhrad, sumarizace
3. **Routing** v `App.tsx`: `/cestovni-prikazy`, `/cestovni-prikazy/:id`, `/m/cestovni-prikazy`
4. **Sidebar** + mobilní „Více" → položka 📋 Cestovní příkazy
5. **Závislosti**: `jspdf`, `jspdf-autotable` (klient-side, žádný API key)
6. **Integrace s knihou jízd**: tlačítko „Načíst z knihy jízd" agreguje `trip_logs` podle vozidla + období do řádků trasy

### Co se NEMĚNÍ

- Existující moduly (kniha jízd, vozidla, řidiči, náklady) — beze změny
- Datový model existujících tabulek — beze změny

### Mimo scope (řekni, jestli přidat)

- **Zahraniční stravné** s měnami a kurzy ČNB (zatím jen tuzemsko)
- **Schvalovací workflow** (více schvalovatelů, e-mail notifikace)
- **Export do účetnictví** (Pohoda / Money / ABRA — XML/CSV)
- **Foto účtenek** přes mobil ke každému výdaji (storage bucket)
- **Automatické propojení s náklady** (`/naklady`) — přepsat schválený CP do nákladů vozidla

