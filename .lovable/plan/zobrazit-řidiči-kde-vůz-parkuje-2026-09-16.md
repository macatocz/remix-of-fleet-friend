# Zobrazit řidiči, kde vůz parkuje

## Cíl
U schválené rezervace (a u vlastního vozu) uvidí řidič v mobilu, kde si má auto vyzvednout — lokalitu a konkrétní parkovací stání.

## Kde se to objeví
- **Domovská obrazovka v mobilu** — u schválené rezervace, hned vedle tankovací karty.
- **Rezervace → záložka "Moje"** — u každé schválené, dosud neskončené rezervace.
- **Můj vůz** — trvale u vozu, který má řidič přidělený.

## Jak to bude vypadat
Malá karta s ikonou špendlíku:
```text
Kde vůz najdete
Lokalita:          Praha – Karlín, garáž B
Parkovací stání:   B-14
[ Navigovat ]   (jen když je vyplněná lokalita)
```
- Tlačítko "Navigovat" otevře mapy s textem lokality (na mobilu se spustí nativní mapová aplikace).
- Když není vyplněná ani lokalita, ani stání, karta se vůbec nezobrazí (žádné prázdné místo).
- Když je vyplněná jen jedna z hodnot, ukáže se jen ta.

## Odkud se data berou
Používají se stávající údaje u vozidla: "Lokalita" a "Parkovací stání". Nic nového se do databáze nepřidává — stačí je mít u vozidel vyplněné. Řidič k nim už dnes přístup má.

## Technické detaily
- Nová komponenta `src/components/mobile/VehicleParkingWidget.tsx` (prop `vehicleId`), čte `lokalita` a `parkovaci_stani` z pohledu `vehicles_basic`; vrací `null`, když jsou obě prázdné.
- Zapojení: `src/pages/mobile/DriverHome.tsx` a `src/pages/mobile/MyReservations.tsx` — vedle `ReservationFuelCardWidget`, se stejnou podmínkou (schváleno a `reservationEnd(...) > now`); `src/pages/mobile/MyVehicle.tsx` — u přiděleného vozu.
- Odkaz na navigaci: `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(lokalita)>`, otevřít v nové záložce.
- Vzhled podle stávajících mobilních karet (shadcn `Card`, ikona `MapPin`, červeno-šedé tokeny), bez natvrdo psaných barev.
