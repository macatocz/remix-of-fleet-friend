# Oprava mobilního detailu cestovního příkazu

## Cíl
Po klepnutí na cestovní příkaz v mobilním seznamu vždy otevřít jeho detail a zachovat uživatele v mobilním rozhraní.

## Postup
1. Reprodukovat tok při skutečné mobilní šířce a zaznamenat URL před kliknutím, bezprostředně po kliknutí a po dokončení načítání oprávnění/dat.
2. Opravit místo, které URL přepisuje na `/m` — podle výsledku půjde o navigaci seznamu, ochranný redirect během načítání rolí, nebo obsluhu chybějícího/nepřístupného záznamu.
3. Oddělit stavy detailu: načítání, nalezený příkaz, nenalezený/nepřístupný příkaz. Chyba nesmí uživatele tiše vrátit Domů; zobrazí srozumitelnou zprávu a tlačítko zpět na seznam.
4. Zachovat mobilní adresy `/m/cestovni-prikazy/:id` pro otevření, návrat i uložení; desktopové adresy zůstanou beze změny.
5. Ověřit na mobilním viewportu: otevření existujícího příkazu, přímé načtení detailové URL, návrat do seznamu a otevření nového příkazu.

## Technické poznámky
- Aktuálně jsou mobilní trasy v `App.tsx` definované a seznam naviguje na prefix `/m/cestovni-prikazy/`.
- Detail je sdílený s desktopem a ochranná komponenta obsahuje automatické přesměrování podle role a šířky zařízení; oprava bude cílit jen na potvrzenou větev, která přepis způsobuje.
- Nebudou měněna oprávnění ani obsah cestovních příkazů, pouze směrování a chybové stavy detailu.