
## Cíl
Odstranit položku **Řidiči** z mobilního zobrazení. Pokud admin potřebuje řidiče spravovat, přepne se na desktop.

## Co se mění

### 1. `src/components/MobileLayout.tsx`
Z pole `moreItems` (drawer „Více") odebrat položku:
```ts
{ url: "/m/ridici", label: "Řidiči", icon: Users },
```
Import `Users` z `lucide-react` ponechat jen pokud se používá jinde, jinak odebrat.

### 2. `src/App.tsx`
V mobilní routě `/m` odebrat řádek:
```tsx
<Route path="ridici" element={<Drivers />} />
```
Import `Drivers` ponechat (používá ho desktop route `/ridici`).

## Co se NEmění
- Desktopová stránka `/ridici` – beze změny
- Spodní hlavní nav (Domů · Vozidlo/Vozidla · Rezervace · Více) – beze změny
- Ostatní položky v „Více" drawer (Servis, Kniha jízd, Škody, Náklady, Karty, Nastavení) – beze změny
- Přepnutí na desktop přes menu v záhlaví funguje dál

## Jak to otestovat
1. Otevřít mobilní zobrazení jako admin → tap **Více** → v gridu **není** žádná dlaždice „Řidiči".
2. Manuálně zadat URL `/m/ridici` → zobrazí se 404 (NotFound).
3. Přepnout se na desktop → `/ridici` funguje dál normálně.
4. Jako řidič / správce → mobilní nav beze změny.
