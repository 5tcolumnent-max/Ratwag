/*
# Create database webhook trigger on utility_telemetry

1. Purpose
- After every INSERT on `utility_telemetry`, automatically POST the new row
  to the `anomaly-detector` edge function for threat evaluation.
- Uses the `pg_net` extension for async HTTP from inside PostgreSQL.

2. Extensions
- Enable `pg_net` (async HTTP client for PostgreSQL).

3. New Functions
- `notify_anomaly_detector()` — trigger function that builds a JSON payload
  from the NEW row and fires an async POST to the anomaly-detector edge
  function URL. Non-blocking: uses net.http_post which returns immediately.

4. New Triggers
- `trg_telemetry_anomaly_detector` — AFTER INSERT ON utility_telemetry,
  FOR EACH ROW, calls notify_anomaly_detector().

5. Security
- No new tables; no RLS changes.
- The trigger function runs with SECURITY DEFINER (supabase_admin) so it can
  call pg_net functions regardless of the inserting role.
- The edge function URL is constructed from the project's supabase_url.

6. Important Notes
- pg_net is async: the POST fires and the trigger does not block on the
  response. This keeps inserts fast even if the edge function is slow.
- The anon key is passed as the Authorization Bearer + apikey header so the
  edge function (verify_jwt=false) still gets a valid Supabase client.
- If pg_net is not yet enabled, the CREATE EXTENSION call is idempotent.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_anomaly_detector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_url text;
  anon_key text;
BEGIN
  edge_url := current_setting('app.supabase_url', true) || '/functions/v1/anomaly-detector';
  anon_key := current_setting('app.supabase_anon_key', true);

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

DROP TRIGGER IF EXISTS trg_telemetry_anomaly_detector ON public.utility_telemetry;

CREATE TRIGGER trg_telemetry_anomaly_detector
  AFTER INSERT ON public.utility_telemetry
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_anomaly_detector();
