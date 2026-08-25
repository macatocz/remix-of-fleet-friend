# Datový model pro oddělení firem (multi-tenant)

Tohle je příprava pro produktovou verzi. V tomto interním projektu se **nic nemění** — rozpis slouží k tomu, aby práce v novém (remixnutém) projektu šla rychle a bez chyb.

## Proč to potřebujeme

Dnes databáze nezná pojem "firma". Vozidlo je prostě vozidlo, řidič prostě řidič. Když do jedné aplikace pustíme dva zákazníky, uvidí si navzájem do dat. Potřebujeme tedy ke každému záznamu doplnit, které firmě patří, a přepsat přístupová pravidla tak, aby uživatel z principu nemohl vidět nic mimo svou firmu.

## Nové tabulky

### `organizations` (firmy)
Jedna řádka = jeden zákazník produktu.

- název firmy, IČO, DIČ, adresa
- logo (cesta do storage), primární barva — pro branding zákazníka
- stav předplatného (zkušební / aktivní / pozastaveno), datum konce zkušebního období
- tarif (podle počtu vozidel)

### `organization_members` (členství)
Kdo patří do které firmy.

- uživatel, firma, datum přidání
- každý uživatel patří do právě jedné firmy (na začátku; víc firem na jednoho člověka lze doplnit později)

### Úprava `user_roles`
Role (Admin / Dispečer / Řidič) dnes platí globálně. Přidá se k nim firma, takže role platí **v rámci firmy** — admin jedné firmy není admin u druhé.

## Změny ve stávajících tabulkách

Ke všem provozním tabulkám přibude sloupec s příslušností k firmě (`organization_id`), povinný:

```text
Přímo na tabulce (mají vlastní organization_id)
├── vehicles          ├── drivers            ├── reservations
├── trip_logs         ├── incidents          ├── service_records
├── service_plans     ├── fuel_cards         ├── travel_orders
├── insurance         ├── inspections        ├── vehicle_documents
├── document_folders  ├── vehicle_mileage    ├── vehicle_vignettes
├── vehicle_checklists├── key_handovers      ├── handover_protocols
├── trip_templates    ├── notifications      └── profiles

Dědí přes rodiče (nepotřebují vlastní sloupec)
├── travel_order_legs, travel_order_meals, travel_order_expenses  → travel_orders
├── incident_photos                                              → incidents
└── handover_photos                                              → handover_protocols
```

Dnes globální nastavení se stanou nastavením firmy:

- `company_settings` — dnes jedna řádka pro CM, bude jedna řádka na firmu (pobočky, cestovní sazby, přepisy stravného)
- `app_settings` — veřejná adresa aplikace, notifikační pravidla → per firma
- `currency_rates` zůstane globální (kurzy ČNB jsou pro všechny stejné)

## Přístupová pravidla

Jádrem bude pomocná funkce v `private` schématu, obdobně jako už dnes máte `private.has_role` a `private.can_access_vehicle`:

- `private.current_org_id()` — vrátí firmu přihlášeného uživatele
- všechna pravidla čtení i zápisu na každé tabulce dostanou podmínku "záznam patří do mé firmy"
- existující pravidla (řidič vidí jen své vozidlo, PIN karty jen během rezervace) zůstanou — jen se k nim přidá filtr firmy jako první podmínka

To znamená dvě vrstvy ochrany: nejdřív firma, pak role uvnitř firmy.

## Nahrané soubory (storage)

Buckety `vehicle-documents` a `handover-photos` dnes rozlišují přístup podle vozidla. Cesty souborů dostanou na začátek ID firmy:

```text
dnes:  {vehicle_id}/{soubor}
nově:  {organization_id}/{vehicle_id}/{soubor}
```

Pravidla bucketů se navážou na první segment cesty, takže soubor cizí firmy nelze stáhnout ani při znalosti odkazu.

## Edge funkce

Tři existující funkce běží dnes napříč celou databází a budou muset pracovat po firmách:

- `notify-expirations` — hlídání STK, pojištění, leasingu
- `notify-reservation-start` a `notify-travel-orders` — notifikace
- `admin-invite-user` — zvání uživatelů; přidá pozvaného do firmy zvoucího admina
- `cnb-rates` zůstane beze změny (globální kurzy)

## Registrace a onboarding

- Veřejná registrace: zakladatel založí firmu a stane se jejím adminem
- Průvodce prvním spuštěním: název firmy, logo, pobočky, import vozidel z Excelu (import už máme)
- Zkušební období 14 dní bez karty

## Předplatné

- Tabulka `subscriptions` napojená na Stripe, webhook edge funkce
- Kontrola limitu vozidel při vytváření vozidla podle tarifu
- Po vypršení přechod do režimu jen pro čtení — data se nemažou

## Postup nasazení v novém projektu

```text
1. Vytvoříte remix tohoto projektu (Lovable → název projektu → Remix)
2. Rebranding: název, barvy, PWA ikony, texty přihlášení a návodu
3. Vyčištění interních specifik (pobočky CM, sazby, testovací data)
4. Migrace: organizations, organization_members, organization_id všude
5. Přepis přístupových pravidel + storage cesty
6. Úprava edge funkcí na režim per firma
7. Registrace firmy + onboarding průvodce
8. Stripe předplatné a limity vozidel
9. Administrace firem pro vás, vlastní doména, e-maily
```

Migrace dat se dělat nemusí — produktová verze startuje prázdná, tato interní zůstává oddělená a nedotčená.

## Co se v tomto projektu nemění

Nic. Tento plán je podklad pro nový projekt. Interní verze CM zůstává, jak je, včetně dat.
