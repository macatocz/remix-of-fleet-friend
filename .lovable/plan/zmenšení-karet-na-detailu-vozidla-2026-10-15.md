# Zmenšení karet na detailu vozidla

Karty na záložce „Údaje" u vozidla jsou zbytečně velké — hodně volného místa, velké odsazení, jen 2 sloupce. Cíl: kompaktnější dlaždice, na široké obrazovce 3 vedle sebe.

## Co se změní

### 1. Menší vnitřní odsazení karet (`src/components/vehicle/InfoCard.tsx`)
- Hlavička karty: `px-5 py-3` → `px-4 py-2.5`
- Obsah karty: `p-5` → `p-4`
- Ikona v hlavičce: `h-7 w-7` → `h-6 w-6`
- Titulek zůstane velkými písmeny, jen o něco menší (`text-xs` místo `text-sm`)

### 2. Hustší řádky údajů (`src/pages/VehicleDetail.tsx`, FieldRow)
- Řádek údaje: `py-1.5` → `py-1`, menší text popisku
- Leasingový blok s pruhy: `p-3` → `p-2.5`

### 3. Tři sloupce na široké obrazovce
- Mřížka karet: `md:grid-cols-2` → `md:grid-cols-2 xl:grid-cols-3`
- Mezery mezi kartami: `gap-6` → `gap-4`
- Karta QR kódu zůstane přes celou šířku, ale zeštíhlí (menší odsazení, QR kód a text vedle sebe)

### 4. Hlavička stránky
- Horní karta s názvem vozu: `p-5` → `p-4`, ikona auta `h-12 w-12` → `h-10 w-10`

## Výsledek (představa)

```text
PŘED (2 sloupce, velké karty):          PO (3 sloupce, kompaktní):
┌──────────────┐ ┌──────────────┐      ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Základní inf │ │ Leasing      │      │ Zákl.   │ │ Leasing │ │ Dokum.  │
│              │ │              │      │ inf.    │ │         │ │ a kontr.│
└──────────────┘ └──────────────┘      └─────────┘ └─────────┘ └─────────┘
┌──────────────┐ ┌──────────────┐      ┌─────────┐ ┌─────────┐
│ Dokumenty    │ │ Provozní     │      │ Provoz. │ │ (QR přes celou šířku,
└──────────────┘ └──────────────┘      │ údaje   │ │  zeštíhlený)        │
                                       └─────────┘ └─────────────────────┘
```

Na mobilu a úzkém displeji zůstane 1 sloupec, na středním 2 — změní se jen hustota.

## Dotčené soubory
- `src/components/vehicle/InfoCard.tsx` — menší odsazení a ikona
- `src/pages/VehicleDetail.tsx` — mřížka 3 sloupce, hustší řádky, zeštíhlená hlavička a QR karta

Data, logika ani ostatní záložky (Kalendář, Dokumenty, Servis…) se nemění — jde čistě o velikost a rozložení karet na záložce Údaje.
