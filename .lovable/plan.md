# Oprava dokumentů u vozidla

## Co je špatně

Ověřeno v databázi a v síťových požadavcích z náhledu:

1. **Načtení dokumentů i složek selhává.** Pravidla přístupu u tabulek `vehicle_documents` a `document_folders` volají pomocnou funkci `can_access_vehicle`, ta ale uvnitř stále volá `public.is_staff()` — funkce se při dřívějším bezpečnostním úklidu přesunula do interního schématu a v `public` už neexistuje. Každý dotaz proto končí chybou „function public.is_staff() does not exist".

2. **Kvůli tomu vzniká nekonečná smyčka.** Komponenta dokumentů si po neúspěšném načtení myslí, že vozidlo nemá žádné složky, a znovu a znovu se pokouší založit výchozí sadu složek. Ty už v databázi existují, takže se vrací chyba duplicity a celý cyklus se opakuje donekonečna (v logu desítky požadavků za sekundu). To je ten „blbnoucí" projev.

## Co udělám

### 1. Oprava v databázi
Migrací přepíšu funkci `can_access_vehicle` tak, aby volala pomocnou funkci ze správného interního schématu. Zároveň projdu ostatní interní funkce a zkontroluji, jestli někde nezůstalo další volání na neexistující `public.is_staff()`, a opravím je stejně.

### 2. Oprava komponenty dokumentů (`src/components/VehicleDocuments.tsx`)
- Zakládání výchozích složek proběhne nejvýš jednou na vozidlo a jen tehdy, když se načtení složek skutečně povedlo (ne když skončilo chybou).
- Vkládání výchozích složek bude odolné vůči duplicitám, takže už nemůže spadnout na kolizi názvu.
- Chyby při načítání, nahrávání a mazání se zobrazí uživateli jako hláška místo tichého selhání.

### 3. Ověření
Po opravě projdu tab „Dokumenty" u vozidla v náhledu: složky se načtou, nahrání souboru projde, soubor se objeví ve složce, stažení a smazání funguje a v síťovém logu nezůstane žádná opakující se chyba.

## Technické detaily
- Migrace: `CREATE OR REPLACE FUNCTION private.can_access_vehicle(uuid)` s voláním `private.is_staff()` místo `public.is_staff()`, zachovat `SECURITY DEFINER`, `STABLE` a `search_path`.
- Efekt pro seedování složek ohlídat přes `useRef` klíčovaný `vehicleId` + `fetchData` musí vracet příznak úspěchu.
- Insert výchozích složek s `onConflict: "vehicle_id,name"` a `ignoreDuplicates: true`.
