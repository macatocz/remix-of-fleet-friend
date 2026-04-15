

# Úprava polí na kartě vozidla – záložka Údaje

## Přehled změn

Všechna pole v DB zůstanou TEXT — změny jsou čistě v UI. Stávající textová data, která neodpovídají novému formátu, se zobrazí jako prázdná ("—"), ale v DB zůstanou.

### Změny typů polí

| Pole | Nový typ UI | Poznámka |
|------|------------|----------|
| **spravce** | Dropdown z tabulky `drivers` | Výběr řidiče |
| **v_uzivani_od** | Datepicker | |
| **v_uzivani_do** | Datepicker | |
| **cena_pronajmu** → **Cena bez DPH** | Číselný input + suffix „Kč" | `type="number"` |
| **srazka_soukrome** | Číselný input + suffix „Kč" | `type="number"` |
| **mesicni_splatka** | Číselný input + suffix „Kč" | `type="number"` |
| **nahradni_klic** | Dropdown: Praha, Brno, Liberec | Pobočka kde je klíč |
| **lokalita** | Select: Praha, Brno, Liberec | Přidáno Brno |
| **stk** → **STK do** | Datepicker | |
| **zelena_karta** → **Zelená karta do** | Datepicker | |
| **datum_zahajeni_leasingu** | Datepicker | |
| **datum_ukonceni_leasingu** | Datepicker | |
| **doba_leasingu** | Readonly, auto-výpočet | Rozdíl od/do v měsících |

### Dálniční známka – nová tabulka `vehicle_vignettes`

Nahradí textové pole. Tabulka: `id`, `vehicle_id`, `country` (CZE/DE/SVK/AUT), `valid_until` (date).

UI: checkboxy pro země + datepicker expirace u každé zaškrtnuté.

## Technické kroky

1. **Migrace**: CREATE TABLE `vehicle_vignettes` + RLS (authenticated CRUD)
2. **Rozšířit `FieldDef`** o typy: `date`, `driver_select`, `currency` (number + Kč), `computed`, `vignettes`
3. **Upravit `EditableField`** — datepicker, driver dropdown (fetch z `drivers`), currency input (`<input type="number">` + „Kč"), computed readonly, vignettes editor
4. **Aktualizovat definice polí** v BASIC_FIELDS, LEASING_FIELDS, DOC_FIELDS, OPS_FIELDS
5. **Vytvořit sub-komponent `VehicleVignettes`** pro správu dálničních známek

