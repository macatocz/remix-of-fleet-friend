# Otestování dashboardu a responzivity

## Cíl
Ověřit, že po optimalizaci dashboardu (kompaktní notifikace, menší KPI karty, sloučené sekce) vše funguje na desktopu, tabletu i mobilu a nic se nerozbilo.

## Rozsah testů

### 1. Existující automatické testy
Spustit stávající sadu (pravidla rezervací, výpočet nájezdu leasingu, výpočty cesťáku) a ověřit, že po úpravách UI stále procházejí.

### 2. Nové komponentové testy (Vitest + Testing Library)
- **Notifikační lišta** — zobrazí správné počty ve 3 segmentech, rozbalení/sbalení detailu po kliknutí, prázdný segment je neaktivní, text "Žádná upozornění" při nule.
- **KPI karta** — vykreslí popisek, hodnotu a hint; kliknutí spustí akci; sparkline se nevykreslí, pokud není dost dat.
- **Filtry dashboardu** — přepnutí období, tlačítko "Zrušit filtry" se zobrazí jen při aktivním filtru a vrátí výchozí stav.
- **Karta termínů / leasing widget / čekající rezervace** — vykreslení seznamu, rozbalení "Zobrazit vše", prázdný stav.

### 3. Vizuální a funkční kontrola v prohlížeči
Projít dashboard ve třech šířkách — mobil (390 px), tablet (834 px), desktop (1440 px) — a zkontrolovat:
- karty se skládají do sloupců, nic nepřetéká a nevzniká vodorovný scroll,
- grafy mají správnou výšku a jsou čitelné,
- notifikační lišta se dá rozbalit a proklik vede na detail vozidla,
- v konzoli nejsou chyby.
Ke každé šířce pořídit snímek obrazovky jako důkaz.

### 4. Kontrola typů a buildu
Ověřit typovou kontrolu a produkční build.

## Technické detaily
- Testy budou v `src/components/dashboard/__tests__/` a `src/components/__tests__/`, spouštěné přes Vitest (`jsdom`, setup už existuje).
- Volání do backendu (`supabase.from(...)`) se v komponentových testech mockují přes `vi.mock("@/integrations/supabase/client")`, takže testy neběží proti reálným datům.
- Prohlížečová kontrola přes Playwright proti běžícímu dev serveru, snímky do `/tmp/browser/`.
- Žádné změny v datovém modelu ani v produkční logice — pokud test odhalí chybu, opravu navrhnu zvlášť.
