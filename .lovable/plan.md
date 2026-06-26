
## Cíl
Doplnit dvě manažerské funkce:
- **(7) Push notifikace** — rezervace schválena, STK/pojištění/leasing končí brzy, auto vráceno
- **(8) Automatické vyplňování nájezdu** — při vrácení vozu / nové jízdě aplikace předvyplní poslední známý stav tachometru + odhad nájezdu

---

## 1) Push notifikace

### Datový model (migrace)
- `notifications` — `id, user_id, type, title, body, link, vehicle_id?, reservation_id?, read_at, created_at`
- `notification_preferences` — `user_id, push_enabled, email_enabled, types jsonb` (které typy chce dostávat)
- `push_subscriptions` — `user_id, endpoint, p256dh, auth, user_agent, created_at` (Web Push API)
- RLS: user vidí jen svoje; service_role pro edge funkce.
- GRANT dle pravidel.

### Edge funkce
- `notify-send` — přijme `{user_ids, type, title, body, link}`, vloží do `notifications` a pošle Web Push všem aktivním subscriptions daných userů. Klíče VAPID v secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) — vygeneruji a požádám o uložení.
- `notify-expirations` (cron 1× denně) — projde `inspections`, `insurance`, `service_plans`, `vehicles.leasing_konec`, `vehicle_vignettes` a vytvoří notifikace pro správce vozu při hranicích **30 / 14 / 7 / 1 dní**.

### Triggery / hooks v UI
- Schválení rezervace → volá `notify-send` na vlastníka rezervace (`type: reservation_approved`).
- Vrácení vozu (handover protokol typu „return") → notifikuje správce vozu.
- Nová škoda → notifikuje admin/dispečera.

### Frontend
- `public/sw.js` — service worker pro Web Push (`push`, `notificationclick`).
- `src/hooks/usePushNotifications.ts` — registrace SW, žádost o permission, uložení subscription.
- `src/components/NotificationBell.tsx` — zvoneček v headeru s počtem nepřečtených + dropdown (realtime přes Supabase channel na `notifications`).
- `src/pages/Notifications.tsx` — plný seznam + filtry.
- `src/pages/Settings.tsx` — sekce „Notifikace": toggly typů, tlačítko „Povolit push v prohlížeči".
- Mobil: zvoneček v `MobileLayout` headeru + položka v drawer „Více".

---

## 2) Automatické vyplňování nájezdu

### Logika (`src/lib/mileage/predict.ts`)
- `getLastKm(vehicleId)` — vrátí nejvyšší `km_konec` z `trip_logs` nebo `vehicle_mileage`.
- `getDailyAverage(vehicleId, days=30)` — průměrný denní nájezd z posledních N dní.
- `predictKm(vehicleId, targetDate)` — `lastKm + dailyAvg * dní_od_poslední_jízdy`.

### Použití
- **Nový záznam v knize jízd** (`VehicleTripLogInline.tsx`):
  - `km_start` se předvyplní z `getLastKm`.
  - `km_konec` zobrazí placeholder s odhadem (`≈ 12 450 km`).
- **Handover protokol — vrácení** (`HandoverProtocolDialog` / odpovídající stránka):
  - Pole „stav tachometru při vrácení" předvyplní `predictKm(vehicle, returnDate)` + tooltip „odhad z průměru posledních 30 dní, prosím upravte".
- **Nová rezervace** — info pod výběrem vozu: „aktuální stav: 12 380 km, předpokládaný nájezd: ~520 km/měsíc".
- **Dashboard widget „Nájezdy"** — využije stejnou logiku pro projekci na konec leasingu (varování pokud projekce > limit ze smlouvy).

---

## Technické detaily

### Web Push setup
- VAPID klíče vygenerované přes `web-push` (uloženo do secrets).
- `manifest.json` rozšířit o `gcm_sender_id` není potřeba (Web Push standard).
- Service worker registrovaný v `src/main.tsx`.

### Cron pro `notify-expirations`
- `supabase/config.toml` → `[functions.notify-expirations] schedule = "0 7 * * *"` (denně v 7:00).

### Realtime
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` — pro live update zvonečku.

---

## Co zůstává mimo rozsah
- E-mailové notifikace (jen příprava toggle, odeslání bude samostatně přes Resend).
- Vlastní nativní mobilní aplikace (jen PWA Web Push, funguje na Androidu a iOS 16.4+).
