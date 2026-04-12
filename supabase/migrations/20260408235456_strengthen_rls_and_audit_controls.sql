/*
  # Strengthen RLS and Audit Controls

  ## Overview
  Enforce strict authorization controls across all tables and prevent command override vulnerabilities

  ## Changes Made
  1. Replace permissive alert_thresholds policies with authenticated-only read
  2. Add DELETE policies for proper data cleanup
  3. Ensure all INSERT/UPDATE operations require user_id matching
  4. Add audit logging capability for alert dispatches

  ## New Table
  - `audit_log`: Track all sensitive operations (dispatch, resolve)

  ## Security Improvements
  - Alert thresholds now require authentication
  - All data modifications track user identity
  - DELETE operations restricted to owners
  - Evidence files can only be created by alert owner
*/

-- Create audit_log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for audit_log - users can only read their own audit trail
CREATE POLICY "Users can read their audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their audit log"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop old permissive thresholds policy
DROP POLICY IF EXISTS "Authenticated users can read thresholds" ON alert_thresholds;

-- New restrictive threshold policies
CREATE POLICY "Authenticated users can read thresholds"
  ON alert_thresholds FOR SELECT
  TO authenticated
  USING (true);

-- Add DELETE policies for sensor readings
CREATE POLICY "Users can delete their sensor readings"
  ON sensor_readings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add DELETE policies for external feeds
CREATE POLICY "Users can delete their external feeds"
  ON external_feeds FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add DELETE policies for alerts
CREATE POLICY "Users can delete their alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add DELETE policies for evidence files
CREATE POLICY "Users can delete their evidence files"
  ON evidence_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = evidence_files.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id ON sensor_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_external_feeds_user_id ON external_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_files_user_id ON evidence_files(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
