# Oprava chyby "function public.has_role does not exist"

## Co se stalo

Při zpřísnění zabezpečení se pomocné funkce přesunuly do neveřejného schématu `private`. Dvě funkce ale mají uvnitř svého těla natvrdo napsané volání `public.has_role(...)`, které už na tom místě neexistuje:

- `private.is_staff()` — používá se v pravidlech přístupu u většiny tabulek
- `private.list_users_admin()` — seznam uživatelů v Nastavení

Protože `is_staff()` je součástí pravidel čtení, chyba se objeví prakticky kdekoli v aplikaci (např. na stránce Vozidla).

Ověřeno dotazem do databáze: obě funkce obsahují odkaz na `public.has_role`, samotná pravidla přístupu odkazují na funkce správně (přes interní vazbu), takže je není třeba měnit.

## Oprava

Jedna migrace, která obě funkce znovu vytvoří s odkazem na `private.has_role(...)`:

- `private.is_staff()` — kontrola role admin / dispečer
- `private.list_users_admin()` — kontrola role admin na začátku funkce

Žádná změna chování, jen správný odkaz na přesunutou funkci.

## Ověření po opravě

- Kontrolní dotaz, že žádná funkce v `public` ani `private` už neodkazuje na `public.has_role`
- Načtení stránky Vozidla v náhledu a kontrola, že chyba zmizela
- Kontrola stránky Nastavení → Uživatelé a role
