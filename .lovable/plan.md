# Přepínač role pro uživatele s více rolemi

## Co uživatel uvidí
- Po přihlášení: pokud má uživatel více rolí (např. dispečer + řidič), zobrazí se obrazovka "Pokračovat jako" s kartami rolí (Admin / Dispečer / Řidič). Kdo má jen jednu roli, pokračuje rovnou jako dnes.
- Zvolená role se zapamatuje v prohlížeči, takže při dalším otevření se už neptá.
- V uživatelském menu (desktop i mobil) přibude položka "Přepnout roli" s výběrem dostupných rolí; přepnutí okamžitě změní pohled (dispečer -> dashboard, řidič -> řidičský pohled s postranním panelem / mobilní řidičské UI).
- Pod e-mailem se zvýrazní aktuálně aktivní role.

## Chování
- Aktivní role řídí, co aplikace ukazuje: jako řidič uvidí přesně totéž co čistý řidič (bez admin menu, bez schvalování).
- Po odhlášení se volba smaže, při dalším přihlášení se výběr zobrazí znovu.
- Pokud admin uživateli roli odebere, zapamatovaná volba se ignoruje a zvolí se jiná dostupná.

## Technické detaily
- AuthContext: přidat `activeRole`, `setActiveRole`, `availableRoles`; `roles` pro UI vracet jako `[activeRole]` (skutečné role ponechat v `availableRoles`). Tím se všechna stávající místa (`isDriverOnly`, `hasRole`, `isAdmin`, menu, ProtectedRoute) přizpůsobí bez dalších úprav.
- Uložení v localStorage (`activeRole:<userId>`), smazání v `signOut`.
- Nová stránka `/vyber-role` (RoleSelect); ProtectedRoute přesměruje, pokud má uživatel >1 roli a nemá zvolenou aktivní. Login po úspěchu naviguje na `/`, přesměrování zařídí ProtectedRoute.
- UserMenu a MobileUserMenu: položka "Přepnout roli" (jen při >1 roli), po změně navigace na `/` (resp. `/ridic` / `/m`).
- Bezpečnost: jde jen o pohled v aplikaci — databázová oprávnění zůstávají podle skutečných rolí (přepnutí na řidiče práva nerozšiřuje, jen omezuje zobrazení). Databáze se nemění.
