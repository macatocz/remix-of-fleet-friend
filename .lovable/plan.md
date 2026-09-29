# Oprava probliknutí celé aplikace před výběrem role

## Co se děje

Po úspěšném přihlášení aplikace přejde na hlavní stránku dříve, než se dokončí načtení rolí. Protože stav načítání už v tu chvíli zůstává vypnutý, na okamžik se zobrazí celé rozhraní a až potom obrazovka „Pokračovat jako“.

## Řešení

- Při každém novém přihlášení okamžitě zapnout stav načítání ještě před zjišťováním rolí.
- Chráněné stránky ponechat zakryté stávajícím načítacím indikátorem, dokud nejsou role kompletně načtené a není rozhodnuto, zda má uživatel vybrat roli.
- Po dokončení načítání poslat uživatele s více rolemi přímo na obrazovku „Pokračovat jako“ bez mezikroku přes hlavní aplikaci.
- Zachovat současné chování pro uživatele s jedinou rolí i pro odhlášení.

## Ověření

- Přihlášení účtem s více rolemi: po tlačítku „Přihlásit se“ se zobrazí pouze krátké načítání a následně výběr role.
- Přihlášení účtem s jednou rolí: aplikace se otevře přímo ve správném pohledu.
- Obnovení stránky a odhlášení zůstanou beze změny a bez probliknutí cizího rozhraní.

## Technické detaily

- Upravit řízení stavu v `AuthContext`, protože událost přihlášení nyní nastaví novou relaci, ale před načítáním rolí nevrátí `loading` na `true`.
- Ponechat rozhodování o přesměrování v `ProtectedRoute` až za dokončeným načtením rolí.
- Bez změn databáze, rolí a oprávnění.
