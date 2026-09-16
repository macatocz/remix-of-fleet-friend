# Řidič nevidí tankovací kartu ke schválené rezervaci

## Co jsem zjistil

Dvě věci se sešly dohromady:

1. **U rezervovaných vozů žádná karta zadaná není.** V systému jsou dnes jen dvě tankovací karty (MOL a Shell), obě u vozu s SPZ 7AZ0754. Obě existující schválené rezervace jsou na vozy POOL PHA 1 a POOL PHA 2, které kartu přiřazenou nemají. I kdyby vše ostatní fungovalo, řidič by uviděl jen hlášku „K tomuto vozu není přiřazena tankovací karta."

2. **Karta se ukazuje jen v době, kdy rezervace právě běží.** Dnes je 16. 9., jedna rezervace už skončila (11.–14. 9.), druhá začíná až 21. 9. Řidič tedy kartu nevidí ani u schválené rezervace — objeví se až v okamžiku začátku jízdy a zmizí v okamžiku jejího konce. Kdo si chce kartu zkontrolovat den předem, nevidí nic a působí to jako chyba.

## Co navrhuji upravit

**A. Zobrazit kartu od schválení do konce rezervace**
- U schválené rezervace ukázat blok s kartou hned po schválení a nechat ho viditelný až do konce rezervace (včetně dne konce).
- Před začátkem jízdy zobrazit kartu i PIN normálně, ale s drobnou poznámkou „rezervace začíná v …", ať je jasné, proč se karta ukazuje dopředu.
- Pokud u vozu karta není, místo tiché prázdné hlášky napsat jasně: „K tomuto vozu není přiřazena tankovací karta — kontaktujte správce vozového parku."

**B. Srovnat pravidlo v databázi se zobrazením**
Pravidlo na straně databáze, které řidiči kartu zpřístupňuje, dnes platí jen od začátku do konce rezervace. Rozšíří se na „od schválení do konce rezervace", jinak by aplikace kartu zobrazila, ale data by nedorazila. Přístup zůstává vázaný jen na **schválenou** rezervaci daného řidiče na daný vůz — nikomu dalšímu se karta neotevře. Po skončení rezervace (nebo jejím zrušení) přístup okamžitě končí.

**Rizika tohoto řešení a jak jsou ošetřena**
- PIN je viditelný i týdny před jízdou → PIN se ve widgetu skrývá za tečkami a odkrývá se jen na 10 sekund po kliknutí na oko; nikdo cizí u odemčeného telefonu ho nevidí.
- Karta se může mezitím vyměnit nebo změnit PIN → widget vždy načítá aktuální stav karty, po výměně se hned ukáže nový údaj; starý PIN přístup ztratí.
- Zrušená nebo odmítnutá rezervace → pravidlo načítá jen „schváleno", takže přístup s okamžitou platností zaniká.
- Kartu vidí jen řidič, který má na rezervaci svoje jméno napojené na svůj účet — ostatní řidiči ani kolegové ji nevidí.

**C. Upozornit správce na vozy bez karty**
Volitelně: v detailu vozu a v seznamu vozidel označit vozy, které nemají žádnou aktivní tankovací kartu, aby bylo hned vidět, co je potřeba doplnit. (Pokud to nechceš, vynechám.)

## Technické detaily

- Migrace: `private.has_active_reservation_for_vehicle(_vehicle_id)` — podmínku „nyní je mezi začátkem a koncem rezervace" nahradit „nyní je před koncem rezervace" (časová zóna Europe/Prague zůstává). Podmínky `status = 'schváleno'` a napojení na řidiče přes `drivers.user_id = auth.uid()` beze změny.
- `src/pages/mobile/MyReservations.tsx` (řádky ~310–314) a `src/pages/mobile/DriverHome.tsx` (~394–400): místo podmínky „dnešní datum spadá do rezervace" zobrazit widget u každé schválené rezervace, která ještě neskončila (srovnání konce rezervace s aktuálním časem v místním čase).
- `src/components/mobile/ReservationFuelCardWidget.tsx`: doplnit volitelný parametr s časem začátku rezervace (pro poznámku „rezervace začíná v …"), vylepšit text prázdného stavu, ponechat odkrytí PINu na 10 sekund.
- Bod C by znamenal dopočet „vozy bez aktivní karty" ve `Vehicles.tsx` / `VehicleDetail.tsx` — realizuji jen na potvrzení.
- Po úpravě ověřit typovou kontrolu a bezpečnostní linter.
