

## Cíl
Rozlišit mobilní zážitek pro řidiče podle toho, **zda je správcem vozidla, nebo "jen" řidičem** (uživatel bez přiřazené správy vozu).

- **Správce** (má vozidlo, kde `vehicles.spravce_id = drivers.id`) → primárně chce vědět **vytížení svého vozu**: kdo a kdy ho má rezervovaný, kalendář na týden/2 týdny dopředu, a vlastní rezervace.
- **Řidič bez správy** → primárně chce **najít volný vůz a spravovat své rezervace**. Vozový park ho nezajímá detailně, chce jen "mám rezervaci / chci novou / co je volné".

## Co se mění

### 1. `src/pages/mobile/DriverHome.tsx` – rozdělit obsah podle role
Rozhodující signál: `myVehicles.length > 0` z `useDriverContext()`.

**Varianta A – Správce (má alespoň 1 vozidlo):**
- Header: "Vítejte, {jméno}"
- Sekce **Moje vozidlo** – velká karta s RZ, značkou, statusem, KM, varováními (STK / zelená karta brzy končí). Klik → `/vozidla/:id`.
- Sekce **Vytížení mého vozu** – horizontálně scrollovatelný pruh **dnes + 13 dnů**: každý den jako pilulka s počtem rezervací (zelená = volno, modrá = obsazeno, žlutá = částečně). Klik na den → rozbalí seznam rezervací toho dne (kdo, čas, účel).
- Sekce **Nadcházející rezervace mého vozu** – seznam max 5 položek (kdokoli, ne jen já), s jménem řidiče a časem.
- Sekce **Moje rezervace** – pokud správce má i vlastní žádosti, krátký seznam (max 3) + odkaz "Vše".
- FAB → zápis jízdy / hlášení škody / nová rezervace.

**Varianta B – Řidič bez správy:**
- Header: "Vítejte, {jméno}"
- Velké tlačítko **"Najít volný vůz"** (primary, full-width, h-14) → otevře nový bottom-sheet `FindVehicleSheet` (viz dále).
- Velké tlačítko **"Nová rezervace"** → existující `NewReservationDialog`.
- Sekce **Moje aktivní rezervace** – seznam (3 nejbližší): vůz, datum, status, akce "Detail".
- Pod tím počet čekajících rezervací s odkazem na `/m/rezervace`.
- Žádná sekce "Moje vozidlo" (nemá smysl, nemá žádné).

### 2. Nová komponenta `src/components/mobile/FindVehicleSheet.tsx`
Bottom-sheet (Drawer) pro řidiče bez správy:
- Vstupy: **Datum od / do**, **čas od / do** (default dnes 08:00–17:00), volitelně kategorie.
- Tlačítko "Najít volné" → query přes `vehicles` + `reservations` (stejná logika overlap jako v `NewReservationDialog`), vrací seznam volných vozů.
- Výsledek: karty volných vozů (RZ, značka, kategorie). Klik → předvyplněný `NewReservationDialog` s daným vozem a termínem.

### 3. Nová komponenta `src/components/mobile/SpravceCalendarStrip.tsx`
Horizontální pruh dnů pro správce:
- Načte rezervace pro `myVehicles[0].id` (případně přepínač pokud je víc vozů) na 14 dnů dopředu.
- Každý den = chip s datem + indikátorem obsazenosti.
- Tap na chip → expanduje seznam rezervací toho dne (řidič, čas od–do, status, účel).
- Pokud má správce více vozidel → segmentovaný přepínač nahoře (RZ jednotlivých vozidel).

### 4. `src/pages/mobile/MyVehicle.tsx` – obohatit pro správce
- U každého vlastního vozidla přidat pod akce **mini-pruh nadcházejících rezervací** (3 nejbližší): kdo, kdy, status.
- Tlačítko "Kalendář vytížení" → otevře full-screen drawer s `SpravceCalendarStrip` rozšířeným na 30 dnů.
- Pokud řidič není správcem žádného vozu, tato stránka zůstane jako dnes (prázdný stav s návodem) – ale v bottom-navu ji pro tuto roli skryjeme (viz dále).

### 5. `src/components/MobileLayout.tsx` – nav podle role
- **Správce řidič**: Domů, Moje vozidlo, Rezervace.
- **Řidič bez správy**: Domů, Najít vůz, Rezervace (místo "Moje vozidlo" se zobrazí "Najít vůz" – otevře `FindVehicleSheet`).
- Detekce přes `useDriverContext().myVehicles.length`.

### 6. `useDriverContext` – drobné rozšíření
- Přidat odvozený flag `isSpravce: boolean` (= `myVehicles.length > 0`), aby komponenty nemusely opakovat tu logiku.

## Co se NEmění
- Routing, schvalovací workflow, datový model, RLS.
- Admin/dispečer mobilní UX (ten řešíme jinde).
- Desktop verze.

## Soubory
**Upravit:** `src/hooks/useDriverContext.tsx`, `src/pages/mobile/DriverHome.tsx`, `src/pages/mobile/MyVehicle.tsx`, `src/components/MobileLayout.tsx`.
**Vytvořit:** `src/components/mobile/SpravceCalendarStrip.tsx`, `src/components/mobile/FindVehicleSheet.tsx`.

## Jak to otestovat
1. Přihlásit se jako řidič, který je správcem (má v `vehicles.spravce_id` záznam) → na `/m` vidět kartu "Moje vozidlo" + pruh vytížení na 14 dní.
2. Tap na den s rezervací → vidět kdo a kdy si vůz vzal.
3. Přihlásit se jako řidič bez správy → na `/m` vidět velká tlačítka "Najít volný vůz" a "Nová rezervace", v navu místo "Moje vozidlo" položku "Najít vůz".
4. Kliknout "Najít volný vůz", zadat termín → dostat seznam volných vozů → výběr → otevře se předvyplněný formulář rezervace.

