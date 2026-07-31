/*
# Create active_threat_alerts table for the anomaly detection loop

1. Purpose
- Stores anomalies/threats detected by the `anomaly-detector` edge function.
- The frontend subscribes to this table in real-time to surface threats to operators.

2. New Tables
- `active_threat_alerts`
  - `id`              uuid primary key (auto-generated)
  - `station_id`      text, not null  — which station produced the anomaly
  - `threat_level`    text, not null  — severity: 'ELEVATED' or 'CRITICAL'
  - `metric_type`     text, not null  — which metric triggered the alert
  - `anomalous_value` double precision — the offending reading value
  - `description`     text, not null  — human-readable explanation of the threat
  - `triggered_at`    timestamptz, not null — when the anomaly was detected
  - `created_at`      timestamptz, default now() — when the row landed

3. Indexes
- `idx_active_threat_alerts_station_id` on `station_id`
- `idx_active_threat_alerts_triggered_at` on `triggered_at`
- `idx_active_threat_alerts_threat_level` on `threat_level`

4. Security
- Enable RLS on `active_threat_alerts`.
- Single-tenant app with no sign-in screen: the anon-key frontend must be able
  to read alerts (for real-time subscription) and the edge function must be able
  to insert them. Policies scoped to `anon, authenticated` with `USING (true)` /
  `WITH CHECK (true)` because these are shared operational alerts, not
  per-user private data.
*/

CREATE TABLE IF NOT EXISTS active_threat_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  threat_level text NOT NULL,
  metric_type text NOT NULL,
  anomalous_value double precision,
  description text NOT NULL,
  triggered_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_threat_alerts_station_id
  ON active_threat_alerts (station_id);

CREATE INDEX IF NOT EXISTS idx_active_threat_alerts_triggered_at
  ON active_threat_alerts (triggered_at);

CREATE INDEX IF NOT EXISTS idx_active_threat_alerts_threat_level
  ON active_threat_alerts (threat_level);

ALTER TABLE active_threat_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_threat_alerts" ON active_threat_alerts;
CREATE POLICY "anon_select_active_threat_alerts" ON active_threat_alerts
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_active_threat_alerts" ON active_threat_alerts;
CREATE POLICY "anon_insert_active_threat_alerts" ON active_threat_alerts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_active_threat_alerts" ON active_threat_alerts;
CREATE POLICY "anon_update_active_threat_alerts" ON active_threat_alerts
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_active_threat_alerts" ON active_threat_alerts;
CREATE POLICY "anon_delete_active_threat_alerts" ON active_threat_alerts
  FOR DELETE TO anon, authenticated USING (true);
