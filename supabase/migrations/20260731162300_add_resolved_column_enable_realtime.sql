/*
# Add resolved column to active_threat_alerts + enable realtime

1. Purpose
- Add a `resolved` boolean column so operators can acknowledge/resolve alerts.
- Add the table to the Supabase realtime publication so the frontend can
  subscribe to INSERT events via .channel().

2. Changes
- ALTER TABLE active_threat_alerts ADD COLUMN resolved boolean DEFAULT false
- CREATE INDEX on resolved for filtering active vs resolved alerts
- ALTER PUBLICATION supabase_realtime ADD TABLE active_threat_alerts
- Also add utility_telemetry to realtime (useful for live telemetry display)

3. Security
- No RLS changes. The existing anon+authenticated policies cover the new column
  since it has a safe default and is updateable under the existing UPDATE policy.
*/

ALTER TABLE public.active_threat_alerts
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_active_threat_alerts_resolved
  ON public.active_threat_alerts (resolved);

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_threat_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.utility_telemetry;
