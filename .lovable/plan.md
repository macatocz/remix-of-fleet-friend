# Pruh „blížící se termíny" jako ukazatel naléhavosti

## Problém

Pruh u termínu se dnes kreslí poměrově k **celkové době trvání** (leasing 72 měsíců, pojištění rok) nebo k pevnému 90dennímu oknu (zelená karta, STK — začátek platnosti neznáme). U BMW zelená karta (konec 21. 12. 2026, zbývá 67 dní) tak pruh ukazuje jen ~26 % — vizuálně to nevypadá, že je „nejvyšší čas řešit", přestože termín je za rohem.

## Nové chování — pruh = naléhavost

Pruh přestane vyjadřovat „kolik uběhlo z celkové doby" a bude vyjadřovat **„jak blízko je konec"**. Jakmile se termín v kartě objeví, pruh se plní od 0 % k 100 % směrem k datu konce:

- Každá kategorie má své **okno náhledu** (stejné, podle kterého se termín v kartě vůbec zobrazí):
  - Leasing: 180 dní
  - Zelená karta: 180 dní (zobrazení), varovná hranice 60 dní
  - Pojištění: 90 dní
  - STK: 90 dní, varovná hranice 30 dní
  - Servis: dle stávající logiky
- Plnění pruhu: `1 − zbývající_dny / okno`. Termín, který právě vstoupil do okna, má pruh téměř prázdný; termín za pár dní má pruh téměř plný.
- **Barva podle naléhavosti** (beze změny oproti dnešku): neutrální/modrá daleko od termínu, oranžová pod varovnou hranicí (zelená karta 60 dní, STK 30 dní, leasing 90 dní), červená po termínu.

Výsledek pro BMW zelenou kartu: 67 dní v 180denním okně → pruh ~63 % a za pár dní přejde do oranžové (pod 60 dní). Řidič/správce na první pohled vidí „je to skoro tady".

## Technické provedení

- `src/components/dashboard/DeadlinesCard.tsx` — `deadlinePercent()`: nově `1 − days / windowDays`, kde `windowDays` je nové pole na položce (výchozí 90). `totalDays` se přestane používat pro plnění.
- `src/pages/Dashboard.tsx` — každá skupina termínů předá `windowDays` odpovídající svému filtru zobrazení (leasing 180, zelená karta 180, pojištění 90, STK 90). Zelené kartě doplníme i badge „X d" (už tam je).

## Ověření

- Typecheck.
- Playwright: dashboard → „Blížící se termíny" → BMW zelená karta má pruh přes polovinu; leasing (73 dní v 180denním okně, oranžový) ~59 %; po termínu červený plný pruh.
