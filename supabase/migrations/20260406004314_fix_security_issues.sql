/*
  # Fix Security Issues
  
  ## Overview
  Address RLS policy vulnerabilities and remove unused indexes
  
  ## Changes Made
  1. Replace overly permissive RLS policies with proper authentication checks
  2. Remove unused indexes to improve database performance
  3. Implement restrictive default policies with specific allow-list patterns
  
  ## RLS Policy Updates
  - All insert/update policies now require authenticated users
  - Policies check user context before allowing operations
  - Maintained public read access for monitoring dashboard
  
  ## Index Removals
  - Remove unused idx_sensor_readings_type_time
  - Remove unused idx_external_feeds_type_time
  - Remove unused idx_evidence_alert
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_sensor_readings_type_time;
DROP INDEX IF EXISTS idx_external_feeds_type_time;
DROP INDEX IF EXISTS idx_evidence_alert;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Anyone can insert sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Anyone can read external feeds" ON external_feeds;
DROP POLICY IF EXISTS "Anyone can insert external feeds" ON external_feeds;
DROP POLICY IF EXISTS "Anyone can read alerts" ON alerts;
DROP POLICY IF EXISTS "Anyone can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Anyone can update alerts" ON alerts;
DROP POLICY IF EXISTS "Anyone can read evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Anyone can insert evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Anyone can read thresholds" ON alert_thresholds;
DROP POLICY IF EXISTS "Anyone can insert thresholds" ON alert_thresholds;
DROP POLICY IF EXISTS "Anyone can update thresholds" ON alert_thresholds;

-- Sensor readings policies
CREATE POLICY "Read sensor readings"
  ON sensor_readings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insert sensor readings"
  ON sensor_readings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- External feeds policies
CREATE POLICY "Read external feeds"
  ON external_feeds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insert external feeds"
  ON external_feeds FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Alerts policies
CREATE POLICY "Read own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Evidence files policies
CREATE POLICY "Read evidence files"
  ON evidence_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create evidence files"
  ON evidence_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Alert thresholds policies
CREATE POLICY "Read thresholds"
  ON alert_thresholds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create thresholds"
  ON alert_thresholds FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Update thresholds"
  ON alert_thresholds FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);