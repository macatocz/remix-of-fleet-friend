# Návrh dalších vylepšení aplikace

## Aktuální stav

Aplikace již pokrývá jádro správy vozového parku: evidence vozidel, řidičů, rezervací, servis, škody, náklady, tankovací karty, cestovní příkazy, knihu jízd, leasingový nájezd, mobilní verzi, offline frontu, notifikace, RLS a administrátorské zakládání uživatelů. Dashboard je graficky propracovaný, responzivní a kompaktní.

Zbývá ale dokončit několik otevřených požadavků a existuje prostor pro další provozně užitečné funkce.

## Balíček 1 — Dokončit otevřené požadavky (priorita 1)

Tyto body jsou již v plánu a čekají na zapracování:

1. **POOL — hlavní uživatel**
   - U POOL vozidel doplnit podřádek „hlavní uživatel“ (LBC + Brno).
   - V Praze číslování Pool 1 / 2 / 3.
   - Aktualizovat logiku generování názvu vozu a rezervace.

2. **Rezervace — výběr vozidla podle názvu + SPZ**
   - Ve všech rezervačních formulářích (web, mobil, kalendář) nabízet „Název vozu — RZ“ místo „Značka (RZ)“.
   - Totéž ve filtrech.

3. **Rezervace — účel jako výběr**
   - Nahradit volný text výběrem **Pracovně / Soukromě / Jiné** (u „Jiné“ doplňující text).
   - Uložit strukturovaně pro filtrování a statistiky soukromých jízd.

4. **Škody — tlačítko „+ Nová škoda“**
   - V hlavním menu Škody přidat možnost založit záznam, nejen prohlížet.

5. **Kniha jízd v hlavním menu — smazat**
   - Odstranit položku z levého menu i z mobilní navigace; zápis zůstane u vozidla / mobilní FAB.

6. **Limity rezervací**
   - Maximálně 21 dní dopředu.
   - Soukromé rezervace: 1 víkend + 5 pracovních dní v měsíci na zaměstnance.
   - Srozumitelná hláška po vyčerpání limitu.

7. **Hlídání počtu soukromých rezervací**
   - Přehled čerpání limitu pro zaměstnance i správce.
   - Navazuje na bod 3 (účel) a 6 (limity).

8. **Notifikace k cesťáku u rezervací nad 5 hodin**
   - Pravidelná kontrola schválených rezervací > 5 hodin a upozornění pro režii.

## Balíček 2 — Provozní vylepšení pro správce (priorita 2)

9. **Hromadný import aktuálního stavu tachometru**
   - Rozšířit import vozidel nebo přidat samostatný import o stavu tachometru (datum, km, poznámka) pro naplnění tabulky `vehicle_mileage`.

10. **Automatické emailové notifikace správcům**
    - Před koncem STK, pojištění, leasingu, servisního plánu.
    - Souhrnný týdenní přehled.
    - Nastavitelné v Settings → Notifikace.

11. **Globální vyhledávání**
    - Hledat vozidlo, řidiče, rezervaci, servisní záznam, škodu z jednoho pole v hlavičce.
    - Rychlé prokliky na detail.

12. **Hromadné operace ve výpisu vozidel**
    - Hromadný změna statusu, kategorie, správce, lokality.
    - Hromadný export QR kódů.

13. **Tisk / generování PDF karty vozidla**
    - A4 kartička s QR kódem, SPZ, názvem, správcem, kontakty, informacemi o pojištění a STK.
    - Užitečné pro předání klíčů nebo umístění ve vozidle.

## Balíček 3 — Pohodlí řidičů a mobil (priorita 2)

14. **Mobilní notifikace o schválení / zamítnutí rezervace**
    - Push notifikace při změně stavu rezervace.
    - Před začátkem rezervace (připomenutí).

15. **Rychlé fotografie k škodě / předávacímu protokolu**
    - Přímé přidání fotek z mobilu s kompresí a uploadem do storage.
    - RLS omezení na vlastníka / správce / admin.

16. **Sdílení rezervace / vozidla odkazem**
    - Krátký odkaz pro kolegu: „Toto auto mám rezervované, klikni a podívej se.“
    - Interní odkazy bez veřejného přístupu.

17. **One-tap hlášení „auto potřebuje čističku / defekt / jiný problém“**
    - V mobilním FAB rychlá volba s předvyplněným vozem a typem problému.

## Balíček 4 — Reporting a analytika (priorita 3)

18. **Měsíční / čtvrtletní report vozového parku**
    - Stránka s klíčovými metrikami: náklady na km, průměrná spotřeba, vytížení vozidel, počet soukromých jízd, náklady na servis, leasingové čerpání.
    - Export do PDF / Excel.

19. **Porovnání vozidel**
    - Vybrat 2–4 vozidla a porovnat náklady, spotřebu, nájezd, frekvenci servisu.

20. **Hlídání spotřeby a nákladu na km**
    - Výpočet reálné spotřeby z tankování a ujetých km.
    - Alert při výrazném nárůstu spotřeby nebo nákladů.

## Doporučené pořadí

```text
1. týden: Balíček 1 (dokončení otevřených požadavků)
2. týden: Balíček 2 (správci — import tachometru, notifikace, globální vyhledávání)
3. týden: Balíček 3 (mobilní vylepšení)
4. týden: Balíček 4 (reporting a analytika)
```

## Technické poznámky

- Všechny nové funkce využívají existující Lovable Cloud backend (Supabase) a designové tokeny.
- Notifikace a reporty mohou používat stávající Edge Functions (`notify-*`, `cnb-rates`).
- Mobilní fotky vyžadují storage bucket s RLS omezením podle vozidla / řidiče.
- Hromadné operace a globální vyhledávání se dají realizovat čistě na frontendu s existujícími daty.
