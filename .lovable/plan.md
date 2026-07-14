
# Zabezpečení Lovable Cloud backendu

Cíl: odstranit všech 15 nálezů bezpečnostního skeneru. Zavedeme role-based RLS (admin / dispečer / řidič), zrušíme veřejný přístup a ownership kontroly u úložiště.

## Role model (už existuje)
- `admin` – plný přístup ke všem tabulkám (CRUD)
- `dispatcer` – správa vozidel, rezervací, cestovních příkazů, servisu, incidentů (bez firemního nastavení)
- `ridic` – vidí a upravuje jen **svoje** záznamy (rezervace, cestovní příkazy, trip logs, incidenty) + čte katalog vozidel/known reference

Používáme existující `public.has_role(auth.uid(), 'admin'|'dispatcer'|'ridic')`.
Ownership u řidiče se páruje přes `drivers.user_id = auth.uid()`.

## 1) Tabulky – nové RLS politiky

Pro **každou tabulku** níže: DROP všech stávajících politik → CREATE nové jen pro `authenticated` role, s rozumnými pravidly. GRANTy zůstávají pro `authenticated` + `service_role`, `anon` se všude odebere.

**Administrativní / firemní data** (pouze admin zapisuje, autentizovaní čtou):
- `app_settings`, `company_settings` – SELECT: authenticated; INSERT/UPDATE/DELETE: `has_role(auth.uid(),'admin')`
- `currency_rates` – SELECT: authenticated; write: admin nebo dispatcer

**Katalog vozidel** (admin+dispečer plný, řidič jen čte):
- `vehicles`, `vehicle_documents`, `vehicle_mileage`, `vehicle_vignettes`, `document_folders`,
  `insurance`, `inspections`, `service_plans`, `service_records`, `fuel_cards`
- SELECT: authenticated
- INSERT/UPDATE/DELETE: admin OR dispatcer

**Rezervace** (řidič vidí+upravuje svoje, admin+dispečer vše):
- `reservations`
- SELECT: admin OR dispatcer OR (driver_id spadá pod aktuálního usera přes `drivers.user_id`)
- INSERT: authenticated, kdo si dělá rezervaci na sebe, nebo admin/dispečer
- UPDATE/DELETE: admin OR dispatcer OR vlastník
- Stejně `trip_logs`, `trip_templates`

**Cestovní příkazy** (obdobně, kotva: `travel_orders.driver_id → drivers.user_id`):
- `travel_orders`, `travel_order_legs`, `travel_order_meals`, `travel_order_expenses`
- SELECT/write: admin OR dispatcer OR vlastník cestovního příkazu

**Předávací protokoly a incidenty**:
- `handover_protocols`, `handover_photos`, `key_handovers`, `incidents`, `incident_photos`
- SELECT: authenticated
- write: admin OR dispatcer OR uživatel, který záznam vytvořil (`created_by = auth.uid()` pokud sloupec existuje, jinak scope přes vozidlo/reservation)

**Ostatní**:
- `drivers` – SELECT: authenticated; INSERT/UPDATE/DELETE: admin OR dispatcer; řidič smí `UPDATE` jen svůj vlastní řádek (`user_id = auth.uid()`)
- `notifications` – zůstává user-scoped (už je OK)
- `notification_preferences`, `push_subscriptions` – už OK
- `user_roles` – jen admin může měnit; každý si smí přečíst svoje role
- `profiles` – ponechat (už je user-scoped)
- `vehicle_checklists` – authenticated read; write admin/dispečer nebo řidič, který checklist vytvořil

## 2) Storage buckets

**`vehicle-documents`** (private):
- SELECT / INSERT / UPDATE / DELETE jen `authenticated` A vlastnictví ověřit joinem na `vehicle_documents` → `vehicles` (admin/dispečer plné; řidič vidí jen dokumenty vozidel s jeho aktivní rezervací nebo obecné dokumenty POOL vozidel – zjednodušeně: read pro authenticated, write jen admin+dispečer)

**`handover-photos`** (private):
- SELECT / write jen authenticated a jen fotky patřící k protokolu, který uživatel vytvořil, nebo admin/dispečer

Uděláno přes RLS politiky na `storage.objects` s JOIN na `handover_photos`/`vehicle_documents`.

## 3) SECURITY DEFINER view a funkce

- `public.vehicle_key_status` – překlopit na `SECURITY INVOKER` (přidat `WITH (security_invoker = true)` při recreatu view), aby RLS platily podle uživatele
- SECURITY DEFINER funkce spustitelné anon/authenticated:
  - `assign_first_admin`, `handle_new_user`, `generate_travel_order_number` – to jsou triggerové funkce, nemají být volatelné z API → `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`
  - `has_role` – zůstává volatelná pro authenticated (potřeba pro klienta), zvážit revoke anon
  - `update_updated_at_column` – trigger only, revoke execute

## 4) Front-end dopady

Většina UI je v pořádku, protože už čte `useAuth().hasRole`. Riziková místa k prověření a případně upravit:
- **Login/Signup** – pořád funguje (auth.users není dotčen)
- **`CompanySettings.tsx`, `GeneralSettings.tsx`** – zápisy budou fungovat jen adminovi; skrýt tlačítko „Uložit" pro neadmin (`useAuth().isAdmin`)
- **`Reservations.tsx`, `MyReservations.tsx`** – filtr už řídí backend, ale sjednotit optimistické UI (řidič uvidí jen svoje)
- **`TravelOrders.tsx`** – seznam pro řidiče se zúží automaticky, ale ověřit že „Nový" jde
- **`Drivers.tsx`** – pro neadmin/dispečera zakázat editaci cizích řádků

Kód se nemění dramaticky – převážně jde o skrytí tlačítek, kde už chybí oprávnění, aby uživatel nedostal 403.

## 5) Postup migrace

Vše v jedné migraci:
```text
1. DROP všech "Allow public …" politik na dotčených tabulkách
2. REVOKE SELECT/INSERT/UPDATE/DELETE FROM anon on public.<každá tabulka>
3. GRANT authenticated + service_role dle potřeby
4. CREATE POLICY … (nové role-based politiky)
5. CREATE OR REPLACE VIEW public.vehicle_key_status … WITH (security_invoker = true)
6. REVOKE EXECUTE on trigger/definer funkcí od PUBLIC/anon/authenticated
```
Data ani sloupce se nemění.

## 6) Ověření
Po nasazení:
- Spustit `supabase--linter` a security scan → očekáváme 0 error nálezů
- Ruční test: admin, dispečer, řidič – ověřit, že každý vidí co má a nic víc
- Zkontrolovat načtení `/dashboard`, `/vehicles`, `/reservations`, `/travel-orders` pod různými rolemi

## Technická poznámka
Migrace je poměrně dlouhá (cca 50+ politik na ~25 tabulek). Použiji jednu velkou migraci, protože všechny změny musí být atomické – jinak by mezi kroky mohla část dat zůstat nedostupná pro klienta.
