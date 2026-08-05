# Mobilní zobrazení Nákladů — optimalizace

Stránka `/m/naklady` dnes používá stejnou desktopovou komponentu jako web (`Costs`). Ta obsahuje široké tabulky (7 sloupců), grafy s pevnými šířkami os a filtry vedle sebe — proto se obsah v mobilu posouvá do stran.

## Co udělám

Vytvořím samostatnou mobilní stránku Nákladů, kterou napojím na `/m/naklady`. Desktop verze zůstane beze změny.

**Obsah mobilní verze:**
- Hlavička s filtry pod sebou na plnou šířku (Rok + Vozidlo), sticky nad obsahem.
- 4 souhrnné dlaždice v mřížce 2×2 (PHM, Servis, Celkem, Km) — kompaktní, zalomení dlouhých čísel.
- Graf měsíčních nákladů: nižší výška, menší písmo os, zkrácené popisky měsíců, bez legendy nad grafem (legenda jako dva malé štítky).
- Rozložení nákladů: místo koláče s popisky vedle výseků dva řádky s podílem a částkou (přehlednější na úzké obrazovce). Volitelně malý donut bez textových popisků.
- Nejnákladnější vozidla: seznam řádků s vodorovným pruhem podílu místo grafu s 180px osou.
- Nájezd km: jednoduchá spojnice s menšími osami.
- Záložky Tankování / Servis: místo tabulek **karty** — každý záznam jako řádek s datem, vozidlem, trasou/popisem a částkou vpravo; ostatní údaje jako drobný podtext. Stránkování „Načíst další“ po 20 záznamech.

**Proti přetékání:** kontejner s `w-full max-w-full overflow-x-hidden`, dlouhé texty s `truncate`/`break-words`, grafy v `ResponsiveContainer` bez pevných minimálních šířek.

## Technické detaily

- Nový soubor `src/pages/mobile/MobileCosts.tsx` (načítání dat stejné dotazy jako v `src/pages/Costs.tsx`).
- `src/App.tsx`: mobilní route `naklady` přepnout z `Costs` na `MobileCosts`.
- Žádné změny v databázi.
