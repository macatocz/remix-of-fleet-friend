## Cíl
Umožnit v protokolu Předání / Převzetí vozidla ručně zadat datum a čas — tj. zapsat protokol i **zpětně** (např. auto bylo předáno včera, ale zapisuji dnes).

## Současný stav
- Tabulka `handover_protocols` už má sloupec `date timestamptz NOT NULL DEFAULT now()` — datové úložiště je připravené.
- Komponenta `src/components/VehicleHandover.tsx` (dialog „Nový protokol") ale pole pro datum **neobsahuje** — vždy se uloží aktuální čas.
- Žádná jiná obrazovka backdate neumožňuje.

## Návrh změny
Jen frontend úprava v `src/components/VehicleHandover.tsx`:

1. Do formuláře přidat pole **Datum a čas předání** (`<Input type="datetime-local">`), předvyplněné na „teď".
2. Uložit jeho hodnotu do sloupce `date` (převod na ISO). Když uživatel pole nezmění, chová se to jako dnes.
3. V seznamu protokolů datum už zobrazujeme (`new Date(p.date).toLocaleString`) — beze změny.

Mobilní `KeyHandoverDialog` (klíče) se netýká — to je jiný modul (`key_handovers`).

## Rozsah
- 1 soubor: `src/components/VehicleHandover.tsx` (přidat pole do `form` state, do dialogu, poslat do `insert`).
- Bez DB migrace, bez změn RLS, bez změn typů.
