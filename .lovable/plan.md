# QR kód otevírá nainstalovanou PWA na Androidu

Cíl: Když uživatel s nainstalovanou PWA naskenuje QR kód u vozidla, otevře se mu detail vozidla přímo v samostatné aplikaci (PWA), nikoli v mobilním prohlížeči.

## Současný stav

- QR kód generuje `VehicleQRCode.tsx` do URL `${window.location.origin}/m/vozidla/{id}`.
- `manifest.webmanifest` má `scope: "/"` a `display: "standalone"`, takže URL `/m/vozidla/{id}` už nyní spadá do PWA scope.
- Problém: v editoru/Lovable preview se QR kód tvoří z preview URL (`id-preview--*.lovable.app`), zatímco PWA si uživatel nainstaloval z publikované URL (`cmfleet.lovable.app`). Různé originy = PWA se nerozevře, otevře se prohlížeč.

## Co změníme

1. **Nastavitelná veřejná URL aplikace**
   - Do `app_settings` přidáme klíč `app_public_url`.
   - V `GeneralSettings.tsx` přidáme pole "Veřejná URL aplikace" s popiskem, že se používá pro QR kódy a odkazy.
   - Výchozí hodnota bude `window.location.origin`, aby fungovalo i lokálně/preview, ale admin ji může přepsat na produkční URL.

2. **QR kód bude používat veřejnou URL**
   - `VehicleQRCode.tsx` načte `app_public_url` a vygeneruje QR kód na `{app_public_url}/m/vozidla/{id}`.
   - Fallback: pokud není nastaveno, zůstává `window.location.origin`.

3. **PDF karta vozidla sjednocena**
   - `src/lib/vehicle/cardPdf.ts` generuje QR kód stejným způsobem, takže i tištěná karta bude směřovat na veřejnou URL.

4. **Vysvětlivka pro uživatele**
   - Pod QR kód v detailu vozidla přidáme krátkou poznámku: „Pro otevření přímo v nainstalované aplikaci musí být PWA nainstalovaná z téže URL, na kterou QR kód směřuje."
   - Tiskový náhled QR kódu dostane stejnou poznámku.

5. **Ověření manifestu**
   - Ponecháme `scope: "/"` a `display: "standalone"`, což Androidu říká, aby URL pod `/m/vozidla/*` otevřel jako PWA.
   - Nebudeme měnit `start_url` ani zavádět vlastní URL schémata, protože pro PWA není potřeba.

## Technické poznámky

- Dotčené soubory: `src/components/VehicleQRCode.tsx`, `src/lib/vehicle/cardPdf.ts`, `src/components/settings/GeneralSettings.tsx`, případně `src/hooks/useCompanySettings.ts`.
- Ponecháváme stávající `public/manifest.webmanifest` beze změny (je správně nakonfigurovaný).
- Platí omezení iOS: QR kód otevře Safari a automatické přepnutí do nainstalované PWA Apple nepodporuje. Tento plán řeší pouze Android.
- Žádná změna autentizace ani RLS — QR kód otevírá veřejnou mobilní cestu, přístup k datům řeší stávající login.
