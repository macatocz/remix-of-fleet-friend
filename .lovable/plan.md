# Varianta A s viditelnými upozorněními

Upravit grafický návrh varianty A se dvěma záložkami. Aplikaci zatím neměnit; implementace přijde až po potvrzení výsledného vzhledu.

## Upozornění vždy na očích
- Nad přepínačem **Operativa a termíny / Náklady a analytika** umístit kompaktní pás **Vyžaduje pozornost**. Bude společný pro oba pohledy, nezávislý na finančních filtrech.
- Ukázat počty upozornění podle naléhavosti a konkrétní nejbližší události, například „VW Passat · Zelená karta končí za 12 dní“ nebo „BMW M340i · Leasing končí za 73 dní“.
- Každé upozornění bude obsahovat vozidlo a RZ, typ termínu, datum a počet zbývajících dní; po termínu červeně, blížící se termíny podle naléhavosti.
- Počítat s rozbalením všech upozornění a proklikem do detailu vozu. Při velkém počtu položek pás nezahltí stránku.

## Podrobnosti v operativě
- Karta **Blížící se termíny** bude obsahovat STK, **Zelené karty**, pojištění, leasing a servis s možností filtrovat podle typu.
- Zachovat průběhové lišty a leasingové varování do 90 dní před koncem.
- Horní pás bude stručným souhrnem; podrobný seznam zůstane v operativě, nikoli dalším duplicitním dlouhým seznamem.
- Zelená karta a pojištění budou jasně pojmenované, aby nebylo nejasné, který konkrétní doklad končí.

## Výstup návrhu
- Dva nové obrázky: operativní a finanční záložka se stejným pásem upozornění nahoře.
- Zachovat červeno-šedou identitu, české popisky a stejné ilustrativní údaje jako v předchozím návrhu.
- Nové obrázky uložit jako další verze, původní návrhy ponechat.

## Technické poznámky pro následnou implementaci
- Současný dashboard již zobrazuje upozornění na zelené karty prostřednictvím `VehicleNotifications`; seznam `DeadlinesCard` nyní zahrnuje STK, pojištění, leasing a servis. Při implementaci sjednotit jejich prezentaci, aby zelené karty byly také v detailním přehledu.
- Zachovat současné zdroje údajů i výpočty; tento krok nemění zasílání push zpráv, e-mailů ani varovné prahy zelených karet.
- Nyní upravit pouze grafické návrhy, bez zásahu do aplikace nebo databáze.