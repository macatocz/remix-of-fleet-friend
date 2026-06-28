## Bug: úseky/stravné se po uložení neukládají do DB

### Diagnóza
Ověřil jsem v DB: oba existující cestovní příkazy (`CP-2026-0001` i `CP-2026-0002`) mají **0 řádků v `travel_order_legs` i `travel_order_meals`**, přestože parent řádek se aktualizuje (updated_at se mění). Insert sloupců do těchto tabulek prošel ručně přes psql se stejnými daty, takže RLS i schéma jsou OK — bug je ve volání ze `src/pages/TravelOrderDetail.tsx`.

V `save()` (řádky 240–247) jsou tři `await supabase.from(...).insert(...)` **bez kontroly návratového `error`**, a přesto se vždy zobrazí "Uloženo". Skutečná chyba se v UI nikdy neobjeví.

### Pravděpodobné příčiny (jedna nebo více)
1. **Spread extra polí z DB**: pokud uživatel načte existující CP, dostane `meals/legs` se sloupcem `created_at` (jako string). Při dalším save() se přes `{...m, id: undefined}` `created_at` posílá zpět — to projde, ale když je leg/meal nově vytvořený (z `loadFromTripLogs` / `recomputeMeals`), nemá id ale má všechna pole z TS typu — to také projde.
2. **`time_from: t.time?.slice(0,5)`** v `loadFromTripLogs`: pokud trip_log nemá time (null), pošle se `undefined` → OK. Pokud má jiný formát, mohlo by selhat. (Nepravděpodobné.)
3. **Reálná příčina nejspíš**: PostgREST odmítne nějaké pole / hodnotu, ale UI to spolkne. Bez error handlingu netušíme co.

### Plán opravy v `src/pages/TravelOrderDetail.tsx`

1. **Whitelist polí** pro insert (sanitizace), aby do PostgRESTu šly jen sloupce, které existují v cílové tabulce:
   - `travel_order_legs`: `date, time_from, time_to, place_from, place_to, km, transport, note, sort_order, country, timezone, travel_order_id`
   - `travel_order_meals`: `date, hours, country, rate, amount, currency, pocket_money_pct, pocket_money_amount, travel_order_id`
   - `travel_order_expenses`: `type, description, amount, currency, receipt_path, travel_order_id`
2. **Kontrola erroru** u všech tří insertů a delete. Při chybě:
   - Toast s konkrétní chybou Postgresu (nikoli "Uloženo").
   - `return null`, aby workflow funkce nepokračovala.
3. **Sekvenční insert** místo paralelního, aby případná chyba šla přiřadit k tabulce a v toastu se ukázalo „Chyba při ukládání úseků/stravného/výdajů: …".
4. **Coercion typů**:
   - `km` → `Number(l.km) || 0` (sloupec integer).
   - `hours, rate, amount, pocket_money_pct, pocket_money_amount` → `Number(...)` (numeric).
   - prázdné stringy `""` → `null` u všech volitelných text polí (`time_from`, `time_to`, `note`, `description`).
5. **Verifikace v build módu**: po opravě otevřu CP-2026-0002 v Playwright, kliknu Načíst z knihy jízd → Přepočítat stravné → Uložit a ověřím v DB, že `travel_order_legs` a `_meals` mají řádky.

### Co se nemění
Bez změny zůstává: výpočetní logika v `calc.ts`, schéma DB, PDF export, UI komponenty mimo tlačítko Uložit.