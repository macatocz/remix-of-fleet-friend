
Uživatel se ptá, jak si zobrazit mobilní verzi aplikace na svém skutečném telefonu. Toto je otázka typu "jak na to" – nepotřebuje úpravu kódu, jen návod. Aplikace už mobilní rozhraní má (`/m` route), jen ji potřebuje zpřístupnit z telefonu.

## Možnosti, jak zobrazit mobilní verzi na telefonu

### 1. Sdílený náhled (nejrychlejší, doporučeno pro test)
V Lovable editoru klikněte na **Share → Share preview**. Vygeneruje se veřejný odkaz platný 7 dní, který otevřete v prohlížeči telefonu. Nepotřebuje Lovable účet.

Po otevření na telefonu se přihlaste účtem řidiče (`cernoch@cmanagement.cz`). Protože má roli Řidič, `ProtectedRoute` vás automaticky přesměruje na `/m` (mobilní rozhraní).

### 2. Publikování aplikace (trvalé)
Klikněte na **Publish** vpravo nahoře. Získáte trvalou URL `*.lovable.app`, kterou otevřete na telefonu kdykoliv. Vhodné pro reálné používání.

### 3. Přímá URL náhledu
Otevřete v telefonu přímo: `https://id-preview--f097475a-34ff-4fec-a957-6deaf6176cb8.lovable.app/m` – ale vyžaduje přihlášení do Lovable, takže funguje jen pokud máte na telefonu Lovable účet s přístupem k projektu.

### 4. Test bez telefonu (v prohlížeči na PC)
- V Lovable nad náhledem je ikona telefonu/tabletu – přepne náhled na mobilní rozměry.
- Nebo v Chrome DevTools (F12) zapněte device toolbar (Ctrl+Shift+M).
- Otevřete `/m` přímo, nebo se přihlaste jako řidič a budete přesměrováni automaticky.

## Drobná překážka, kterou je dobré vědět
Účet `cernoch@cmanagement.cz` má pravděpodobně roli Admin/Dispečer (proto vidíte desktop). Mobilní rozhraní se aktivuje automaticky **jen pro účty, které mají pouze roli Řidič**. Pro test na telefonu máte dvě možnosti:

- **A)** Použít existující účet čistého řidiče (nebo si jeden založit přes Nastavení → Uživatelé).
- **B)** Otevřít na telefonu přímo URL `/m` – mobilní rozhraní funguje pro všechny přihlášené uživatele, jen se na něj automaticky nepřesměrovávají admini.

## Doporučený postup
1. Klikněte **Share → Share preview** v Lovable.
2. Odkaz otevřete v prohlížeči telefonu (můžete si ho poslat e-mailem nebo přes QR kód).
3. Přihlaste se účtem řidiče → zobrazí se `/m` automaticky.
4. (Volitelně) V Safari/Chrome na telefonu zvolte „Přidat na plochu" – aplikace bude vypadat jako nainstalovaná.

## Poznámka k nativní aplikaci
Pokud chcete mobilní verzi jako **opravdovou nainstalovanou aplikaci** (z App Store / Google Play, s push notifikacemi, kamerou apod.), je možné projekt rozšířit o **Capacitor** (nativní wrapper) nebo nastavit **PWA** (instalovatelná webová aplikace s offline režimem a ikonou na ploše). To je už ale samostatná úloha – řekněte, jestli o to máte zájem a kterou variantu preferujete.
