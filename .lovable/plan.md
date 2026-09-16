# Postranní panel řidiče a chybějící „Jízdy“ v mobilu

## Co je špatně

1. **Panel zmizí po kliknutí (desktop).** Panel je dnes součástí jen úvodní řidičské stránky. Jakmile řidič klikne na Rezervace, Jízdy nebo na svůj vůz, otevře se stránka v mobilním rozvržení (spodní lišta), kde panel neexistuje.
2. **„Jízdy“ chybí ve spodní liště.** Položka Jízdy je jen pro řidiče bez svěřeného vozu. Kdo má vůz ve správě (nebo je správce/dispečer jako Vy) ji ve spodní liště nevidí vůbec.

## Co uděláme

### Desktop – panel zůstane všude
- Vytvoříme společné řidičské rozvržení: vlevo trvalý panel (Domů, Můj vůz, Rezervace, Jízdy, Nahlásit závadu), nahoře hlavička se zvonečkem a uživatelským menu, vpravo obsah stránky.
- Stránky Rezervace, Jízdy a detail vozu se řidiči na počítači zobrazí uvnitř tohoto rozvržení, takže panel nikdy nezmizí a aktivní položka se zvýrazní.
- Na telefonu zůstává vše beze změny (spodní lišta).

### Mobil – doplníme Jízdy
- Do spodní lišty správce vozidla přidáme Jízdy (Domů, Vozidlo, Jízdy, Rezervace).
- Správci a dispečerovi přidáme Jízdy (vlastní kniha jízd) do nabídky „Více“, aby byla dostupná i jim.

### Prověření
Projdeme obě zobrazení naživo: na počítači kliknutí přes všechny položky panelu (panel musí zůstat, aktivní položka svítí, sbalení na ikonky funguje) a na telefonu ověříme, že se Jízdy zobrazují u řidiče, u správce vozu i přes „Více“.

## Technické detaily

- Nový `src/components/DriverLayout.tsx`: `SidebarProvider` + `DriverSidebar` + hlavička (`SidebarTrigger`, `NotificationBell`, `MobileUserMenu`) + `<Outlet />`; drží stav dialogu „Nahlásit závadu“ (`QuickIncidentDialog`) a přes `useDriverContext` předává primární vůz do panelu.
- `src/App.tsx`: nová větev rout pro řidiče na desktopu (`/ridic`, `/ridic/rezervace`, `/ridic/jizdy`, `/ridic/vozidla/:id`) uvnitř `DriverLayout`, znovupoužívající `MyReservations`, `MyTrips`, `VehicleDetail`. `DriverDesktopHome` se zredukuje na samotný obsah (bez vlastního `SidebarProvider`).
- `DriverSidebar`: odkazy povedou na `/ridic/*` místo `/m/*`.
- `ProtectedRoute`: cesty `/ridic/*` povolit jen čistým řidičům; na mobilu je mapovat na `/m/*` ekvivalenty; řidiče na desktopu z `/m/*` přesměrovat na odpovídající `/ridic/*`.
- `MobileLayout`: `spravceNav` doplnit o `{ /m/jizdy, Jízdy, Route }`; do `moreItems` přidat položku Jízdy (`/m/jizdy`).
- Bez zásahu do databáze, oprávnění a business logiky.
