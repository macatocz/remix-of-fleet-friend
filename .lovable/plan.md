# Řidič nevidí tankovací kartu ke schválené rezervaci

## Co jsem zjistil

Dvě věci se sešly dohromady:

1. **U rezervovaných vozů žádná karta zadaná není.** V systému jsou dnes jen dvě tankovací karty (MOL a Shell), obě u vozu s SPZ 7AZ0754. Obě existující schválené rezervace jsou na vozy POOL PHA 1 a POOL PHA 2, které kartu přiřazenou nemají. I kdyby vše ostatní fungovalo, řidič by uviděl jen hlášku „K tomuto vozu není přiřazena tankovací karta."

2. **Karta se ukazuje jen v době, kdy rezervace právě běží.** Dnes je 16. 9., jedna rezervace už skončila (11.–14. 9.), druhá začíná až 21. 9. Řidič tedy kartu nevidí ani u schválené rezervace — objeví se až v okamžiku začátku jízdy a zmizí v okamžiku jejího konce. Kdo si chce kartu zkontrolovat den předem nebo těsně po návratu, nevidí nic a působí to jako chyba.

## Co navrhuji upravit

**A. Zobrazit kartu dřív a s vysvětlením**
- U schválené rezervace ukázat blok s kartou už od 12 hodin před začátkem a nechat ho ještě 12 hodin po konci.
- Před začátkem jízdy zobrazit kartu i PIN normálně, ale s drobnou poznámkou „rezervace začíná v …".
- Pokud u vozu karta není, místo tiché prázdné hlášky napsat jasně: „K tomuto vozu není přiřazena tankovací karta — kontaktujte správce vozového parku."

**B. Srovnat pravidlo v databázi se zobrazením**
Pravidlo na straně databáze, které řidiči kartu zpřístupňuje, dnes platí přesně jen po dobu trvání rezervace. Rozšíří se na stejné okno (12 hodin před začátkem až 12 hodin po konci), jinak by aplikace kartu zobrazila, ale data by nedorazila. Přístup zůstává vázaný jen na **schválenou** rezervaci daného řidiče na daný vůz — nic se neotevírá ostatním.

**C. Upozornit správce na vozy bez karty**
Volitelně: v detailu vozu a v seznamu vozidel označit vozy, které nemají žádnou aktivní tankovací kartu, aby bylo hned vidět, co je potřeba doplnit. (Pokud to nechceš, vynechám.)

## Technické detaily

- Migrace: `private.has_active_reservation_for_vehicle(_vehicle_id)` — okno rozšířit na `now() >= start - interval '12 hours'` a `now() < end + interval '12 hours'`, časová zóna Europe/Prague zůstává. Podmínky `status = 'schváleno'` a napojení na řidiče přes `drivers.user_id = auth.uid()` beze změny.
- `src/pages/mobile/MyReservations.tsx` (řádky ~310–314) a `src/pages/mobile/DriverHome.tsx` (~394–400): podmínku „dnešní datum spadá do rezervace" nahradit stejným oknem ±12 hodin počítaným z `date_from/time_from` a `date_to/time_to` v místním čase (pomocná funkce v `src/lib/utils.ts` nebo `reservationRules.ts`).
- `src/components/mobile/ReservationFuelCardWidget.tsx`: doplnit volitelné props pro stav rezervace (před začátkem / probíhá), text prázdného stavu, ponechat odkrytí PINu na 10 sekund.
- Bod C by znamenal dopočet „vozy bez aktivní karty" ve `Vehicles.tsx` / `VehicleDetail.tsx` — realizuji jen na potvrzení.
- Po úpravě ověřit typovou kontrolu a bezpečnostní linter.
