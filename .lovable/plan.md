
## Cíl
Řidič uvidí v mobilní aplikaci tankovací kartu(y) přiřazené k vozu, který má aktuálně rezervovaný — bez přístupu do celkového přehledu karet.

## Kde se to objeví
1. **Domovská obrazovka mobilu** (`MobileHome`) — pokud má řidič právě probíhající rezervaci, zobrazí se pod ní karta "Tankovací karta k vozu" s:
   - Značka karty (CCS, Shell, OMV…)
   - Maskované číslo (••••  1234)
   - Tlačítko "Zobrazit PIN" (odkrytí na klik, auto-skrytí po 10s)
   - Limit / měsíční zůstatek pokud je vyplněn

2. **Detail rezervace** (`MobileReservationDetail` nebo sekce v `MobileReservations`) — stejná karta i zde, aby ji řidič našel i u budoucí/aktuální rezervace.

## Logika
- Načíst `reservations` kde `driver_id = current_user_driver_id` a `start_at <= now() <= end_at` (nebo nejbližší budoucí v rámci 24 h).
- K `vehicle_id` z rezervace načíst `fuel_cards` kde `vehicle_id = ...` a `status = 'aktivní'`.
- Pokud řidič nemá rezervaci → sekce se nezobrazí.
- Pokud vůz nemá kartu → zobrazí se hláška "K tomuto vozu není přiřazena tankovací karta".

## Bezpečnost (RLS)
Stávající policy `fuel_cards` povoluje SELECT pouze adminovi/dispečerovi. Přidáme policy:

```
"Drivers can view fuel cards of their active reservation vehicle"
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN drivers d ON d.id = r.driver_id
    WHERE r.vehicle_id = fuel_cards.vehicle_id
      AND d.user_id = auth.uid()
      AND r.start_at <= now() AND r.end_at >= now()
  )
)
```

PIN se posílá jen na vyžádání — komponenta ho po načtení drží v paměti, nezapisuje do logu.

## Soubory
- **Nový** `src/components/mobile/ReservationFuelCardWidget.tsx` — kompaktní komponenta s reveal PIN.
- **Upravit** `src/pages/mobile/MobileHome.tsx` — vložit widget pod sekci s aktivní rezervací.
- **Upravit** `src/pages/mobile/MobileReservations.tsx` — vložit widget do rozkliknutého detailu.
- **Migrace** — přidat RLS policy pro řidiče na `fuel_cards`.

## Co NEMĚNÍM
- Stávající `/m/tankovaci-karty` (přehled všech karet pro admina) zůstává beze změny.
- Mobilní spodní navigace se nemění — řidič stále vidí jen Domů / Najít vůz / Rezervace.
