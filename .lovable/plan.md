# Doplnění přehledu „co doplnit“ o všechny chybějící údaje

## Co bylo špatně
Přehled pro kolegyni u tankovacích karet hlídal jen to, jestli má auto vůbec nějakou kartu. Neúplné karty v něm chyběly: ze 42 karet nemá 11 vyplněné číslo a 12 nemá platnost. Tyhle údaje byly jen v první, podrobné tabulce.

## Co udělám
Vznikne nová verze `co-doplnit-prehled_v2.xlsx`:
- U každého auta se ve sloupci „Co chybí“ objeví i konkrétní karty, např. „Karta MOL – chybí číslo, platnost“.
- Nový list **Tankovací karty**: auto, poskytovatel, co u karty chybí.
- Do souhrnu přibudou řádky „Karta bez čísla“ a „Karta bez platnosti“.
- Přibudou kontroly, které zatím chyběly:
  - servisní plán (zatím ho nemá žádné auto),
  - záznamy o STK a technických prohlídkách (zatím nejsou u žádného auta),
  - PIN karty,
  - VIN, správce a hlavní uživatel.

Před uložením projdu všechny sloupce vozidel i navázaná data a zkontroluji, že nic nevypadlo.
