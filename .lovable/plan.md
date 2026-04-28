## Doplnění polí tachometru do sekce Leasing

V detailu vozidla (`/vozidla/:id`) v sekci **Leasing** přibudou tři nová pole vázaná na leasingový kontrakt:

1. **Výchozí stav tachometru** — ručně zadané (km na začátku leasingu)
2. **Celkový nájezd** — počítáno automaticky: `najezd_za_rok × (doba_leasingu / 12)`
3. **Konečný stav tachometru** — počítáno automaticky: `výchozí stav + celkový nájezd`

### Pořadí v kartě Leasing (po úpravě)
```text
Leasingová spol.
Doba leasingu (měsíce)        [computed]
Nájezd/rok
Výchozí stav tachometru        [nové, editovatelné]
Celkový nájezd                 [nové, computed]
Konečný stav tachometru        [nové, computed]
Měsíční splátka
Leasing od
Leasing do
Č. smlouvy leasing
```

### Změny v databázi
Přidat do tabulky `vehicles` jeden nový sloupec (zbytek se počítá za běhu, neukládá se):
- `vychozi_stav_tachometru` — `text` (kvůli konzistenci s ostatními číselnými poli leasingu jako `najezd_za_rok`, `mesicni_splatka`, která jsou také `text`)

### Změny v kódu
**`src/pages/VehicleDetail.tsx`** — rozšířit `LEASING_FIELDS`:
- Nový field `vychozi_stav_tachometru` (typ jako běžný text/number input)
- Nový computed field `celkovy_najezd`:
  - vstup: `najezd_za_rok` (z editData/vehicle) a `doba_leasingu` (už počítaný z dat)
  - vzorec: `Math.round(najezd_za_rok * mesice / 12)`
- Nový computed field `konecny_stav_tachometru`:
  - vzorec: `vychozi_stav_tachometru + celkovy_najezd`
- Hodnoty se zobrazí s formátováním tisíců (`1 234 567 km`), prázdné = `—` když chybí vstupy
- V `handleSave` (řádek 419) ošetřit, aby se computed pole neposílala do DB (`delete payload.celkovy_najezd; delete payload.konecny_stav_tachometru;`)

### Co to uživateli dá
Při zadání `Nájezd/rok = 30000`, `Leasing od/do = 36 měsíců`, `Výchozí stav = 12 500 km` se automaticky dopočítá:
- Celkový nájezd: **90 000 km**
- Konečný stav tachometru: **102 500 km**

Hodí se pro hlídání překročení smluvního nájezdu u operativního leasingu.
