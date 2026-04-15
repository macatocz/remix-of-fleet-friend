

# Přehled tankovacích karet v sidebaru

## Co se změní

### 1. Nová stránka `/tankovaci-karty` (`src/pages/FuelCards.tsx`)
- Zobrazí **všechny tankovací karty** napříč vozidly v jedné tabulce
- Sloupce: Vozidlo (RZ + značka), Provider, Číslo karty, PIN (skrytý), Vlastník, Platnost do, Stav
- Filtry: provider, stav (aktivní/blokovaná/zrušená)
- Klik na řádek = přechod na detail vozidla (tab Tankování)
- Badge pro stav karty (zelená/žlutá/šedá)
- Zvýraznění karet s blížící se expirací

### 2. Nová položka v sidebaru (`src/components/AppSidebar.tsx`)
- Přidání **„Tankovací karty"** s ikonou `CreditCard` do hlavního menu (pod Náklady)

### 3. Nová route v `src/App.tsx`
- Route `/tankovaci-karty` → `FuelCards`

## Technické kroky
1. Vytvořit `src/pages/FuelCards.tsx` — fetch z `fuel_cards` + join na `vehicles` (rz, znacka)
2. Přidat položku do sidebaru
3. Přidat route do App.tsx

