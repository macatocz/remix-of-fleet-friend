# Oprava: řidiči problikne šedý postranní panel po obnovení stránky

## Co se děje

Po obnovení stránky aplikace na okamžik ještě neví, jakou má přihlášený člověk roli. Než se role načte, zobrazí se na zlomek vteřiny desktopové rozložení s postranním panelem a teprve pak aplikace přepne na mobilní zobrazení. Odtud to bliknutí.

## Řešení

Počkat s vykreslením obsahu, dokud aplikace nezná roli přihlášeného člověka a typ zařízení. Místo probliknutí panelu se krátce ukáže stejný načítací indikátor, jaký se už dnes používá při přihlašování.

Chování po opravě:
- Řidič po obnovení stránky uvidí jen načítání a hned mobilní zobrazení — žádný šedý panel.
- Pro ostatní role se nic nemění.

## Technické detaily

- `src/contexts/AuthContext.tsx`: přidat stav `rolesLoaded` (nebo sloučit do `loading`) — `loading` se přepne na `false` až po dokončení `fetchRoles`, a to jak ve větvi `getSession()`, tak v `onAuthStateChange`. Pro odhlášený stav (`session === null`) zůstává okamžité `false`.
- `src/components/ProtectedRoute.tsx`: rozhodování o přesměrování provádět až po načtení rolí a po určení `isMobile`; do té doby vracet stávající spinner. `useIsMobile` vrací `false` při prvním renderu — použít variantu, která rozliší „ještě nevím" (např. číst `window.matchMedia` v inicializaci stavu), aby se na desktopu nečekalo zbytečně.
- Bez zásahu do datového modelu a backendu; po úpravě ověřit typovou kontrolu.
