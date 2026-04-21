
## Mobilní přehled tankovacích karet

Aktuální stránka `/m/tankovaci-karty` zobrazuje desktopovou tabulku `FuelCards.tsx`, která se na 390 px vodorovně přetéká a špatně se ovládá. Vytvořím dedikovanou mobilní stránku s kartovým layoutem.

### Co uvidí uživatel

- **Header**: ikona 💳 + název „Tankovací karty" + počet
- **Vyhledávání**: jedno vstupní pole (RZ, číslo karty, vlastník)
- **Filtry**: dva chipy (Provider, Stav) — tap otevře bottom sheet s výběrem
- **Seznam karet** jako vertikální karty (`Card` komponenta), každá obsahuje:
  - Horní řádek: **RZ vozidla** (tučně) + značka (malé, šedé) + barevný badge stavu vpravo
  - Logo/název providera (MOL/Shell/Bonett) + číslo karty monospace
  - Řádek PIN: `••••` + tlačítko 👁 pro odhalení (toggle per karta)
  - Vlastník (malé, ikona 👤)
  - Platnost do (ikona 📅) — oranžově ⚠️ pokud expiruje do 30 dnů
  - Tap na celou kartu → naviguje na `/vozidla/:id` (detail vozu)
- **Empty state**: ikona + „Žádné tankovací karty"
- **Loading**: skeleton karty (3×)

### Layout

```text
┌─────────────────────────┐
│ 💳 Tankovací karty (12) │
├─────────────────────────┤
│ 🔍 Hledat…              │
│ [Provider ▾] [Stav ▾]   │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 1AB 2345  Škoda  ●  │ │
│ │ MOL · 7012 3456 78  │ │
│ │ PIN: ••••       👁   │ │
│ │ 👤 Jan Novák        │ │
│ │ 📅 31.12.2025       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ...                 │ │
└─────────────────────────┘
```

### Technická realizace

1. **Nový soubor** `src/pages/mobile/MobileFuelCards.tsx` — kartový seznam s filtry, search, toggle PIN, tap → navigate.
2. **Routing** v `src/App.tsx`: cesta `/m/tankovaci-karty` (nebo aktuální mobilní routa) namapovat na `MobileFuelCards` místo desktopového `FuelCards`. Pokud se routa řeší přes `MobileLayout`/`use-mobile`, upravit tam.
3. **Data**: stejný query jako desktop — `fuel_cards` join `vehicles(rz, znacka)`, řazeno podle `created_at desc`.
4. **Filtry/search**: client-side přes `useMemo`. Bottom sheet pomocí `Sheet` z shadcn (nebo `Select` s velkým triggerem — vyberu Sheet pro lepší mobilní UX).
5. **Komponenty**: `Card`, `Badge`, `Input`, `Button`, `Sheet`, `Skeleton` — vše už v projektu.
6. **Drawer „Více"**: položka „Tankovací karty" zůstává a vede na `/m/tankovaci-karty`.

### Co se NEMĚNÍ

- Desktopová stránka `FuelCards.tsx` — beze změny
- Tabulky karet uvnitř detailu vozu (`VehicleFuelCards.tsx`) — beze změny
- Datový model, RLS — beze změny

### Dotazy mimo scope

Pokud chceš na mobilu i **přidávat/upravovat/mazat** karty (zatím jen prohlížení), řekni — přidám tlačítko „+" v headeru a bottom-sheet formulář.
