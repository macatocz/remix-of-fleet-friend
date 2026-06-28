## Editace cestovních sazeb v Nastavení

Přidám do **Nastavení → Cestovní sazby** editační formulář, který umožní ručně přepsat státní sazby firemními override hodnotami. Override se uloží do `company_settings` (sloupce už existují) a výpočet v cesťáku je bude přednostně používat.

### Co půjde editovat (po letech: 2024 / 2025 / 2026)

1. **Tuzemské stravné** — 3 pásma (5–12 h, 12–18 h, 18+ h) v Kč
2. **Zahraniční stravné** — tabulka zemí + denní sazba v měně dané země
3. **Sazba Kč/km** — náhrada za použití soukromého vozidla
4. **Cena PHM** — Natural 95, Natural 98, Diesel (Kč/l), Elektřina (Kč/kWh)

### UI

Záložka **Cestovní sazby** dostane přepínač **Zobrazení / Editace**:

- **Zobrazení** (default) — současný read-only přehled, navíc badge „Firemní override" u řádků, které jsou přepsané.
- **Editace** — formuláře pro každou kategorii s tlačítky **Uložit** a **Vrátit na státní sazbu** (per kategorie i per řádek). Selektor roku nahoře.

### Logika

- `src/lib/travel/calc.ts` — funkce pro načtení sazeb (`getDomesticMealRates(year)`, `getForeignMealRate(country, year)`, `getKmRate(year)`, `getFuelPrice(fuel, year)`) přijmou volitelný `overrides` objekt z `company_settings` a vrátí override hodnotu, pokud existuje, jinak státní default.
- `src/pages/TravelOrderDetail.tsx` — před přepočtem stravného načte `company_settings` a předá overrides do calc funkcí.
- Nový hook `useCompanySettings()` pro načtení/aktualizaci override sloupců.

### Práva

Editace sazeb dostupná jen pro role **admin** (kontrola přes `has_role(auth.uid(), 'admin')`). Ostatní vidí jen read-only přehled.

### Technické detaily

- Soubory: `src/components/settings/TravelRatesSettings.tsx` (rozšířit), nový `src/components/settings/TravelRatesEditor.tsx`, `src/hooks/useCompanySettings.ts`, úprava `src/lib/travel/calc.ts` a `src/pages/TravelOrderDetail.tsx`.
- DB: žádná migrace — override JSONB sloupce v `company_settings` už existují (`meal_rates_override`, `foreign_meal_rates_override`, `fuel_price_override`, `km_rate_override`).
- Validace přes zod (kladná čísla, max 99999).
