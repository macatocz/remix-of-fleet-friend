

# Správce vozidla: UUID reference + select (řidič / POOL)

## Koncept

Select pro správce nabídne:
- **„POOL – Název společnosti"** — vozidlo bez přiřazeného správce, `spravce_id = NULL`, textový `spravce = "POOL"`
- **Jednotliví řidiči** — `spravce_id = driver.id`, `spravce = jméno`

## 1. DB migrace

```sql
ALTER TABLE vehicles ADD COLUMN spravce_id uuid REFERENCES drivers(id);

UPDATE vehicles v SET spravce_id = d.id
FROM drivers d
WHERE v.spravce = d.first_name || ' ' || d.last_name;
```

## 2. Úprava `DriverSelectField` (VehicleDetail.tsx)

- Načíst aktivní řidiče + název společnosti z `company_settings`
- První volba: `"POOL – {název firmy}"` (hodnota `__pool__` → uloží `spravce_id = null`, `spravce = "POOL"`)
- Ostatní: řidiči (hodnota = `driver.id` → uloží `spravce_id` i textový `spravce`)
- Pole `spravce` na vehicles teď ukládá jak `spravce` text tak `spravce_id` UUID

## 3. Úprava formuláře nového vozidla (Vehicles.tsx)

- Pole „Správce" z textového inputu na stejný select (POOL / řidič)

## 4. Filtr „Moje vozidla" v Reservations.tsx

- Z `AuthContext` → `drivers.user_id = auth.uid()` → získat `driver.id`
- Přepínač „Moje vozidla" filtruje kde `spravce_id === currentDriverId`

## 5. Import (VehicleImport.tsx)

- Při importu hledat řidiče podle jména → `spravce_id`; jinak `null`

## Rozsah
- 1 DB migrace (přidání sloupce + datová migrace)
- 4 soubory: `VehicleDetail.tsx`, `Vehicles.tsx`, `Reservations.tsx`, `VehicleImport.tsx`
- Uložit do memory pravidlo o POOLu

