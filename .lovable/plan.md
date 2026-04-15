

# Tankovací karty – přehled a správa

## Co se změní

### 1. Nová databázová tabulka `fuel_cards`

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid PK | |
| vehicle_id | uuid NOT NULL | Vazba na vozidlo |
| provider | text NOT NULL | MOL, Shell, Bonett, Jiné |
| card_number | text | Číslo karty |
| pin | text | PIN ke kartě |
| owner_name | text | Vlastník (předvyplní se ze správce vozidla) |
| status | text DEFAULT 'aktivní' | aktivní / blokovaná / zrušená |
| valid_until | date | Platnost do |
| notes | text | Poznámky |
| created_at, updated_at | timestamptz | |

RLS: authenticated users – full CRUD (konzistentní s ostatními tabulkami).

### 2. Nový komponent `VehicleFuelCards.tsx`

- Tabulka s přehledem karet přiřazených k vozidlu
- Přidání nové karty (dialog) – provider (dropdown: MOL, Shell, Bonett, Jiné), číslo karty, PIN, vlastník (předvyplněn ze `vehicle.spravce`), platnost, stav
- Editace a mazání existujících karet
- Badge pro stav karty (aktivní = zelená, blokovaná = žlutá, zrušená = šedá)
- PIN skrytý ve výchozím stavu (tlačítko pro zobrazení)

### 3. Nový tab na kartě vozidla

- Přidání tabu **„Tankování"** (ikona CreditCard) do `VehicleDetail.tsx` vedle stávajících tabů
- Tab zobrazí komponent `VehicleFuelCards`
- Předá `vehicleId` a `defaultOwner` (ze `vehicle.spravce`)

### 4. Stávající pole `tankovaci_karty` na vehicles

Ponecháno beze změny (staré textové pole pro zpětnou kompatibilitu). Nová tabulka je strukturovaná náhrada.

## Technické kroky

1. Migrace: CREATE TABLE `fuel_cards` + RLS policies
2. Vytvořit `src/components/VehicleFuelCards.tsx`
3. Přidat tab do `VehicleDetail.tsx`

