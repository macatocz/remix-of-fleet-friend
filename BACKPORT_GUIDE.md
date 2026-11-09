# Backport guide (changes since remix)

Soupis změn pro případný přenos do původní aplikace.

## Závislosti
- `jszip` (měsíční uzávěrka)

## Nové soubory (kopírovat 1:1)
- Import knihy jízd: `src/lib/tripLog/importParser.ts`, `src/components/trip-log/TripLogImportDialog.tsx`, `src/test/tripImport.test.ts`
- Měsíční uzávěrka: `src/lib/report/monthlyClosing.ts`, `src/components/finance/MonthlyClosingButton.tsx`
- Kontrola knihy jízd: `src/lib/tripLog/audit.ts`, `src/components/trip-log/TripLogAuditDialog.tsx`, `src/test/tripAudit.test.ts`
- Předání vozu na mobilu: `src/components/mobile/MobileHandoverDrawer.tsx`
- Huby menu: `src/components/HubTabs.tsx`, `src/pages/hubs/FinanceHub.tsx`, `PeopleHub.tsx`, `ServiceHub.tsx`

## Upravené soubory
- `src/App.tsx` (routy hubů), `src/components/AppSidebar.tsx` (7 položek), `src/components/MobileLayout.tsx`
- `src/components/VehicleTripLogInline.tsx` (Importovat Excel, Zkontrolovat)
- `src/components/TripLogExport.tsx` (sdílený `buildTripLogWorkbook`, export za celé období)
- `src/pages/VehicleDetail.tsx` (předání vozu na mobilu)

## 2026-11-09 – Úprava Přehledu
- `src/components/dashboard/StatCard.tsx`: KPI karty bez pastelového podbarvení, neutrální podklad.
- `src/components/dashboard/FleetHealthSummary.tsx` + `src/components/leasing/LeasingMileageWidget.tsx`: „Rizikový nájezd" zahrnuje i stav Sledovat (>100 % plánu).
- `src/components/dashboard/DeadlinesCard.tsx`: seznam termínů vyplní celou výšku dlaždice.
- `src/pages/Dashboard.tsx`: karty rezervací v pravém sloupci bez umělého roztahování.

## Redesign: grafit + tyrkys
- `src/index.css`: primární barva změněna z červené (357 72% 46%) na tyrkysovou (174 84% 32%), postranní panel a text na grafit (220 9% 15–16%), grafy sladěny. PDF tisková paleta beze změny.

## Nové logo (Smart Car v tyrkysu)
- Přidáno `public/logo-smart-car.png` a `public/favicon.png`.
- `AppSidebar.tsx`, `DriverSidebar.tsx`, `DriverLayout.tsx`, `MobileLayout.tsx`: `/icon-192.png` → `/logo-smart-car.png`.

## Editace záznamů tankování
- Nový `src/components/fuel/EditFuelButton.tsx` (ikona tužky + dialog: datum/čas, litry, cena, tachometr, místo, poznámka).
- Vloženo vedle koše v `src/components/fuel/FuelReport.tsx` a `src/components/fuel/VehicleFuelRecords.tsx`; jen admin/dispečer (odpovídá DB pravidlu úprav).

## Tankování na kartě vozidla – tabulka na desktopu
- `src/components/fuel/VehicleFuelRecords.tsx`: na desktopu (md+) jednořádková tabulka (Datum, Místo, Litry, Cena, Kč/l, Tachometr, Akce), nad ní souhrn (počet, litry, cena, průměr Kč/l); mobil ponechává kartičky.
