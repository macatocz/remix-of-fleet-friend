# Editace rezervací v mobilním zobrazení

## Stav dnes
- Desktop: rezervace lze editovat (kalendář vozidel).
- Mobil (`/m/rezervace`): lze pouze vytvořit novou žádost a zrušit čekající žádost. Editace chybí.

## Cíl
V mobilu půjde upravit vlastní čekající rezervaci (datum, čas, účel, vůz) — stejná pravidla jako na desktopu.

## Kroky
1. **NewReservationDialog.tsx** — přidat režim editace: nová volitelná prop `editReservation` (id + hodnoty); při otevření předvyplní formulář, tlačítko „Uložit změny" místo „Odeslat žádost", submit provede `update` místo `insert`. Validace (kolize, 21denní limit) zůstane stejná.
2. **MyReservations.tsx** — u vlastních čekajících žádostí přidat tlačítko „Upravit" (ikona tužky) vedle „Zrušit"; otevře dialog v režimu editace, po uložení se seznam znovu načte.
3. Schválené rezervace editovat nepůjdou (stejně jako dnes platí workflow: změna = zrušit a zadat znovu, případně upraví správce/admin na desktopu).

## Ověření
- Mobilní náhled: otevřít `/m/rezervace`, upravit čekající žádost, zkontrolovat uložení a přepočet kolizí.

## Technické detaily
- Dotčené soubory: `src/components/mobile/NewReservationDialog.tsx`, `src/pages/mobile/MyReservations.tsx`.
- DB změny: žádné (update přes existující RLS polítík — vlastník čekající žádosti smí update).
