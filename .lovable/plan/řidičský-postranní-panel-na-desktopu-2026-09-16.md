# Řidičský postranní panel na desktopu

## Proč

Řidičský desktop (`/ridic`, `src/pages/DriverDesktopHome.tsx`) má dnes jen horní lištu s notifikacemi a menu uživatele. Na široké obrazovce dá postranní panel navigaci na pevné místo — stejný prvek, jaký znají admin a dispečer, ale s řidičskými položkami.

## Co přibude

- Vlevo úzký panel (stávající shadcn `Sidebar`, `collapsible="icon"`) s 5 položkami:
  - Domů (`/ridic`)
  - Můj vůz (můj primární vůz → `/m/vozidla/{id}`, jen pokud vůz má)
  - Rezervace (`/m/rezervace`)
  - Jízdy (`/m/jizdy`)
  - Nahlásit závadu (otevře existující `QuickIncidentDialog`)
- Aktivní položka zvýrazněná podle aktuální adresy.
- Panel lze sbalit na ikonky a vrátit zpět (tlačítko v hlavičce, jako u admina).
- Žádné administrátorské menu, žádná data ostatních — obsah stránky se nemění.

## Jak to zapadne

- `src/pages/DriverDesktopHome.tsx`: obsah hlavičky i mainu obalíme do `SidebarProvider` + `AppSidebar`-like struktury; `NotificationBell` a `MobileUserMenu` zůstanou v horní liště, přibude `SidebarTrigger`.
- Nová komponenta `src/components/DriverSidebar.tsx` (řidičské položky + logo), znovu použije `NavLink` a `useSidebar` ze stávajícího vzoru v `AppSidebar.tsx`.
- „Nahlásit závadu" nemá vlastní stránku — položka panelu otevře stejný dialog, jaký už stránka používá (prop/událost do `DriverDesktopHome`).
- Redirect logika v `ProtectedRoute.tsx` se nemění — `/ridic` zůstává domovskou stránkou řidiče na desktopu.
- Bez zásahu do backendu a dat.

## Co se nemění

- Mobilní zobrazení řidiče, pohledy admina a dispečera, obsah a funkce řidičské domovské stránky.

## Ověření

- Přihlásit se jako řidič (Martin H.) a na desktopu zkontrolovat: panel se zobrazí, navigace funguje (Domů, Můj vůz, Rezervace, Jízdy), sbalení/rozbalení, dialog závady z panelu, žádné typové chyby.
