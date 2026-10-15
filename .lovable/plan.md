# Oprava pruhu u zelené karty v „Blížících se termínech"

## Proč je pruh skoro prázdný

Pruh u termínu se kreslí poměrově k **celkové době** daného termínu:

- **Leasing** — známe začátek i konec (72 měsíců), pruh se plní plynule.
- **Pojištění** — známe `valid_from` i `valid_until`, pruh se plní plynule.
- **Zelená karta a STK** — v evidenci vozidla je uložené **jen datum konce** (`zelena_karta`, `stk`), začátek platnosti neexistuje. Proto se použije nouzové okno **90 dní**: pruh ukazuje, kolik z těch 90 dní už uběhlo.

U BMW končí zelená karta 21. 12. 2026, tedy za **67 dní**. V 90denním okně to vychází na `1 − 67/90 ≈ 26 %` — proto je modrý pruh ani ne do poloviny, přestože je termín „za chvíli". Číslo je technicky správné, ale vizuálně působí, že ještě není spěch.

## Co změníme

U termínů bez známého začátku (zelená karta, STK) se pruh přestane vážit k pevnému 90dennímu oknu a místo toho se bude plnit vůči **varovné hranici** dané kategorie:

- **Zelená karta** — hranice 60 dní: při 60 dnech pruh začíná, při 0 dnech je plný. BMW (67 dní) bude těsně před začátkem plnění, za týden už bude pruh viditelně růst.
- **STK** — hranice 30 dní (výchozí).

Leasing a pojištění zůstanou poměrové k celé době trvání — tam to dává smysl, protože začátek známe.

Barva pruhu se nemění: po termínu červená, pod varovnou hranicí oranžová, jinak neutrální.

## Technické provedení

- `src/components/dashboard/DeadlinesCard.tsx` — `deadlinePercent()`: když chybí `totalDays`, použije se jako základ `criticalDays` (místo pevných 90 dní).
- `src/pages/Dashboard.tsx` — bez změny dat; zelená karta už `criticalDays: 60` předává.

## Ověření

- Typecheck.
- Playwright: dashboard → karta „Blížící se termíny" → u BMW zelená karta (67 dní) má pruh téměř prázdný, ale u termínu pod 60 dny pruh viditelně roste; leasing a pojištění se chovají stejně jako dnes.
