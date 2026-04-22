

## Doplnění cestovního příkazu na úroveň dat ze vzoru

Cíl: cesťák musí obsahovat **všechna data**, která se objevují ve vzoru z Cestak.com (zahraniční stravné, časová pásma, země u úseků, kurzy ČNB, kapesné, spolucestující, podpisový workflow). Vzhled exportu zůstává **náš vlastní** — čistý firemní layout.

### Co bude cesťák nově obsahovat

**Hlavička**
- Cestující (máme) + **spolucestující** (nové, volný text / multi-select řidičů)
- Hlavička firmy z `company_settings` (máme)
- Číslo cesťáku (máme `CP-2026-0001`)

**Průběh cesty (legs) — rozšíření**
- `country` (CZ/SK/DE/AT/…) — povinné
- `timezone` (Europe/Prague, Europe/Bratislava…) — auto podle země
- `crossing_border` (boolean) — pro detekci přechodu hranic

**Stravné (meals) — rozšíření**
- `currency` (CZK/EUR/USD…) — vedle částky
- `pocket_money` (kapesné, % ze stravného, default 0)
- `pocket_money_amount` (vypočtené)
- Automatický výpočet **podle vyhlášky MF ČR**:
  - tuzemské: stávající sazby
  - zahraniční: tabulka denních sazeb podle země (EUR/USD/CHF…)
  - rozdělení dne podle hodin v každé zemi (jako ve vzoru: 18 h v SK + 0 h v CZ)

**Kurzy ČNB**
- Nová tabulka `currency_rates` (datum, měna, kurz, zdroj)
- K cesťáku se uloží **fixní kurz ke dni cesty** (snapshot, aby se nepřepočítával zpětně)
- Tlačítko „Načíst kurz ČNB" v detailu (volá veřejné API ČNB přes edge function)

**Více měn v souhrnu**
- Souhrn rozdělen podle měn (EUR řádek, CZK řádek) jako ve vzoru
- Celkem v CZK přepočtené přes uložený kurz

**Workflow podpisů (4 stavy místo 2)**
- `requested_by` + `requested_at` (žádost vystavil)
- `request_approved_by` + `request_approved_at` (žádost schválil)
- `report_submitted_by` + `report_submitted_at` (výkaz vystavil)
- `report_approved_by` + `report_approved_at` (výkaz schválil)
- Status: `koncept` → `zadost_schvalena` → `vyuctovano` → `schvaleno`

**Nové pole na hlavičce**
- `co_travelers` (text, volitelné)
- `currency_rate_date` (datum kurzu)
- `currency_rate_eur_czk` (snapshot kurzu EUR→CZK)

### Náš vlastní export (PDF)

Přepíšu `src/lib/travel/pdf.ts` tak, aby obsahoval **všechna výše uvedená data**, ale ve **vlastním firemním layoutu** (žádná kopie vzhledu Cestak.com):

1. **Hlavička**: logo + `company_settings`, vpravo číslo cesťáku + status
2. **Cestující + spolucestující + účel + vozidlo**
3. **Průběh cesty**: tabulka s sloupci `Datum | Čas | Země | Místo od | Místo do | km | Doprava`
4. **Stravné**: oddíl pro **tuzemsko** (CZK) a oddíl pro **zahraničí** (po měnách) s mezisoučty
5. **Výdaje**: tabulka s měnou
6. **Souhrn náhrad**: tabulka per měna (Náhr. stravné | Náhr. vozidlo | Vlastní výdaje | Celkem | Záloha | K vyplacení)
7. **Přepočet**: použitý kurz ČNB ke dni X, výsledný součet v CZK
8. **Podpisové bloky** (4): vystavil žádost / schválil žádost / vystavil výkaz / schválil výkaz — se jmény a časovými razítky

Stejný layout pro tisk i pro stažené PDF.

### Technické provedení

**1. Migrace DB** (jedna)
- `ALTER travel_orders` ADD `co_travelers text`, `currency_rate_date date`, `currency_rate_eur_czk numeric`, `requested_by/requested_at`, `request_approved_by/request_approved_at`, `report_submitted_by/report_submitted_at`, `report_approved_by/report_approved_at`
- `ALTER travel_order_legs` ADD `country text default 'CZ'`, `timezone text default 'Europe/Prague'`
- `ALTER travel_order_meals` ADD `currency text default 'CZK'`, `pocket_money_pct numeric default 0`, `pocket_money_amount numeric default 0`
- `ALTER travel_order_expenses` — `currency` už je
- Nová tabulka `currency_rates` (`date`, `currency`, `rate_to_czk`, `source default 'CNB'`) + RLS

**2. Edge function `cnb-rates`**
- GET `https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt`
- Parsuje text, vrací JSON `{date, rates: {EUR: 24.535, USD: ...}}`
- Ukládá do `currency_rates` (upsert na unique `(date, currency)`)

**3. Sazby zahraničního stravného**
- Statická konstanta `FOREIGN_MEAL_RATES` v `src/lib/travel/calc.ts` podle aktuální vyhlášky MF (SK 40 EUR, AT 45 EUR, DE 45 EUR, …)
- Funkce `mealAmountForeign(country, hours, rates)` — pásma 1–12 / 12–18 / 18+ stejně jako u tuzemska, ale v měně dané země

**4. UI úpravy `TravelOrderDetail.tsx`**
- Pole spolucestující v hlavičce
- U každého úseku: `select Země` + auto timezone
- U každého řádku stravného: `select Měna` + `% kapesné`
- Sekce „Kurzy ČNB" s tlačítkem „Načíst kurz ke dni X" → uloží snapshot
- Sekce „Workflow" — 4 podpisové stavy s tlačítky „Vystavit žádost / Schválit žádost / Vyúčtovat / Schválit výkaz"

**5. Přepis `src/lib/travel/pdf.ts`**
- Náš firemní layout (modré akcenty, nikoliv kopie Cestak.com)
- Per-currency souhrny
- Bloky podpisů s časovými razítky
- Řádek „Kurz ČNB ze dne …, 1 EUR = X CZK"

**6. Mobil** — bez změn, jen souhrn navíc ukáže měny

### Co se NEMĚNÍ

- Číslování `CP-2026-0001` (pokud nechceš jinak)
- Logika načítání z knihy jízd
- RLS, autentizace
- Mobilní stránka cesťáků (jen lehké přidání zobrazení měn)

### Mimo scope (řekni, jestli přidat)

- Foto účtenek ke každému výdaji (storage)
- Email notifikace u schvalovacího workflow
- Export do účetnictví (Pohoda/Money XML)
- Automatický přenos schváleného CP do `/naklady`

