# Mobilní zobrazení Nastavení bez posouvání do stran

Stránka `/m/nastaveni` používá desktopovou verzi: lišta s 5 taby se nevejde na šířku a sazby (stravné, km/palivo, zahraniční) jsou 4–7sloupcové tabulky. Proto se celý obsah posouvá doprava.

## Co udělám

Stejný postup jako u Nákladů, Škod a Servisu — samostatná mobilní stránka Nastavení napojená na `/m/nastaveni`. Desktop zůstane beze změny.

- **Taby:** vodorovně posuvná lišta (jen ona, ne celá stránka), kompaktní popisky s ikonami.
- **Firma / Obecné:** formulářová pole pod sebou na plnou šířku, žádné vedle sebe.
- **Uživatelé:** místo tabulky karta na uživatele — jméno, e-mail, role jako badge, akce v řádku pod tím.
- **Notifikace:** přepínače v seznamu s popiskem, který se zalomí.
- **Cestovní sazby:** místo tabulek karty po rocích:
  - Stravné: rok jako nadpis, tři řádky (5–12 h, 12–18 h, nad 18 h) s částkou vpravo.
  - Km a palivo: rok jako nadpis, řádky Kč/km, N95, N98, Nafta, Elektřina.
  - Zahraniční: karta na zemi s měnou a plnou sazbou; nahoře hledání země.
  - Badge „Firemní override" zůstává u dotčeného roku/země.
- **Editace sazeb (admin):** zachovaná, formulář jako dialog na plnou šířku s poli pod sebou.

**Proti přetékání:** obal s `w-full max-w-full overflow-x-hidden`, `min-w-0`, `break-words`/`truncate` u dlouhých textů a čísel.

## Technické detaily

- Nový soubor `src/pages/mobile/MobileSettings.tsx` (data a ukládání převzato z `SettingsPage.tsx` a komponent v `src/components/settings/`, bez změny chování).
- V `src/App.tsx` mobilní routu `nastaveni` přesměrovat na `MobileSettings`; desktopová `/nastaveni` beze změny.
- Žádné změny v databázi ani v oprávněních.
- Ověření Playwrightem: šířka stránky = šířka displeje (393 px), žádné vodorovné posouvání.
