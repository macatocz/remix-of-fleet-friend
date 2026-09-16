# Oprava: klik na „moje vozidlo" v mobilu vrací na domovskou obrazovku

## Co se děje

Na domovské obrazovce v mobilu i v sekci „Moje vozidla" vede klik na vozidlo na desktopovou adresu vozidla. Aplikace na telefonu takové adresy nepouští dál a okamžitě vrací uživatele zpět na domů — proto to na chvíli začne načítat a hned to skočí zpátky.

Mobilní detail vozidla přitom existuje a funguje (otevírá se například ze seznamu Vozidla nebo z QR kódu).

## Co opravíme

1. Klik na vozidlo na domovské obrazovce povede rovnou na mobilní detail vozidla.
2. Stejně tak klik na kartu vozu v sekci „Moje vozidla".
3. Doplníme automatické přesměrování: pokud někdo (starší odkaz, uložená zkratka, QR kód) otevře na telefonu desktopovou adresu vozidla, aplikace ho pošle na mobilní detail místo na domovskou obrazovku — stejně, jak to už funguje u cestovních příkazů.

## Technické detaily

- `src/pages/mobile/DriverHome.tsx` (řádek 190) a `src/pages/mobile/MyVehicle.tsx` (řádek 84): `navigate(\`/vozidla/${id}\`)` → `navigate(\`/m/vozidla/${id}\`)`.
- `src/components/ProtectedRoute.tsx`: přidat mapování `^/vozidla/([^/]+)$` → `/m/vozidla/$1` pro mobil bez `preferDesktop`, vedle stávajícího pravidla pro `/cestovni-prikazy/:id`. Výjimku `!location.pathname.startsWith("/vozidla/")` u driver-only větve ponechat pro případ `preferDesktop`.
- Mobilní route `/m/vozidla/:id` už existuje v `src/App.tsx` a používá `VehicleDetail`.
