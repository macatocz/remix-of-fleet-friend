

# Mini DMS — složková struktura dokumentů

Aktuálně jsou dokumenty zobrazeny jako plochý seznam s filtrováním podle kategorie (select box). Vylepšíme to na složkovou strukturu — kategorie se zobrazí jako složky, do kterých se „vstupuje".

## Jak to bude fungovat

```text
┌─────────────────────────────────────────────┐
│ 📁 Technický průkaz          (2 soubory)    │
│ 📁 Pojistná smlouva          (1 soubor)     │
│ 📁 STK protokol              (3 soubory)    │
│ 📁 Servisní záznam           (0 souborů)    │  ← skryté nebo šedé
│ 📁 Faktury                   (5 souborů)    │
│ 📁 Ostatní                   (1 soubor)     │
│                                              │
│  [+ Nahrát dokument]                        │
└─────────────────────────────────────────────┘

Po kliknutí na složku:
┌─────────────────────────────────────────────┐
│ ← Zpět na složky   |   📁 STK protokol     │
│                                              │
│  📄 STK_2024.pdf     120 KB   15.3.2024  ⬇🗑│
│  📄 STK_2023.pdf      98 KB   12.3.2023  ⬇🗑│
│  📄 STK_2022.pdf     105 KB    8.3.2022  ⬇🗑│
│                                              │
│  [Přetáhněte soubory sem / Nahrát]          │
└─────────────────────────────────────────────┘
```

## Změny

### 1. Složkový pohled (výchozí)
- Kategorie zobrazeny jako klikatelné karty/řádky s ikonou složky a počtem souborů
- Prázdné složky zobrazeny šedě (nebo skryté — dle preference)
- Klik na složku → zobrazí obsah dané kategorie

### 2. Detail složky
- Breadcrumb / tlačítko „← Zpět" pro návrat na přehled složek
- Název aktuální složky v hlavičce
- Seznam dokumentů v dané kategorii (stávající design řádků)
- Upload zóna s drag & drop — automaticky nastaví kategorii podle aktuální složky

### 3. Upload z přehledu složek
- Tlačítko „Nahrát dokument" dostupné i z hlavního pohledu — otevře dialog s výběrem kategorie
- Při uploadu ze složky se kategorie předvyplní

### 4. Možnost přejmenovat/přidat vlastní složku (volitelné)
- Zatím ponecháme pevný seznam kategorií, ale připravíme strukturu pro budoucí rozšíření

## Rozsah
- 1 soubor: `VehicleDocuments.tsx` (přepracování UI logiky)
- 0 DB migrací (sloupec `category` v `vehicle_documents` zůstává)
- Stávající data zůstanou beze změny — kategorie = název složky

