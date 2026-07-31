/*
# Fix anomaly-detector trigger with hardcoded edge function URL

1. Purpose
- The previous trigger function used current_setting() to read the project URL
  and anon key, but we can't set database-level config (ALTER DATABASE denied).
- This migration rewrites notify_anomaly_detector() with the values inlined.

2. Changes
- REPLACE function notify_anomaly_detector() with hardcoded URL + anon key.
- Trigger trg_telemetry_anomaly_detector is unchanged (already attached).

3. Notes
- The anon key is the public anon key, safe to inline.
- If the project URL or anon key changes, this function must be updated.
*/

CREATE OR REPLACE FUNCTION public.notify_anomaly_detector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_url text := 'https://yvgpozrzmpxtuiemycci.supabase.co/functions/v1/anomaly-detector';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z3BvenJ6bXB4dHVpZW15Y2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDY3MzYsImV4cCI6MjEwMTA4MjczNn0.dWxgGJfEjK7UPUomEYSNZVDQjr0spQwdI3GhN9eR7EQ';
BEGIN
  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'X-Data-Channel', 'OT-Telemetry-Readonly'
    ),
    body := to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;
