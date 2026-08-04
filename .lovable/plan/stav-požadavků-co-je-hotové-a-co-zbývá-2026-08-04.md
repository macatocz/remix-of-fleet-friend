## Stav požadavků — co je hotové a co zbývá

### Hotovo
1. **Kategorie A/B/C/D** — v detailu vozidla je výběr A – Ředitel, B – Management, C – Konzultant, D – Referent. Nový požadavek zmiňuje jen A/B/C (B včetně TDS) — je potřeba rozhodnout, zda kategorii D zrušit.
2. **Přejmenování aut** — existuje sloupec „Název vozu" (např. „Pool PHA 1 VW Golf", „Táborský VW Golf"), doplněný u všech vozidel, s tlačítkem „Návrh názvu".
3. **Předání / převzetí zpětně** — v dialogu Nový protokol lze zadat libovolné datum a čas (i minulé). Navíc je tam výběr řidiče a pole „Zjištěná poškození" s automatickým založením škody.
4. **Cestovní příkazy — PDF** — vlastní šablona s českou diakritikou, více měnami, kurzy ČNB a workflow schvalování.

### Zbývá zapracovat
5. **POOL — hlavní uživatel** — u POOL vozidel doplnit podřádek „hlavní uživatel" (platí pro LBC + Brno); v Praze číslování Pool 1 / 2 / 3.
6. **Rezervace — výběr vozidla podle názvu + SPZ** — dnes se nabízí „Značka (RZ)"; přepnout na „Název vozu — RZ" ve všech formulářích rezervací (web i mobil) a ve filtrech.
7. **Rezervace — účel jako výběr** — nahradit volný text výběrem **Pracovně / Soukromě / Jiné** (u „Jiné" doplňující text). Uloží se strukturovaně, aby šlo filtrovat a počítat soukromé jízdy.
8. **Škody — tlačítko „+ Nová škoda"** — hlavní menu Škody dnes umí jen přehled, chybí zakládání záznamu. Přidat dialog stejně jako u Servisu.
9. **Kniha jízd v hlavním menu — smazat** — odstranit položku z levého menu i z mobilní verze; zápis zůstane u každého vozidla.
10. **Notifikace k cesťáku u rezervací nad 5 hodin** — automatické upozornění (pouze pro režii), že je potřeba vyplnit cestovní příkaz.
11. **Limity rezervací** — maximálně 21 dní dopředu; u soukromých rezervací limit 1 víkend + 5 pracovních dní v měsíci na zaměstnance, po vyčerpání srozumitelná hláška.
12. **Hlídání počtu soukromých rezervací** — přehled čerpání limitu pro zaměstnance i pro správce (navazuje na body 7 a 11).

### Technické poznámky
- Body 7, 11 a 12 spolu souvisí: bez pole „účel = soukromě" nelze limity hlídat, proto je vhodné je udělat jako jeden celek.
- Body 6, 8 a 9 jsou rychlé úpravy rozhraní, dají se udělat hned.
- Bod 10 vyžaduje pravidelnou úlohu na backendu (kontrola rezervací + odeslání notifikace).