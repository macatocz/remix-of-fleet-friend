

## Cíl
Umožnit **správci vozidla** (a admin/dispečerovi) **schvalovat a zamítat čekající rezervace přímo v mobilní verzi**. Dnes lze rezervace v mobilu jen vytvořit a zrušit svou vlastní – schvalovat lze pouze na desktopu.

## Kdo co vidí
- **Správce vozidla**: u každé čekající rezervace **na svůj vůz** vidí tlačítka **Schválit** / **Zamítnout**.
- **Admin / Dispečer**: stejná tlačítka u **všech** čekajících rezervací.
- **Řidič bez správy**: žádná akce navíc, jen vlastní rezervace lze zrušit (jak je dnes).

## Co se mění

### 1. Nová komponenta `src/components/mobile/PendingApprovalCard.tsx`
Karta zobrazující jednu čekající rezervaci s informacemi (řidič, vozidlo RZ, datum/čas od–do, účel) a dvěma velkými tlačítky **Schválit** (default, h-11) a **Zamítnout** (outline destructive, h-11). Po kliku UPDATE `reservations.status` na `schváleno` / `zamítnuto`, toast a callback pro reload. Zamítnutí potvrdit `AlertDialog`em (aby nedošlo k překliku).

### 2. `src/pages/mobile/DriverHome.tsx` – sekce „Ke schválení"

**Pro správce** (`isSpravce`): pod existující sekci „Vytížení mého vozu" přidat sekci **„Žádosti ke schválení"** – načte rezervace se `status='čeká'` a `vehicle_id IN myVehicles.map(id)`, seřazené `date_from ASC`, max 10. Pokud nejsou žádné, sekce se skryje. V titulku badge s počtem.

**Pro admina/dispečera** (přihlášený admin/dispečer používající mobilní redirect): stejná sekce, ale dotaz bez filtru na vozidlo (všechny `status='čeká'`). Detekce role přes `useAuth().roles`.

V hlavičce sekce odkaz „Vše →" na `/m/rezervace`.

### 3. `src/pages/mobile/MyVehicle.tsx` – inline akce u nadcházejících rezervací správce
U každé čekající rezervace v mini-pruhu (dnes jen text + badge) přidat dvě malé ikonové akce **✓** a **✕** (h-8, ghost). Klik = stejná akce jako v `PendingApprovalCard`. Schválené/zamítnuté jen badge.

### 4. `src/pages/mobile/MyReservations.tsx` – pohled „K vyřízení" pro správce
Pro správce a admina přidat nahoře tabovou přepínku **„Moje žádosti" / „Ke schválení"**. Záložka „Ke schválení" zobrazí seznam čekajících rezervací (na vlastní vozidla u správce, na všechna u admina) s `PendingApprovalCard`. Pro řidiče bez správy se přepínka neukazuje – stránka funguje jako dnes.

### 5. Toasty a stavy
- Schválení: `toast.success("Rezervace schválena")`
- Zamítnutí: `toast.success("Rezervace zamítnuta")`
- Chyba: zobrazit message ze Supabase odpovědi.
- Po akci automaticky znovu načíst seznamy.

## Co se NEmění
- Datový model, RLS, status hodnoty (`čeká` / `schváleno` / `zamítnuto`).
- Desktop widget `PendingReservationsWidget`.
- Logika overlap kontroly při vytváření.
- Workflow notifikací (žádné e-maily/push se zatím nepřidávají).

## Soubory
**Vytvořit:** `src/components/mobile/PendingApprovalCard.tsx`
**Upravit:** `src/pages/mobile/DriverHome.tsx`, `src/pages/mobile/MyVehicle.tsx`, `src/pages/mobile/MyReservations.tsx`

## Jak to otestovat
1. Přihlásit se jako správce vozidla v mobilu → na `/m` vidět novou sekci „Žádosti ke schválení" se seznamem čekajících rezervací na můj vůz.
2. Tap **Schválit** → karta zmizí, badge se sníží, vozidlo v sekci „Vytížení" se obarví správně, ten řidič v `MyReservations` uvidí status `schváleno`.
3. Tap **Zamítnout** → potvrzovací dialog → po potvrzení karta zmizí, status `zamítnuto`.
4. V `MyVehicle` u nadcházejících rezervací vidět ikony ✓/✕ – fungují stejně.
5. Přihlásit se jako řidič bez správy → žádné akce schválit/zamítnout nikde nevidět, vlastní žádosti lze pouze zrušit.
6. Přihlásit se jako admin v mobilu → vidí ke schválení **všechny** čekající rezervace napříč vozovým parkem.

