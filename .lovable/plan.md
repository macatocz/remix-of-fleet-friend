# Vymazání dat o vozidlech (start od nuly)

Cíl: smazat všechna data navázaná na vozidla, ale **zachovat osoby** (řidiče, uživatele, role, firemní nastavení).

## Co se smaže

| Oblast | Počet záznamů |
|---|---|
| Vozidla | 35 |
| Dokumenty vozidel + složky | 106 + 290 |
| Palivové karty | 45 |
| Dálniční známky | 24 |
| Kniha jízd | 152 |
| Rezervace | 16 |
| Škody (+ fotky) | 6 (+1) |
| Servis / servisní plány | 2 / 1 |
| Předávací protokoly (+ fotky) | 2 |
| Cestovní příkazy (+ etapy, stravné, výdaje) | 2 |
| Notifikace | 2 |
| Kontrolní listy, předání klíčů, nájezdy, STK, pojištění, šablony jízd | 0 |

## Co zůstane

- Řidiči / osoby (48 záznamů) — jen se jim vynuluje vazba na vozidlo (`vehicle_id`)
- Uživatelské účty, role a přihlášení
- Firemní nastavení, sazby cesťáků, kurzy měn
- Nastavení notifikací

## Technické provedení

Jeden dávkový příkaz nad databází v pořadí od podřízených tabulek k nadřazeným, aby nespadly cizí klíče:

1. `incident_photos`, `handover_photos`
2. `travel_order_legs`, `travel_order_meals`, `travel_order_expenses`, poté `travel_orders`
3. `trip_logs`, `trip_templates`, `reservations`, `incidents`
4. `service_records`, `service_plans`, `inspections`, `insurance`
5. `handover_protocols`, `vehicle_checklists`, `key_handovers`, `vehicle_mileage`, `vehicle_vignettes`
6. `fuel_cards`, `vehicle_documents`, `document_folders`, `notifications`
7. `UPDATE drivers SET vehicle_id = NULL`
8. `vehicles`
9. Smazání souborů v úložišti — obsah bucketů `vehicle-documents` a `handover-photos` (nahrané dokumenty, fotky škod a předávacích protokolů) se odstraní i fyzicky.

Akce je nevratná; databáze nemá vlastní zálohu tohoto stavu.

