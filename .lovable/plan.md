## Návrh workflow cestovního příkazu

Aktuálně máme v kódu nekonzistentní stavy — na seznamu jsou tři (`koncept`, `schvaleny`, `vyuctovany`), v detailu čtyři jiné (`koncept`, `zadost_schvalena`, `vyuctovano`, `schvaleno`). Sjednotíme to do jednoho jasného workflow, který odpovídá reálnému průběhu cesťáku: **žádost → schválení žádosti → cesta → vyúčtování → schválení vyúčtování**.

### Navrhované stavy (6)

```text
[Koncept] → [Žádost podána] → [Žádost schválena] → [Na cestě] → [Vyúčtováno] → [Schváleno]
                    ↓                  ↓
              [Zamítnuto]         [Zamítnuto]
```

| Stav | Popis | Kdo mění |
|---|---|---|
| **Koncept** | Řidič vyplňuje, ještě neodeslal | Řidič |
| **Žádost podána** | Odesláno ke schválení cesty (před výjezdem) | Řidič → auto při odeslání |
| **Žádost schválena** | Vedoucí povolil cestu | Admin/Dispečer |
| **Na cestě** | Cesta probíhá / proběhla, čeká na vyúčtování | Auto po datu odjezdu, nebo řidič |
| **Vyúčtováno** | Řidič doplnil útraty, stravné, km a odeslal | Řidič |
| **Schváleno** | Vyúčtování schváleno, připraveno k proplacení | Admin/Dispečer |
| **Zamítnuto** | Zamítnuto v jakékoli fázi (s poznámkou) | Admin/Dispečer |

### Vizuální prvky

1. **Stepper v detailu příkazu** — vodorovná lišta nahoře s 5 kroky (Koncept → Žádost → Schválení → Vyúčtování → Proplacení). Aktivní krok modře, hotové zeleně, neaktivní šedě, zamítnuté červeně. Pod stepperem malé info „kdo & kdy" u každého kroku (např. „Schválil: Novák, 14.7. 10:30").
2. **Barevné badge v seznamu** — každý stav má vlastní barvu (koncept = outline, žádost = žlutá, schváleno žádosti = modrá, na cestě = fialová, vyúčtováno = oranžová, schváleno = zelená, zamítnuto = červená).
3. **Kontextová tlačítka** — v detailu se zobrazí jen akce dostupné pro aktuální stav a roli (např. „Odeslat žádost" jen v konceptu, „Schválit žádost" jen adminovi u stavu „Žádost podána", „Zamítnout" s dialogem pro poznámku).
4. **Filtry v seznamu** — chipy nahoře („Vše / Čeká na mě / Koncepty / Na cestě / K proplacení") pro rychlou orientaci.
5. **Notifikace** — když přijde příkaz ke schválení, admin/dispečer dostane notifikaci (přes existující `notifications` tabulku a bell).

### Technické změny

- **DB migrace**: sjednotit hodnoty ve sloupci `travel_orders.status` (mapování starých hodnot na nové), volitelně přidat `enum` typ `travel_order_status`. Sloupce pro audit už v tabulce jsou (`request_approved_by/at`, `report_submitted_by/at`, `report_approved_by/at`) — přidáme jen `rejected_by`, `rejected_at`, `rejection_reason`.
- **`src/pages/TravelOrders.tsx`** — rozšířit `STATUS_LABEL` a `STATUS_VARIANT` na všech 7 stavů, přidat filtrovací chipy.
- **`src/pages/TravelOrderDetail.tsx`** — nová komponenta `TravelOrderStepper`, přepracovat akční tlačítka podle stavu + role (`useAuth().roles`), dialog pro zamítnutí s poznámkou.
- **Notifikace** — v `save()` po přechodu do stavu „Žádost podána" nebo „Vyúčtováno" vytvořit řádek v `notifications` pro adminy/dispečery.

### Otázky před implementací

1. Souhlasíte s navrženými 6 stavy, nebo chcete něco zjednodušit / přidat (např. samostatný stav „Proplaceno")?
2. Kdo má právo schvalovat — jen `admin`, nebo i `dispatcer`?
3. Má být „Žádost schválena" povinný krok (před výjezdem), nebo jen volitelný (některé cesty jdou rovnou do vyúčtování)?