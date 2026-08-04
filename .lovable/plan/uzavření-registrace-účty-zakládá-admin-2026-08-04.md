# Uzavření registrace — účty zakládá admin

Dnes se může kdokoli s odkazem na aplikaci sám zaregistrovat a automaticky se mu založí profil i karta řidiče. Registraci zavřeme a přesuneme zakládání účtů pod admina.

## Co se změní pro uživatele

**Přihlašovací stránka**
- Zmizí záložka „Registrace“. Zůstane jen jednoduchý formulář e-mail + heslo.
- Kdo nemá účet, uvidí větu: „Účty zakládá správce aplikace. Obraťte se na svého administrátora.“

**Nastavení → Uživatelé a role (jen admin)**
- Nové tlačítko „Pozvat uživatele“.
- Admin zadá e-mail, jméno, příjmení a rovnou vybere roli (Admin / Dispečer / Řidič).
- Uživateli přijde e-mail s pozvánkou a odkazem, kde si sám nastaví heslo. Po nastavení hesla se rovnou přihlásí.
- V seznamu uživatelů přibude sloupec se stavem: „Aktivní“ / „Čeká na přijetí pozvánky“ (podle toho, zda se už někdy přihlásil).
- U nepřijaté pozvánky bude tlačítko „Poslat pozvánku znovu“.

**Stránka pro nastavení hesla**
- Nová veřejná stránka `/nastaveni-hesla`, kam odkaz z pozvánky vede. Uživatel zadá heslo dvakrát a potvrdí.

## Co se nemění
- Přihlášení zůstává e-mail + heslo. Microsoft 365 zůstává odložený.
- Funkce „Zapomenuté heslo“ se zatím nedělá — hesla resetuje admin (dá se to jednoduše doplnit později, technicky se použije stejná stránka).
- Automatické spárování nového účtu s existující kartou řidiče podle e-mailu zůstává v platnosti.

## Stávající účty
Účet `tvardkova@cmanagement.cz` má nepotvrzený e-mail a nikdy se nepřihlásil. Po nasazení jí pošlete pozvánku znovu z nového tlačítka — tím se účet aktivuje.

## Technická část

1. **Auth konfigurace:** vypnout veřejnou registraci (`disable_signup: true`) přes nastavení backendu. Tím `signUp()` přestane fungovat i pro přímé volání API, ne jen v UI.
2. **Edge funkce `admin-invite-user`** (`verify_jwt = true`):
   - ověří, že volající má roli `admin` (přes `has_role`), jinak vrátí 403;
   - servisním klíčem zavolá `inviteUserByEmail` s `redirectTo` na `/nastaveni-hesla` a metadaty `first_name` / `last_name`;
   - po úspěchu vloží zvolenou roli do `user_roles`;
   - druhý režim `resend` pro opětovné odeslání pozvánky.
   - Nový uživatel projde stávajícími triggery `handle_new_user` (profil + řidič) i `assign_first_admin`.
3. **Přehled uživatelů:** doplnit do funkce `list_users_admin` (nebo novou security-definer funkci dostupnou jen adminovi) údaje `last_sign_in_at` a `email_confirmed_at` z `auth.users`, aby šel zobrazit stav pozvánky. Volání zůstane přes RPC, ne přímé čtení `auth` schématu z klienta.
4. **Frontend:**
   - `src/pages/Login.tsx` — odstranit `Tabs` a celý registrační formulář včetně stavů, ponechat jen přihlášení.
   - `src/components/settings/UsersRolesSettings.tsx` — dialog „Pozvat uživatele“, sloupec stavu, akce „Poslat znovu“.
   - Nová stránka `src/pages/SetPassword.tsx` + veřejná routa v `src/App.tsx`, zpracuje `type=invite` / `type=recovery` z URL hash a zavolá `supabase.auth.updateUser({ password })`.
