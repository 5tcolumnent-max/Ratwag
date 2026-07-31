/*
# Create database trigger for critical threat notification dispatch

1. Purpose
- Whenever a new row is inserted into `active_threat_alerts` with
  threat_level = 'CRITICAL', automatically POST the alert payload to the
  `send-threat-notification` edge function.
- The edge function then forwards to Slack webhooks and/or Twilio SMS.
- Non-CRITICAL (ELEVATED) alerts do NOT trigger external dispatch, preventing
  alert fatigue.

2. New Functions
- `notify_threat_dispatcher()` — AFTER INSERT trigger function that checks
  NEW.threat_level and only fires the HTTP POST for CRITICAL alerts.
  Uses pg_net's net.http_post (async, non-blocking).

3. New Triggers
- `trg_active_threat_alerts_dispatch` — AFTER INSERT ON active_threat_alerts,
  FOR EACH ROW, calls notify_threat_dispatcher().

4. Security
- SECURITY DEFINER (supabase_admin) so the trigger can call pg_net regardless
  of the inserting role.
- The anon key is inlined (public key, safe) to authenticate the edge function
  request.
*/

CREATE OR REPLACE FUNCTION public.notify_threat_dispatcher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_url text := 'https://yvgpozrzmpxtuiemycci.supabase.co/functions/v1/send-threat-notification';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Z3BvenJ6bXB4dHVpZW15Y2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MDY3MzYsImV4cCI6MjEwMTA4MjczNn0.dWxgGJfEjK7UPUomEYSNZVDQjr0spQwdI3GhN9eR7EQ';
BEGIN
  -- Only dispatch external notifications for CRITICAL alerts
  IF NEW.threat_level = 'CRITICAL' THEN
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_active_threat_alerts_dispatch ON public.active_threat_alerts;

CREATE TRIGGER trg_active_threat_alerts_dispatch
  AFTER INSERT ON public.active_threat_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_threat_dispatcher();
