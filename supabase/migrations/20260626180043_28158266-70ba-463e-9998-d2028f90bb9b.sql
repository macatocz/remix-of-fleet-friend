
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('notify-expirations-daily');
EXCEPTION WHEN OTHERS THEN
  -- ignore
  NULL;
END $$;

SELECT cron.schedule(
  'notify-expirations-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rrrsrjzbdfqwctkquwhk.supabase.co/functions/v1/notify-expirations',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
