# Plán: Aplikace nové barevné identity (#C82127 a #565656)

## Cíl
Změnit vizuální identitu aplikace z modrobílé na kombinaci červené #C82127 a tmavě šedé #565656. Červená se stane novou primární barvou, šedá novou tmavou základní barvou pro text a hlavní layout (sidebar, header, pozadí, karty).

## Přehled změn

### 1. Aktualizace CSS proměnných (index.css)
- Převést hex barvy na HSL a nahradit proměnné:
  - `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` → #C82127
  - `--foreground`, `--sidebar-background`, `--sidebar-foreground` → #565656 / odstíny šedé
  - `--background`, `--card`, `--popover` → světle šedé/bílé odstíny pro kontrast
- Upravit `.dark` variantu tak, aby tmavý režim používal #565656 jako základní pozadí a červenou jako primární akcent.
- Zachovat dostatečný kontrast pro čitelnost (bílý text na červené, bílý text na šedé).

### 2. Aktualizace Tailwind konfigurace
- Přidat/aktualizovat barvy v `tailwind.config.ts` podle nových CSS proměnných.
- Upravit chart palette, aby obsahovala červenou a šedou jako hlavní tóny.

### 3. Kontrola a úprava komponent
- Procházet komponenty, které používají hardcoded barvy nebo původní modrou (`#3B82F6`, `blue-600`, apod.) a nahradit je za semantic tokeny (`primary`, `foreground`, `sidebar-background`).
- Zaměřit se na:
  - Sidebar (`AppSidebar`)
  - Header a navigační prvky
  - Tlačítka primární akce
  - Dashboard KPI karty a grafy
  - Notifikační badge/alerty
  - Mobilní horní/spodní lišty

### 4. Aktualizace memory a dokumentace
- Uložit novou barevnou identitu do projektové paměti (`mem://style/visual-identity`), aby budoucí změny respektovaly novou paletu.

### 5. Testování a verifikace
- Sestavit projekt a zkontrolovat, že nedošlo k chybě kontrastu nebo ztraceným barevným tokenům.
- Prohlédnout klíčové obrazovky: Dashboard, Vozidla, Detail vozidla, Mobilní náhled.

## Technické detaily
- Primární červená: #C82127 → HSL(357°, 72%, 46%)
- Tmavá šedá: #565656 → HSL(0°, 0%, 34%)
- Světlé pozadí: zachovat téměř bílé pro kontrast s tmavými texty.
- Všechny změny budou dělané přes CSS proměnné, nikoliv hardcoded Tailwind třídy, aby se zachovala podpora dark mode a budoucí údržba.

## Co nebude součástí tohoto plánu
- Změny fontů nebo typografie.
- Změny layoutu/velikosti komponent (kromě nezbytných barevných úprav).
- Nová funkcionalita.
