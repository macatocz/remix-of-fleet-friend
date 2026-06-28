## Plán: Označení minulých rezervací na mobilu

### Problém
Na stránce **/m/rezervace** se zobrazují všechny rezervace bez rozlišení — staré (již ukončené) vypadají stejně jako aktivní. Uživatel chce vidět, že rezervace už není aktivní.

### Řešení
1. **Rozdělit seznam** v `MyReservations.tsx` na dvě logické sekce:
   - **Aktivní a budoucí** — rezervace s `date_to >= dnešek`
   - **Ukončené** — rezervace s `date_to < dnešek`

2. **Vizuální odlišení ukončených rezervací:**
   - Šedší pozadí karty (`bg-muted/40` nebo podobně)
   - Badge **"Ukončeno"** místo stávajícího statusu (nebo vedle něj)
   - Trochu menší kontrast písma pro datum
   - Ukončené rezervace půjdou na konec seznamu

3. **DriverHome (`/m/`) zůstane beze změny** — tam se zobrazují už jen aktivní rezervace.

### Soubory ke změně
- `src/pages/mobile/MyReservations.tsx` — filtrování, řazení a odlišný styl ukončených karet

### Výsledek
Uživatel na mobilní stránce "Moje rezervace" okamžitě pozná, které rezervace jsou aktivní a které už skončily.