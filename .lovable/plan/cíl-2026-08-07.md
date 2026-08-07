Oprava zarovnání ikon v zúžené postranní liště

## Cíl
Když uživatel stáhne hlavní nabídku tak, aby zůstaly jen ikony, musí být všechny ikony včetně loga a tlačítka odhlášení vizuálně vycentrovány v zúženém sloupci.

## Co opravíme
1. Logo autíčka (🚗) v horní části sidebaru.
2. Ikony všech položek hlavního menu a systémového menu.
3. Ikona tlačítka „Odhlásit se“ v patičce sidebaru.

## Technické řešení
- V `src/components/AppSidebar.tsx`:
  - Přidat `text-center` / `flex justify-center` k obalu loga v zúženém stavu.
  - Upravit `NavLink` / `SidebarMenuButton` tak, aby v zúženém stavu měl `justify-center` a ikona neměla žádný okraj vpravo (`mr-2` se odstraní, nebo se použije podmíněně jen v rozbaleném stavu).
- V `src/components/UserMenu.tsx`:
  - Přidat `w-full flex justify-center` (nebo `mx-auto`) obalu tlačítka odhlášení v zúženém stavu, aby ikona byla uprostřed sloupce.

## Soubory k úpravě
- `src/components/AppSidebar.tsx`
- `src/components/UserMenu.tsx`

## Ověření
- Vizuální kontrola v náhledu: sbalit sidebar a zkontrolovat, že logo, menu ikony i ikona odhlášení jsou uprostřed sloupce.
