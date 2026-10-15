# Oprava QR kódu na PDF kartě vozidla

## Problém
Na vytištěné kartě vozidla (PDF) zasahují vodorovné čáry záhlaví přímo do QR kódu vpravo nahoře — kód je hůř čitelný a štítek působí neprofesionálně.

- Čára pod záhlavím se kreslí přes celou šířku stránky (15–195 mm) ve výšce 31 mm.
- QR kód sedí vpravo nahoře ve výšce 12–46 mm, takže ho čára protíná v polovině.
- Linka první sekce „Základní údaje" (43 mm) škrtá o spodní hranu kódu a jeho popisek.

## Co změníme

1. **Zkrácení čáry pod záhlavím** — povede jen od levého okraje po začátek QR kódu (s malou mezerou), do kódu už nezasáhne.
2. **Posunutí první sekce pod QR kód** — sekce „Základní údaje" začne až pod QR kódem a jeho popiskem (cca 54 mm), žádná další celošířková čára do prostoru kódu nevstoupí.
3. **Čistý ochranný prostor kolem QR kódu** — kód zůstane na čistém bílém poli, aby byl spolehlivě čitelný foťákem i po vytištění.

Obsah karty, barvy (firemní červená/šedá), rozložení sekcí ani název souboru se nemění.

## Technické poznámky
- Dotčený soubor: `src/lib/vehicle/cardPdf.ts` (funkce `generateVehicleCardPdf`).
- Čára záhlaví: `doc.line(M, y, W - M, y)` → zkrátit na `W - M - 40` (QR široký 34 mm + mezera).
- První `section("Základní údaje")` posunout pod QR: `y = Math.max(y, 54)`.
- Mřížka QR kódů (`generateQrSheetPdf`) problém nemá — nemění se.

## Ověření
- Stáhnout kartu vozidla BMW v náhledu a zkontrolovat, že žádná čára QR kód neprotíná a kód je čitelný.
