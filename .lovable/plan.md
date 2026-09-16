# Rozšíření možností řidiče

Řidič dnes umí: rezervace, tankovací karta, parkování, předání vozu, rychlý zápis jízdy a nahlášení škody bez fotky. Přidáme tři nové funkce a plnohodnotný desktop pohled.

## 1. Hlášení závady s fotkou (mobil)

- `QuickIncidentDialog` doplníme o pořízení/nahrání fotek (foťák na mobilu).
- Nové privátní úložiště fotek závad; fotky se vážou k hlášení (existující tabulka `incident_photos`).
- Fotky uvidí řidič u svého hlášení i dispečer/admin v detailu škody.

## 2. Moje jízdy a historie (mobil)

- Nová mobilní stránka „Moje jízdy": seznam vlastních jízd řidiče, součet km za aktuální měsíc, filtrování po měsících.
- Tlačítko pro zápis nové jízdy (stávající rychlý dialog), editace/smazání vlastních jízd.
- Položka v dolní navigaci nebo v rychlých akcích na Domů.
- Ověřit/doplnit přístupová pravidla, aby řidič četl a upravoval jen své jízdy.

## 3. Notifikace k rezervacím

- Při schválení nebo zamítnutí rezervace se řidiči vytvoří notifikace (databázový trigger → tabulka `notifications`).
- Zvoneček s notifikacemi se přidá do mobilní hlavičky (existující `NotificationBell`).
- Pokud má řidič povolené push oznámení, odešle se i push (existuje funkce `notify-send`).
- Text notifikace obsahuje vůz, termín a výsledek; klik vede na „Moje rezervace".

## 4. Desktop pohled pro řidiče (návrh)

Dnes řidič na počítači vidí jen roztažené mobilní rozhraní. Nově dostane vlastní zjednodušenou desktop stránku — jen to, co potřebuje:

```text
┌──────────────────────────────────────────────────────┐
│  CM Fleet                        🔔  Martin H.  ▾    │
├──────────────────────────────────────────────────────┤
│  Dobrý den, Martine                                  │
│                                                      │
│  ┌─ Můj vůz ──────────┐  ┌─ Nadcházející rezervace ┐ │
│  │ POOL PHA 2 · 1ANM..│  │ št 17.9. 8:00–16:00     │ │
│  │ Kde stojí: CGC 215 │  │ POOL PHA 1 · schváleno  │ │
│  │ Tankovací karta ▸  │  │                         │ │
│  └────────────────────┘  └─────────────────────────┘ │
│                                                      │
│  Rychlé akce:  [Najít volný vůz] [Nová rezervace]    │
│                [Nahlásit závadu] [Zapsat jízdu]      │
│                                                      │
│  ┌─ Moje jízdy tento měsíc ────────────────────────┐ │
│  │ 12 jízd · 842 km                                 │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

- Centrovaný obsah, žádné administrátorské menu ani data ostatních.
- Stejné komponenty jako mobil (parkování, tankovací karta), jen jinak rozložené.
- Řidič s rolí „ridic" se na desktopu dostane vždy sem; admin/dispečer beze změny.

## Technické poznámky

- Migrace: nový bucket `incident-photos` (privátní) + pravidla pro nahrání/čtení fotek; trigger na změnu `reservations.status` → vložení notifikace; kontrola RLS `trip_logs` (čtení/editace vlastních jízd) a `incidents` (vložení s fotkami).
- Nové soubory: `src/pages/mobile/MyTrips.tsx`, `src/pages/DriverDesktopHome.tsx`; úpravy `QuickIncidentDialog.tsx`, mobilní hlavička, `ProtectedRoute.tsx`, dolní navigace.
- Notifikace využijí existující tabulky `notifications` a funkci `notify-send` (žádná nová push infrastruktura).

## Co se nemění

- Pohledy admina/dispečera, stávající mobilní funkce řidiče, data ani role.
