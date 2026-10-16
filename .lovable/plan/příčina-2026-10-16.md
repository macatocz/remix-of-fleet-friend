Oprava useknutého loga ve sbaleném postranním panelu

## Příčina
Sbalený panel je široký 48 px, ale logo má kolem sebe odsazení 16 px z každé strany. Na logo (28 px) tak zbývá jen 16 px a jeho kraje se uříznou.

## Oprava
- Ve sbaleném stavu zmenšit odsazení kolem loga (z 16 px na 8 px vodorovně), aby se celé logo vešlo a bylo vycentrované.
- Logu zakázat smršťování, ať se nedeformuje.
- Platí pro panel admina/dispečera i pro panel řidiče. Rozbalený panel se nemění.

## Technické
- `src/components/AppSidebar.tsx` a `src/components/DriverSidebar.tsx`: obal loga `p-4` -> `collapsed ? "py-4 px-2" : "p-4"`, `img` dostane `shrink-0`.

## Ověření
Sbalit panel v náhledu a zkontrolovat, že je celé autíčko s logem CM vidět.
