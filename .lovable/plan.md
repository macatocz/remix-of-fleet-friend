# Redesign: neutralni SaaS vzhled (safirova modra + slate)

Podle schvaleneho nahledu (dashboard "Fleet Manager").

## Co se zmeni
- Barvy: primarni safirova modra misto cervene CM, tmavy slate sidebar, svetle slate pozadi, bile karty s jemnym stinem.
- Logo: neutralni ikona stit + auto, nazev "Fleet Manager" (sidebar, mobil, prihlaseni, PWA ikona, favicon).
- Texty: odstraneni zminek CMFleet / Contract Management, titulek a popis stranky.
- Dashboard: KPI dlazdice s ikonami, termíny se stitky naléhavosti, grafy v modre.
- PDF exporty: barvy zustavaji pres sdilene tiskove tokeny, prebarvi se na novou paletu.

## Technicke detaily
- Upravit tokeny v index.css (light + dark), tailwind beze zmen v komponentach kde to jde.
- Vygenerovat nove logo, nahradit v AppSidebar, DriverSidebar, mobilni liste, Login, manifest, index.html.
- Aktualizovat src/lib/pdf/theme.ts a pamet (visual identity).
