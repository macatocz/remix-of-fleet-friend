## Cíl
Vytvořit přehledné vizuální schéma celé aplikace správy vozového parku, aby bylo jasné, jak jsou jednotlivé části propojené.

## Co schéma bude obsahovat

Vytvořím **3 Mermaid diagramy** jako stahovatelné artefakty:

### 1. Architektura aplikace (vysoká úroveň)
- Frontend (React + Vite) ↔ Lovable Cloud (DB, Auth, Storage, Edge Functions)
- Rozdělení na desktop (`AppLayout`) a mobil (`MobileLayout`)
- Autentizace + role (Admin / Dispečer / Řidič) → `ProtectedRoute`
- Edge function `cnb-rates` (kurzy ČNB pro cestovní příkazy)

### 2. Mapa stránek a navigace
- Desktop sidebar: Dashboard, Vozidla, Řidiči, Rezervace, Servis, Škody, Kniha jízd, Náklady, Tankovací karty, Cestovní příkazy, Nastavení
- Mobil bottom nav podle role (správce / řidič / admin) + drawer „Více" + FAB (Zápis jízdy, Hlásit škodu)
- Detail vozidla a jeho taby (Info, Leasing, Dokumenty, Servis, Pojištění, Dálniční známky, Tankovací karty, Předání, Škody, Kniha jízd, Kalendář)

### 3. Datový model (vztahy mezi tabulkami)
- `vehicles` jako centrum, napojené na:
  - `drivers` (přes `spravce_id`, koncept POOL když je NULL)
  - `reservations`, `service_records`, `service_plans`, `insurance`, `inspections`
  - `vehicle_documents`, `vehicle_vignettes`, `vehicle_mileage`, `fuel_cards`
  - `trip_logs`, `trip_templates`, `incidents` (+ `incident_photos`)
  - `handover_protocols` (+ `handover_photos`)
- `travel_orders` → `travel_order_legs`, `travel_order_meals`, `travel_order_expenses`
- `auth.users` → `profiles`, `user_roles` (role-based access přes `has_role()`)
- Globální: `company_settings`, `app_settings`, `currency_rates`, `document_folders`

## Forma výstupu
- 3 `.mmd` soubory v `/mnt/documents/` jako stahovatelné artefakty
- Krátký textový komentář k orientaci v každém diagramu

## Co schéma NEbude
- Nezasahuji do žádného kódu aplikace — jde čistě o dokumentaci.
