

## Mobilní přehled vozidel

Aktuálně `/m/vozidla` zobrazuje desktopovou stránku `Vehicles.tsx` s širokou tabulkou — na 390 px se hůř ovládá. Vytvořím dedikovanou mobilní stránku s kartovým layoutem podobně jako u tankovacích karet.

### Co uvidí uživatel

- **Header**: ikona 🚗 + „Vozidla" + počet (např. „24")
- **Vyhledávání**: jedno pole (RZ, značka, VIN, správce)
- **Filtry** (chipy → bottom sheet):
  - Stav (aktivní / vyřazené / servis)
  - Kategorie (osobní / užitkové / …)
  - Lokalita
- **Seznam karet** — každá karta:
  - Horní řádek: **RZ** (tučně, monospace) + značka (šedé) + barevný badge stavu vpravo
  - 🏷️ Kategorie · 📍 Lokalita
  - 👤 Správce (jméno) — nebo „POOL" badge pokud bez správce
  - Mini řádek upozornění (pokud aktivní): ⚠️ STK / pojištění expiruje do 30 dnů
  - Tap na celou kartu → `/vozidla/:id`
- **Empty state**: ikona + „Žádná vozidla"
- **Loading**: 3× skeleton karta

### Layout

```text
┌─────────────────────────┐
│ 🚗 Vozidla (24)         │
├─────────────────────────┤
│ 🔍 Hledat…              │
│ [Stav▾][Kategorie▾][📍▾]│
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 1AB 2345  Škoda  ●  │ │
│ │ 🏷️ Osobní · 📍 Praha│ │
│ │ 👤 Jan Novák         │ │
│ │ ⚠️ STK do 12 dnů    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Technická realizace

1. **Nový soubor** `src/pages/mobile/MobileVehicles.tsx` — kartový seznam, search + bottom-sheet filtry, navigace na detail.
2. **Routing** v `src/App.tsx`: `/m/vozidla` → `MobileVehicles` (místo desktopového `Vehicles`).
3. **Data**: `vehicles` select všech sloupců + count expirujících `inspections` (STK) a `insurance` join podle `vehicle_id` pro badge upozornění (jeden dotaz každé tabulky, agregace v `useMemo`).
4. **Filtry/search**: client-side `useMemo`. Bottom sheet přes shadcn `Sheet`.
5. **Komponenty**: `Card`, `Badge`, `Input`, `Button`, `Sheet`, `Skeleton` — vše už v projektu.
6. **Konzistence**: stejný vizuální vzor jako `MobileFuelCards.tsx`.

### Co se NEMĚNÍ

- Desktopová `Vehicles.tsx` — beze změny
- Detail vozidla `/vozidla/:id` — beze změny (sdílí se s desktopem)
- Datový model, RLS — beze změny

### Mimo scope (řekni, jestli přidat)

- Tlačítko „+" pro přidání vozidla z mobilu
- Řazení (podle RZ / značky / nejbližší expirace)
- Quick actions přímo na kartě (zápis km, přidat servis)

