# Kompletní přehled nevyplněných údajů

Nový soubor `kompletni-prehled-chybejicich-udaju.xlsx` (jen ke čtení, pro kolegyni). Bude kontrolovat **každé pole** všech záznamů, ne jen vybrané údaje.

## Co se bude kontrolovat
- **Vozidla:** všechna pole karty vozu (základní údaje, doklady, termíny, leasing, zázemí, poznámky…).
- **Tankovací karty:** každá karta zvlášť – číslo, PIN, platnost, držitel, poskytovatel (ze 42 karet nemá 11 vyplněné číslo a 12 platnost).
- **Pojištění, STK a prohlídky, dálniční známky, servisní plány:** u kterých aut záznam úplně chybí a které vyplněné záznamy jsou neúplné.
- **Řidiči:** telefon, e-mail, oddělení, propojení s uživatelským účtem.
- **Tachometr:** auta bez aktuálního odečtu.

Pole, která nedávají smysl, se označí N/A, např. leasing u aut ve vlastnictví firmy. Volitelná pole se jen označí jako volitelná, aby nepůsobila jako chyba.

## Listy
1. **Souhrn:** počty podle oblasti a podle údaje.
2. **Podle auta:** jeden řádek = auto a úplný výčet všeho, co u něj chybí (včetně karet a pojištění).
3. **Detail:** jeden řádek = jeden chybějící údaj (oblast, záznam, pole, priorita), s filtrem.
4. Samostatné listy **Tankovací karty** a **Řidiči**.

Před předáním výsledek porovnám s databází, aby žádný prázdný údaj nechyběl.
