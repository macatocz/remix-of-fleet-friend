# Návrhy zlepšení CMFleet (celá aplikace)

Seřazeno podle přínosu. Vyberte, které chcete udělat – po schválení začnu od bodu 1.

## A. Kvalita dat (největší přínos teď – chybí 246 údajů)
1. **Ukazatel úplnosti v aplikaci** – na kartě vozu, tankovací karty a řidiče procento vyplnění a seznam „Co chybí“ s proklikem přímo na pole. Na seznamu vozidel sloupec „Úplnost“ a filtr „Neúplné“.
2. **Úkoly pro správce** – každý správce vidí na dashboardu jen svá auta s chybějícími údaji; jednou týdně upozornění v aplikaci.
3. **Hromadná úprava** – vybrat více aut a najednou zadat např. dálniční známku nebo platnost zelené karty.

## B. Leasing a tachometr
4. **Automatické upozornění na přečerpání nájezdu** – zpráva správci a adminovi při 100 %, 105 % a 115 % plánu.
5. **Měsíční připomínka odečtu tachometru** – řidič/správce dostane 1. den v měsíci výzvu zadat stav km (jediný chybí u 24 aut).

## C. Tankování a kniha jízd
6. **Spotřeba l/100 km** v reportu tankování a upozornění na neobvyklou spotřebu (možné zneužití karty).
7. **Kontrola návaznosti tachometru** v knize jízd – zvýraznění mezer a překryvů km mezi jízdami.

## D. Řidiči
8. **Upozornění na nepropojené řidiče** (bez uživatelského účtu) s tlačítkem „Pozvat do aplikace“.
9. **Platnost řidičského průkazu** a jeho hlídání v termínech (nové pole).

## E. Ostatní
10. **Video návody pro řidiče** (připomínka z dřívějška).
11. **Globální vyhledávání** (RZ, řidič, karta) v horní liště.

## Technické poznámky
- Body 1–3 a 6–8 jsou jen prezentační/výpočetní vrstva nad stávajícími daty.
- Body 2, 4, 5 rozšíří stávající funkci upozornění (notify-expirations) o nové typy.
- Bod 9 vyžaduje nový sloupec u řidičů.
