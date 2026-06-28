## Aktualizace cestovních sazeb na rok 2026

Z vyhlášky **č. 573/2025 Sb.** (tuzemské stravné, Kč/km, PHM) a vyhlášky **č. 489/2025 Sb.** (zahraniční stravné) přepíšu hodnoty v `src/lib/travel/calc.ts`.

### Tuzemské stravné 2026 (Kč, dolní sazba soukromé sféry)
| Pásmo | 2025 | **2026** |
|---|---:|---:|
| 5–12 h | 166 | **155** |
| 12–18 h | 252 | **236** |
| nad 18 h | 396 | **370** |

> Pozn.: hodnoty pro 2026 jsou *nižší* než 2025 — to odpovídá zdroji (Pohoda portál, 9. 1. 2026). Použiju dolní hranici dle § 163 ZP, stejně jako dnes pro 2025.

### Vlastní vozidlo 2026
| Položka | 2025 | **2026** |
|---|---:|---:|
| Sazba Kč/km (osobní) | 5,80 | **5,90** |
| Benzin 95 (Kč/l) | 39,10 | **34,70** |
| Benzin 98 (Kč/l) | — | **39,00** |
| Nafta (Kč/l) | 37,50 | **34,10** |
| Elektřina (Kč/kWh) | 8,20 | **7,20** |

### Zahraniční stravné 2026
Vyhláška 489/2025 Sb. obsahuje **přes 200 zemí**. Provedu:
- Aktualizaci států, které už v `FOREIGN_MEAL_RATES_BY_YEAR[2026]` máme (jen ty, které dnes reálně používáš — Německo, Rakousko, Slovensko, Polsko, atd.).
- Zbytek nechám zdědit z 2025 jako fallback (lookup vrátí poslední dostupný rok), abychom neblokovali export. Doplňování dalších zemí přidám postupně dle reálného použití nebo po dodání oficiální Excel tabulky z vyhlášky.

### Soubory ke změně
1. `src/lib/travel/calc.ts` — přepsat `MEAL_RATES_BY_YEAR[2026]`, `KM_RATE_BY_YEAR[2026]`, `FUEL_PRICE_BY_YEAR[2026]` (rozšířit o varianty 98 a elektřina, pokud dnes nejsou), a aktualizovat `FOREIGN_MEAL_RATES_BY_YEAR[2026]` pro běžné EU státy.
2. `src/components/settings/TravelRatesSettings.tsx` — pokud přibude sloupec (nafta/elektřina/98), rozšířit přehledovou tabulku.
3. Odebrat komentář „dočasně = 2025" z `calc.ts`.

### Co se nemění
- Logika výpočtu (pásma 1/3, 2/3, plná sazba) zůstává.
- Stará data starých cestovních příkazů se nepřepočtou — výběr sazby je vázán na **datum cesty**.

### Zdroj
Pohoda portál (9. 1. 2026), citace vyhlášek č. 573/2025 Sb. a 489/2025 Sb.

Mám pokračovat?