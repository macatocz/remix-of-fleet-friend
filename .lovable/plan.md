## Plán: Předělat globální Kniha jízd na read-only report

### Cíl
Položka **Kniha jízd** v levém menu zůstane jako globální přehled všech jízd, ale přestane sloužit k zápisu. Zápis/editace se přesune výhradně na detail vozidla a mobilní FAB.

### Proč (na základě odpovědi uživatele)
- Každý řidič si zapisuje jízdy sám (v mobilu nebo v detailu svého vozidla).
- Admin/dispečer nezapisuje hromadně za více řidičů.
- Globální přehled je tak užitečný jen pro **kontrolu, filtry a export**.

### Co se změní

#### 1. `src/components/VehicleTripLog.tsx` (globální přehled)
- Odebrat tlačítko **„Nový záznam“** a celé `<Dialog>` pro zápis/editaci.
- Zachovat tabulku se všemi sloupci (datum, čas, vozidlo, řidič, trasa, km, PHM, náklady).
- Ponechat filtry: měsíc, vozidlo, řidič, účel (pokud už existují).
- Ponechat řazení a export.
- Upravit sloupec akcí: místo „Upravit/Smazat“ zobrazit pouze **„Otevřít detail vozidla“** (přesměrování na `/vozidla/:id` do záložky Kniha jízd), případně ikonu oka/smazání pouze pro admina.

#### 2. `src/pages/TripLog.tsx`
- Žádná změna potřeba — stále renderuje `VehicleTripLog` bez `vehicleId`.

#### 3. Detail vozidla + mobil
- **Beze změny** — zůstává jediná cesta pro zápis/editaci.

#### 4. Databáze
- Žádná migrace.

### Technické detaily
- Odstranit stavy: `open`, `saving`, `form`, `editId` z `VehicleTripLog.tsx` (nebo alespoň vyřadit z UI).
- Upravit `fetchLogs`, aby načítal všechny jízdy v zadaném měsíci (už teď to tak je, jen se odstraní logika ukládání).
- Zachovat `selectedMonth` a filtry.
- Zachovat `TripLogExport` komponentu pro export dat.

### Alternativa (varianta C)
Pokud by uživatel chtěl úplně odebrat položku z menu, stačí jedna úprava v `AppSidebar.tsx` a případné přesměrování `/kniha-jizd` → `/vozidla`. Žádná data se neztratí.