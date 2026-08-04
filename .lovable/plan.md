# Hlídání nájezdu u operativního leasingu

## Odpověď na dotaz

Ano, logika hlídání v aplikaci **je**, ale prakticky **nefunguje**, protože nemá data.

Ověřeno v databázi a v kódu:
- Výpočet čerpání nájezdu je v `VehicleAlerts` (detail vozu) i `VehicleNotifications` (dashboard) — porovnává ujeté km s poměrnou částí smluvního nájezdu a hlásí 70 % / 80 % / >95 %.
- Zdrojem je tabulka `vehicle_mileage`, která má **0 záznamů**, a v aplikaci **není žádné místo, kde by se do ní zapisovalo**. Výpočet navíc vyžaduje minimálně 2 záznamy, takže se alert nikdy nezobrazí.
- Přitom v knize jízd je 90 záznamů se stavem tachometru (`km_end`), u 22 vozů je vyplněn výchozí stav tachometru, u 24 nájezd/rok a 25 vozů je na leasing.

## Co navrhuji doplnit

1. **Automatický zdroj stavu tachometru** — aktuální km se odvodí z nejvyššího `km_end` v knize jízd daného vozu; pokud kniha nic nemá, použije se výchozí stav tachometru z karty vozu. Ruční záznam do `vehicle_mileage` má přednost, když je novější.

2. **Ruční zápis stavu tachometru** — malý formulář v detailu vozu (sekce Nájezd): datum, km, poznámka + historie záznamů. Tím se `vehicle_mileage` konečně plní.

3. **Panel „Čerpání nájezdu“ v detailu vozu** (jen u operativního leasingu):
   - smluvní nájezd celkem = nájezd/rok × doba leasingu
   - ujeto k dnešku, plán k dnešku, rozdíl (+/− km)
   - **progress bar s barvou podle stavu** (zelená < 70 %, žlutá 70–80 %, oranžová 80–95 %, červená > 95 %)
   - **minigraf** vývoje km v čase (skutečný vs. plánovaný průběh leasingu)
   - odhad nájezdu ke konci leasingu při současném tempu (km/měsíc) a předpokládané přejetí/nedojetí v km

4. **Oprava výpočtu alertů** — místo „nejnovější minus nejstarší záznam“ se ujeté km počítají jako `aktuální tachometr − výchozí stav tachometru`, takže stačí jediný údaj. Alerty tak začnou fungovat.

5. **Přehled napříč flotilou** — na dashboardu karta „Čerpání nájezdu leasingových vozů“ seřazená podle odchylky od plánu, s prokliky na vozy.

## Technické detaily

- Nový sdílený modul `src/lib/leasing/mileage.ts` s funkcemi pro odvození aktuálního tachometru a výpočet čerpání (smluvní km, plán k dnešku, odchylka, projekce ke konci). Použije ho `VehicleAlerts`, `VehicleNotifications`, detail vozu i dashboard — dnes je vzorec duplikovaný na dvou místech.
- Bez změny schématu; `vehicle_mileage` se jen začne používat pro zápis.
- Unit testy na výpočet čerpání a projekce (mezní případy: chybějící datum zahájení, nulový nájezd/rok, leasing po konci).