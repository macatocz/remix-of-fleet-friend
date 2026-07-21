## Úprava protokolu Předání / Převzetí

### 1. Výběr řidiče z databáze
V dialogu „Nový protokol" (`src/components/VehicleHandover.tsx`) nahradit textový `Input` pro pole **Řidič** komponentou `Select` (podobně jako v kalendáři rezervací):
- Načíst řidiče z tabulky `drivers` (`status = 'aktivní'`, řadit podle příjmení).
- Ukládat `driver_name` jako `"Jméno Příjmení"` (sloupec zůstává textový — zpětně kompatibilní).
- Ponechat možnost „—" (bez řidiče) pro případ přesunu na parkoviště / POOL.

### 2. Pole „Zjištěná poškození"
Přidat do dialogu novou sekci **Zjištěná poškození** (nad Poznámku):
- `Textarea` s popisem poškození (např. „Škrábanec na pravých zadních dveřích").
- Checkbox **„Nahlásit jako škodní událost"** (výchozí zapnutý, když je poškození vyplněné).
- Volitelné pole **Odhad nákladů (Kč)**.

Při uložení protokolu:
- Uložit popis do nového sloupce `handover_protocols.damage_description` a `damage_cost_estimate`.
- Pokud je zaškrtnuto „Nahlásit jako škodní událost", automaticky vytvořit záznam v tabulce `incidents`:
  - `vehicle_id`, `date` (= datum protokolu), `location` (= místo z protokolu, pokud existuje, jinak null),
  - `description` = popis poškození + odkaz „Zjištěno při předání/převzetí X",
  - `estimated_cost`,
  - `driver_id` (dohledaný podle vybraného řidiče, pokud existuje),
  - `status = 'nová'`.
- Fotky nahrané k protokolu zůstávají v `handover_photos`; do incidentu se pouze odkazujeme přes text (fotky k incidentu si uživatel může přidat později v modulu Škody).

### 3. Zobrazení v seznamu protokolů
V kartě protokolu přidat řádek **Poškození:** (červeně) když je vyplněné, a badge **„Škoda nahlášena"** když byla vytvořená incident.

### 4. Databáze
Migrace: rozšířit `handover_protocols` o
- `damage_description TEXT`
- `damage_cost_estimate NUMERIC`
- `incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL`

### Technické detaily
- Soubory k úpravě: `src/components/VehicleHandover.tsx`.
- Migrace: `ALTER TABLE handover_protocols ADD COLUMN ...`.
- Řidiče načíst hookem přímo v komponentě (jednou při otevření dialogu).
- `driver_id` pro incident: najít v načteném seznamu podle jména; pokud nesedí, vložit incident bez `driver_id`.