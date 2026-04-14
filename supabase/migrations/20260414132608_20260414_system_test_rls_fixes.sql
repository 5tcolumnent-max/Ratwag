/*
  # System Test: RLS Policy Fixes

  ## Summary
  All-system test revealed several tables with incomplete RLS coverage:
  - robotics_telemetry: missing UPDATE and DELETE policies
  - external_feeds, sensor_readings, infrastructure_readings, safety_scan_results:
    INSERT policies lacked WITH CHECK, allowing any user to insert rows with arbitrary user_id

  ## Changes
  1. robotics_telemetry — add UPDATE and DELETE policies (user-scoped)
  2. external_feeds — add WITH CHECK to INSERT policy
  3. sensor_readings — add WITH CHECK to INSERT policy
  4. infrastructure_readings — add WITH CHECK to INSERT policy
  5. safety_scan_results — add WITH CHECK to INSERT policy

  ## Security Notes
  - All policies enforce auth.uid() = user_id
  - No policy uses USING(true)
  - These fixes close potential data-injection vectors where an authenticated user
    could write rows attributed to a different user_id
*/

-- 1. robotics_telemetry: add missing UPDATE + DELETE
CREATE POLICY "Users can update own robotics telemetry"
  ON robotics_telemetry FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own robotics telemetry"
  ON robotics_telemetry FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 2. external_feeds: drop unprotected INSERT, recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can create external feeds" ON external_feeds;

CREATE POLICY "Users can create own external feeds"
  ON external_feeds FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. sensor_readings: drop unprotected INSERT, recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can create sensor readings" ON sensor_readings;

CREATE POLICY "Users can create own sensor readings"
  ON sensor_readings FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 4. infrastructure_readings: drop unprotected INSERT, recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can insert own infrastructure readings" ON infrastructure_readings;

CREATE POLICY "Users can insert own infrastructure readings"
  ON infrastructure_readings FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 5. safety_scan_results: drop unprotected INSERT, recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can insert own safety scans" ON safety_scan_results;

CREATE POLICY "Users can insert own safety scans"
  ON safety_scan_results FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- 6. Add missing recorded_at index for sensor_readings (improves time-series queries)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at
  ON sensor_readings (user_id, recorded_at DESC);

-- 7. Add missing recorded_at index for robotics_telemetry
CREATE INDEX IF NOT EXISTS idx_robotics_telemetry_recorded_at
  ON robotics_telemetry (user_id, recorded_at DESC);

-- 8. Add missing drone_id index for robotics_telemetry (used in upsert/lookup)
CREATE INDEX IF NOT EXISTS idx_robotics_telemetry_drone_id
  ON robotics_telemetry (user_id, drone_id);
