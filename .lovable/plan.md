# Inspirace z Fleetio – co zapracovat do CMFleetu

## Shrnutí analýzy Fleetio

Fleetio (www.fleetio.com) je americká "maintenance-first" platforma pro správu vozového parku. Cení se od ~4 USD/vozidlo/měsíc, neomezený počet uživatelů, mobilní app Fleetio Go. Klíčové silné stránky:

- **Servisní workflow** (Work Orders) se stavy, přiřazením technikům a historií.
- **Sklad náhradních dílů** s vazbou na servisní zakázky.
- **Digitální inspekce/DVIR** s fotkami, závadami a eskalací do servisu.
- **Otevřené API + webhooky** a integrační marketplace (telematika, palivové karty, pneu, mýtné).
- **Vendor Network** – přímé napojení na servisní partnery.
- **Custom fields, TCO reporting, asset lifecycle** (pořízení – provoz – remarketing).

Fleetio **nemá vlastní GPS/telematiku** – slouží jako centrální datový hub napojený na Samsara, Geotab, Motive apod.

## Aktuální stav CMFleetu

Aplikace už má solidní základ:

- Evidence vozidel, řidičů, rezervací, kalendář.
- Kniha jízd s Excel-like zadáváním, generátorem jízd, offline frontou.
- Servisní záznamy, škody, náklady, tankovací karty, cestovní příkazy.
- Leasing, dokumenty, QR kódy, notifikace, reporty.
- PWA mobilní aplikace, push notifikace.
- Role (Admin, Dispečer, Řidič) a přístupová právia přes RLS.

## Mezery vůči Fleetiu a doporučení k zapracování

### 1. Servisní zakázky se workflow (Work Orders)

Fleetio má plný životní cyklus servisní zakázky: naplánováno → v servisu → hotovo → fakturováno. Dnes má CMFleet jen servisní záznam po události.

**Doporučení:** Přidat tabulku `work_orders` s přechody stavů, přiřazením technika/řidiče, odhadem nákladů, fotkami a vazbou na konkrétní vozidlo. Umožnit objednávku servisu z aplikace.

### 2. Evidence náhradních dílů a skladu

Fleetio umí skladové hospodářství dílů, spotřebu na work ordery, LIFO/FIFO.

**Doporučení:** Přidat jednoduchý sklad dílů (parts_inventory) s příjmem/spotřebou a vazbou na work orders. Pro začátek stačí základní evidence bez plného účetnictví skladu.

### 3. Digitální kontroly vozidla (DVIR) s fotkami

Fleetio Go umožňuje řidičům/technikům dělat předjízdní kontroly s fotkami a automaticky vytvářet servisní issue.

**Doporučení:** Rozšířit existující kontrolní listy (vehicle_checklists) o šablony (před jízdou, po jízdě, STK), fotodokumentaci a možnost vytvořit servisní záznam/work order z nalezené závady.

### 4. Otevřené API a webhooky

Fleetio nabízí REST API od středního tarifu. CMFleet dnes API nemá.

**Doporučení:** Vystavit základní REST API (Supabase PostgREST už podporuje čtení, ale potřebujeme dokumentaci, rate limiting, token management). Přidat webhooky pro klíčové události (nová rezervace, servis, nehoda). Produkčně je to nutné pro ERP integrace a telematiku.

### 5. Integrační marketplace pro český trh

Fleetio integruje desítky amerických služeb (Samsara, WEX, Geotab). Pro český/Slovenský trh jsou relevantní:

- **Palivové karty:** CCS, Shell, DKV, Eurowag.
- **Telematika/GPS:** Navixy, Webdispečink, Cyngn, Mireo, AEC.
- **Mýtné:** MYTO CZ, vignety.
- **Účetní systémy:** Pohoda, Money, FlexiBee.

**Doporučení:** Vytvořit stránku "Integrace" v nastavení, začít s jedním konektorem (např. import tankovacích transakcí z CSV/Excel od CCS) a postupně přidávat API konektory.

### 6. TCO reporting a životní cyklus vozidla

Fleetio sleduje celkové náklady vlastnictví (TCO) a lifecycle. CMFleet dnes reportuje náklady, ale nepredikuje obměnu vozidla.

**Doporučení:** Rozšířit Report o TCO na vozidlo (pořizovací cena, provozní náklady, servis, palivo, leasing, pojištění) a predikční grafy: "Kdy se vyplatí vůz vyměnit?"

### 7. Konfigurovatelné vlastní pole

Fleetio umožňuje custom fields na vyšších tarifech. CMFleet má pevná pole.

**Doporučení:** Přidat uživatelsky definovaná pole k vozidlům, řidičům, work orders apod. – klíčové pro různé typy flotily (stavební stroje, vysokozdvižné vozíky, nákladní vozy).

### 8. Mobilní role pro techniky/skladníky

Fleetio Go slouží řidičům, technikům i skladníkům. CMFleet mobilní app je zaměřená na řidiče/správce.

**Doporučení:** Rozšířit mobilní zobrazení o roli technika/skladníka: zpracovat work order, zadat spotřebu dílů, udělat kontrolu vozidla.

### 9. Cenový model "per vozidlo" pro komerční produkt

Fleetio účtuje za vozidlo, ne za uživatele. To snižuje bariéru pro rozšíření mezi řidiče.

**Doporučení:** Při komerčním uvedení zvážit tarify podle počtu vozidel (např. do 20 / do 50 / 100+), neomezený počet uživatelů uvnitř firmy.

## Navrhovaný pořadí zapracování

```text
Fáze 1 (základ konkurenceschopnosti)
├── Servisní zakázky se workflow (Work Orders)
├── Digitální kontroly vozidla s fotkami a eskalací závad
└── Evidence náhradních dílů (základní sklad)

Fáze 2 (otevřenost a integrace)
├── REST API + webhooky
├── Import tankovacích transakcí (CCS/Excel)
└── TCO report a predikce životního cyklu

Fáze 3 (škálování a přizpůsobení)
├── Konfigurovatelné vlastní pole
├── Marketplace integrací (telematika, ERP, mýtné)
├── Mobilní role technika/skladníka
└── Cenový model per vozidlo ve Stripe
```

## Co zůstává jako silná stránka CMFleetu

- Česká lokalizace, cestovní příkazy, kniha jízd a leasingové hlídání – to Fleetio neřeší lokálně.
- Jednoduché PWA řešení bez nutnosti instalace nativní app.
- Flexibilní role a přístupová práva už jsou vybudovaná.

## Další krok

Vybrat z výše uvedeného první sadu funkcí (doporučuji Fázi 1) a zapracovat ji do produktové verze po dokončení multi-tenant architektury.
