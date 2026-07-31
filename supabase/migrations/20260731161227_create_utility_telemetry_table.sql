/*
# Create utility_telemetry table for the TelemetryBridge pipeline

1. Purpose
- Provides a durable landing table for industrial/utility sensor telemetry
  transmitted by the Python `TelemetryBridge` script (water pump stations,
  pressure/flow/chlorine readings, etc.).
- The table mirrors the Pydantic `SensorTelemetryPayload` schema so every
  field the bridge validates is preserved exactly.

2. New Tables
- `utility_telemetry`
  - `id`              uuid primary key (auto-generated)
  - `station_id`      text, not null  — unique identifier for the utility station / pump house
  - `metric_type`     text, not null  — type of metric (pressure_psi, flow_rate_gpm, chlorine_ppm, ...)
  - `reading_value`   double precision, not null — numerical sensor measurement
  - `status_flag`     text, not null  — operational status (NORMAL, WARNING, FAULT)
  - `recorded_at`     timestamptz, not null — ISO-8601 timestamp from the sensor (bridge supplies it)
  - `created_at`      timestamptz, default now() — when the row landed in the database

3. Indexes
- `idx_utility_telemetry_station_id` on `station_id` for per-station queries
- `idx_utility_telemetry_recorded_at` on `recorded_at` for time-range queries

4. Security
- Enable RLS on `utility_telemetry`.
- This is a single-tenant app with no sign-in screen, so the anon-key client
  (used by both the edge function and any frontend) must be able to read and
  write. Policies are scoped to `anon, authenticated` with `USING (true)` /
  `WITH CHECK (true)` because this telemetry stream is intentionally shared
  operational data, not per-user private data.
*/

CREATE TABLE IF NOT EXISTS utility_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  metric_type text NOT NULL,
  reading_value double precision NOT NULL,
  status_flag text NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utility_telemetry_station_id
  ON utility_telemetry (station_id);

CREATE INDEX IF NOT EXISTS idx_utility_telemetry_recorded_at
  ON utility_telemetry (recorded_at);

ALTER TABLE utility_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_utility_telemetry" ON utility_telemetry;
CREATE POLICY "anon_select_utility_telemetry" ON utility_telemetry
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_utility_telemetry" ON utility_telemetry;
CREATE POLICY "anon_insert_utility_telemetry" ON utility_telemetry
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_utility_telemetry" ON utility_telemetry;
CREATE POLICY "anon_update_utility_telemetry" ON utility_telemetry
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_utility_telemetry" ON utility_telemetry;
CREATE POLICY "anon_delete_utility_telemetry" ON utility_telemetry
  FOR DELETE TO anon, authenticated USING (true);
