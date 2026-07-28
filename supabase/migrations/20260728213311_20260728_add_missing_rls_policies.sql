/*
# Add missing RLS policies across all tables

## Purpose
A security audit found that 9 tables had RLS enabled but were missing one or more
CRUD policies, leaving those operations blocked for all users. This migration
adds the missing owner-scoped (or shared-config) policies so every table has
complete SELECT/INSERT/UPDATE/DELETE coverage.

## Changes by table

### alert_thresholds (shared config — no user_id column)
- Added INSERT, UPDATE, DELETE policies scoped to `authenticated`.
- This table has no user_id; it is intentionally shared global config.
- Any authenticated user can create, update, or delete threshold rules.

### audit_log (owner-scoped via user_id)
- Added UPDATE and DELETE policies, owner-scoped: `auth.uid() = user_id`.

### audit_log_entries (owner-scoped via user_id)
- Added UPDATE and DELETE policies, owner-scoped: `auth.uid() = user_id`.

### evidence_files (owner-scoped via alert_id → alerts.user_id)
- Added UPDATE policy, scoped through the parent alert's ownership.

### external_feeds (owner-scoped via user_id)
- Added UPDATE policy, owner-scoped: `auth.uid() = user_id`.

### infrastructure_readings (owner-scoped via user_id)
- Added UPDATE policy, owner-scoped: `auth.uid() = user_id`.

### safety_scan_results (owner-scoped via user_id)
- Added DELETE policy, owner-scoped: `auth.uid() = user_id`.

### sensor_readings (owner-scoped via user_id)
- Added UPDATE policy, owner-scoped: `auth.uid() = user_id`.

### user_preferences (owner-scoped via user_id)
- Added DELETE policy, owner-scoped: `auth.uid() = user_id`.

## Security notes
- All owner-scoped policies use `auth.uid()` for ownership checks.
- `alert_thresholds` uses `USING (true)` because it is intentionally shared
  config with no owner column — documented here per policy guidelines.
- All policies are scoped `TO authenticated`.
- Each policy uses DROP IF EXISTS + CREATE for idempotency.
*/

-- ============================================================
-- alert_thresholds (shared config, no user_id)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create thresholds" ON alert_thresholds;
CREATE POLICY "Authenticated users can create thresholds"
ON alert_thresholds FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update thresholds" ON alert_thresholds;
CREATE POLICY "Authenticated users can update thresholds"
ON alert_thresholds FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete thresholds" ON alert_thresholds;
CREATE POLICY "Authenticated users can delete thresholds"
ON alert_thresholds FOR DELETE
TO authenticated USING (true);

-- ============================================================
-- audit_log (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their audit log" ON audit_log;
CREATE POLICY "Users can update their audit log"
ON audit_log FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their audit log" ON audit_log;
CREATE POLICY "Users can delete their audit log"
ON audit_log FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- audit_log_entries (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can update own audit log entries" ON audit_log_entries;
CREATE POLICY "Users can update own audit log entries"
ON audit_log_entries FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own audit log entries" ON audit_log_entries;
CREATE POLICY "Users can delete own audit log entries"
ON audit_log_entries FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- evidence_files (scoped via parent alert ownership)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their evidence files" ON evidence_files;
CREATE POLICY "Users can update their evidence files"
ON evidence_files FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM alerts
  WHERE alerts.id = evidence_files.alert_id
  AND alerts.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM alerts
  WHERE alerts.id = evidence_files.alert_id
  AND alerts.user_id = auth.uid()
));

-- ============================================================
-- external_feeds (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their external feeds" ON external_feeds;
CREATE POLICY "Users can update their external feeds"
ON external_feeds FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- infrastructure_readings (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can update own infrastructure readings" ON infrastructure_readings;
CREATE POLICY "Users can update own infrastructure readings"
ON infrastructure_readings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- safety_scan_results (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own safety scans" ON safety_scan_results;
CREATE POLICY "Users can delete own safety scans"
ON safety_scan_results FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- sensor_readings (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their sensor readings" ON sensor_readings;
CREATE POLICY "Users can update their sensor readings"
ON sensor_readings FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- user_preferences (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
CREATE POLICY "Users can delete own preferences"
ON user_preferences FOR DELETE
TO authenticated USING (auth.uid() = user_id);
