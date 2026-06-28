## Cíl
Aktualizovat sazby stravného (ČR i zahraničí) na hodnoty platné pro rok 2026 podle vyhlášek MF ČR a MF ČR pro zahraniční diety, a do budoucna mít přehledný způsob, jak je každý rok aktualizovat.

## Kontext
Dnes jsou sazby natvrdo v `src/lib/travel/calc.ts`:
- `DEFAULT_MEAL_RATES` (ČR): 166 / 252 / 396 Kč
- `FOREIGN_MEAL_RATES` (~13 zemí): plné denní sazby v EUR/CHF/GBP/USD
- `DEFAULT_KM_RATE` 5,85 Kč/km, `DEFAULT_FUEL_PRICE` 36,10 Kč/l

Tyto hodnoty odpovídají vyhláškám pro rok 2024. Pro rok 2026 je třeba je nahradit aktuálními hodnotami z vyhlášek MF ČR (tuzemské stravné + průměrné ceny PHM) a MF ČR / MZV (zahraniční stravné).

## Doporučený přístup: dvě úrovně (zdroj pravdy + uživatelská změna)

### 1) Zdroj pravdy v kódu — roční sazebník
Místo jediné konstanty zavést **sazebník po letech** přímo v `src/lib/travel/calc.ts`:

```ts
MEAL_RATES_BY_YEAR = {
  2024: { "5_12": 140, "12_18": 212, "18_plus": 333 },
  2025: { "5_12": 166, "12_18": 252, "18_plus": 396 },
  2026: { "5_12": ?,   "12_18": ?,   "18_plus": ? },  // doplnit po vydání vyhlášky
}
FOREIGN_MEAL_RATES_BY_YEAR = { 2025: {...}, 2026: {...} }
FUEL_PRICE_BY_YEAR = { 2025: 36.10, 2026: ? }
KM_RATE_BY_YEAR = { 2025: 5.85, 2026: ? }
```

Funkce `mealAmountForHours` / `mealAmountForeign` / `vehicleReimbursement` budou brát rok z **data cesty** a vybírat správnou sazbu. Pro starší cesty se tím zachová historická správnost (audit).

### 2) Přepsání sazeb na úrovni firmy (volitelné)
V tabulce `company_settings` přidat JSON pole `meal_rates_override` — pokud má firma vyšší kolektivní smlouvu / vlastní sazby, admin si je upraví v Nastavení → Cestovní příkazy bez zásahu do kódu.

Priorita: cesta v roce X → override firmy pro rok X → výchozí sazba pro rok X v kódu.

### 3) UI v Nastavení
Nová sekce **Nastavení → Cestovní příkazy → Sazby stravného**:
- Tabulka sazeb tuzemských (5–12 / 12–18 / 18+) s tlačítkem "Vrátit na výchozí 2026"
- Tabulka zahraničních (země, měna, plná sazba)
- Cena PHM a sazba Kč/km
- Vše s polem "Platné od (datum)" pro budoucí připravení sazeb dopředu

## Kde získat hodnoty pro rok 2026
Vyhláška MF ČR o základních sazbách stravného a o průměrné ceně PHM vychází obvykle v prosinci a platí od 1. 1. následujícího roku. Vyhláška MF ČR o zahraničním stravném vychází podobně.

Než pro rok 2026 vyhláška vyjde nebo než budou hodnoty veřejné, navrhuji:
- **Varianta A:** Implementovat strukturu (rok 2025 = stávající hodnoty), pro 2026 dočasně použít stejné hodnoty jako 2025 a doplnit po vydání vyhlášky jednou drobnou změnou.
- **Varianta B:** Pokud už hodnoty pro 2026 máš (z účetní / vyhlášky), pošli je a rovnou je zadám.

## Co konkrétně udělám (po schválení plánu)
1. Refactor `src/lib/travel/calc.ts` — sazebník po letech, funkce přijmou `date`/`year`.
2. Migrace DB — přidat `company_settings.meal_rates_override JSONB`, `fuel_price_override`, `km_rate_override`.
3. UI sekce v `src/components/settings/` — editace sazeb s "platné od".
4. Update všech volajících (`TravelOrderDetail.tsx`, PDF export, kalkulace v dialogu) tak, aby předávaly datum cesty.
5. Doplnit hodnoty pro 2026 (Varianta A nebo B podle tvé volby).

## Otázky
1. Máš už k dispozici **konkrétní hodnoty z vyhlášky pro rok 2026** (tuzemské stravné, cena PHM, sazba Kč/km, zahraniční diety)? Pokud ano, pošli je. Pokud ne, implementuji strukturu a 2026 prozatím dorovnám na 2025.
2. Chceš mít **možnost úpravy sazeb v Nastavení** (override firmy), nebo stačí, že je budu měnit v kódu při každé nové vyhlášce?
