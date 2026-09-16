# Postranní panel řidiče zůstane na desktopu trvale

## Co je špatně

Panel je dnes součástí jen úvodní řidičské stránky. Jakmile řidič klikne na Rezervace, Jízdy nebo na svůj vůz, otevře se stránka v mobilním rozvržení (spodní lišta) a panel zmizí.

## Co uděláme

- Vytvoříme společné řidičské rozvržení: vlevo trvalý panel (Domů, Můj vůz, Rezervace, Jízdy, Nahlásit závadu), nahoře hlavička se zvonečkem a uživatelským menu, vpravo obsah stránky.
- Stránky Rezervace, Jízdy a detail vozu se řidiči na počítači zobrazí uvnitř tohoto rozvržení, takže panel nikdy nezmizí a aktivní položka se zvýrazní.
- Sbalení panelu na ikonky a rozbalení zpět zůstává funkční na všech těchto stránkách.
- Mobilní zobrazení necháváme beze změny.

## Prověření

Na počítači jako řidič projdeme všechny položky panelu — panel musí zůstat, aktivní položka svítí, sbalení funguje a „Nahlásit závadu“ otevře dialog i z podstránek.

## Technické detaily

- Nový `src/components/DriverLayout.tsx`: `SidebarProvider` + `DriverSidebar` + hlavička (`SidebarTrigger`, `NotificationBell`, `MobileUserMenu`) + `<Outlet />`; drží stav dialogu `QuickIncidentDialog` a přes `useDriverContext` předává primární vůz do panelu.
- `src/App.tsx`: řidičské desktopové routy `/ridic`, `/ridic/rezervace`, `/ridic/jizdy`, `/ridic/vozidla/:id` uvnitř `DriverLayout`, znovupoužívající `MyReservations`, `MyTrips`, `VehicleDetail`. `DriverDesktopHome` se zredukuje na samotný obsah (bez vlastního `SidebarProvider`).
- `DriverSidebar`: odkazy povedou na `/ridic/*` místo `/m/*`.
- `ProtectedRoute`: `/ridic/*` povolit jen čistým řidičům; na mobilu mapovat `/ridic/*` na `/m/*` ekvivalenty, aby telefon dál používal mobilní rozhraní.
- Bez zásahu do mobilního rozvržení, databáze, oprávnění a business logiky.
