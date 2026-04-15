

# Vylepšená kontrola kolizí rezervací

## Změny v `src/pages/Reservations.tsx`

1. **Upravit `checkCollision`** — vrací `{ hardCollision: boolean, softCollision: boolean }`. Dotaz rozšířit o sloupec `status`, rozdělit výsledky na `schváleno` (hard) vs `čeká` (soft).

2. **Nové state** — `confirmOpen: boolean` pro potvrzovací dialog, `pendingPayload: ref` pro dočasné uložení dat před potvrzením.

3. **Upravit `handleSave`**:
   - Hard kolize → destructive toast, stop.
   - Soft kolize (bez hard) → otevřít `AlertDialog` s textem „V tomto čase již existuje neschválená rezervace. Chcete přesto pokračovat?"
   - Žádná kolize → uložit rovnou.

4. **Přidat `AlertDialog`** pro potvrzení měkké kolize — po kliknutí „Pokračovat" se zavolá uložení bez opětovné kontroly kolize.

5. **Extrahovat `saveReservation(payload)`** — společná funkce pro vlastní uložení (insert/update), volaná z `handleSave` i z potvrzovacího dialogu.

Rozsah: 1 soubor, žádné DB migrace.

