Zjistil jsem, proč ho nevidíš: generátor byl přidaný do starší komponenty knihy jízd, ale detail vozidla teď používá novější inline knihu jízd, kterou máš na screenshotu.

Plán úpravy:
1. Přidat tlačítko `Vygenerovat měsíc` přímo do horní lišty aktuální knihy jízd na screenshotu, vedle `Šablony` / `Excel` / `Řádek`.
2. Napojit existující dialog generátoru na aktuální komponentu `VehicleTripLogInline`.
3. Po hromadném potvrzení nechat knihu jízd znovu načíst záznamy pro daný měsíc, aby se vygenerované jízdy ihned zobrazily.
4. Nezasahovat do logiky generátoru ani do databáze, pouze ho zpřístupnit na správném místě v UI.