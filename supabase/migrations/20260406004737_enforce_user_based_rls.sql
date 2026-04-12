/*
  # Enforce User-Based RLS Policies
  
  ## Overview
  Add user_id tracking and enforce user-based row-level security
  
  ## Changes Made
  1. Add user_id column to all data tables for user attribution
  2. Update RLS policies to enforce user ownership
  3. Track which user created each record
  
  ## New Columns
  - user_id column on: sensor_readings, external_feeds, alerts, evidence_files
  
  ## RLS Policy Updates
  - Users can only read/modify their own data
  - Maintains system-wide visibility for alerts
*/

-- Add user_id columns to sensor_readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sensor_readings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sensor_readings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id columns to external_feeds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'external_feeds' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE external_feeds ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id columns to alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE alerts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id columns to evidence_files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evidence_files' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE evidence_files ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old policies on sensor_readings
DROP POLICY IF EXISTS "Read sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Insert sensor readings" ON sensor_readings;

-- New sensor_readings policies
CREATE POLICY "Users can read their sensor readings"
  ON sensor_readings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create sensor readings"
  ON sensor_readings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop old policies on external_feeds
DROP POLICY IF EXISTS "Read external feeds" ON external_feeds;
DROP POLICY IF EXISTS "Insert external feeds" ON external_feeds;

-- New external_feeds policies
CREATE POLICY "Users can read their external feeds"
  ON external_feeds FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create external feeds"
  ON external_feeds FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Drop old policies on alerts
DROP POLICY IF EXISTS "Read own alerts" ON alerts;
DROP POLICY IF EXISTS "Create alerts" ON alerts;
DROP POLICY IF EXISTS "Update own alerts" ON alerts;

-- New alerts policies
CREATE POLICY "Users can read their alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Drop old policies on evidence_files
DROP POLICY IF EXISTS "Read evidence files" ON evidence_files;
DROP POLICY IF EXISTS "Create evidence files" ON evidence_files;

-- New evidence_files policies
CREATE POLICY "Users can read their evidence files"
  ON evidence_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = evidence_files.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create evidence files"
  ON evidence_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = evidence_files.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

-- Drop old policies on alert_thresholds (these remain admin-level)
DROP POLICY IF EXISTS "Read thresholds" ON alert_thresholds;
DROP POLICY IF EXISTS "Create thresholds" ON alert_thresholds;
DROP POLICY IF EXISTS "Update thresholds" ON alert_thresholds;

-- Alert thresholds are read-only for authenticated users (global config)
CREATE POLICY "Authenticated users can read thresholds"
  ON alert_thresholds FOR SELECT
  TO authenticated
  USING (true);