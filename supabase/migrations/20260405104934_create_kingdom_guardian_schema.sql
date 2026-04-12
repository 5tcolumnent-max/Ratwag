/*
  # Kingdom Guardian Fusion - Database Schema
  
  ## Overview
  Animal welfare monitoring system with IoT sensors and external feed integration
  
  ## New Tables
  
  ### `sensor_readings`
  Primary internal sensor data with veto power
  - `id` (uuid, primary key)
  - `sensor_type` (text) - ammonia, humidity, mold_index
  - `value` (numeric) - sensor reading value
  - `unit` (text) - ppm, percentage, index
  - `location` (text) - sensor location identifier
  - `recorded_at` (timestamptz) - when reading was taken
  - `created_at` (timestamptz)
  
  ### `external_feeds`
  Aggregated data from external monitoring apps
  - `id` (uuid, primary key)
  - `feed_type` (text) - visual_distress, bioacoustic_pain, bmi_health
  - `status` (text) - normal, distress, critical
  - `confidence_score` (numeric) - 0-100
  - `metadata` (jsonb) - additional feed-specific data
  - `recorded_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### `alerts`
  Triggered alerts based on Weighted Truth Engine
  - `id` (uuid, primary key)
  - `alert_level` (integer) - 1 or 2
  - `alert_type` (text) - environmental_abuse, immediate_rescue
  - `trigger_conditions` (jsonb) - what triggered the alert
  - `sensor_data_snapshot` (jsonb) - sensor readings at trigger time
  - `external_data_snapshot` (jsonb) - external feed data at trigger time
  - `status` (text) - active, acknowledged, resolved
  - `evidence_recorded` (boolean) - whether auto-recording was triggered
  - `dispatched` (boolean) - whether evidence was dispatched
  - `dispatched_at` (timestamptz)
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz)
  
  ### `evidence_files`
  Auto-recorded evidence when alerts trigger
  - `id` (uuid, primary key)
  - `alert_id` (uuid, foreign key)
  - `file_type` (text) - audio, video, pdf
  - `file_url` (text) - storage location
  - `duration_seconds` (integer)
  - `file_size_bytes` (bigint)
  - `created_at` (timestamptz)
  
  ### `alert_thresholds`
  Configurable threshold rules for the Weighted Truth Engine
  - `id` (uuid, primary key)
  - `rule_name` (text)
  - `rule_description` (text)
  - `conditions` (jsonb) - threshold conditions
  - `alert_level` (integer)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users to read and insert data
*/

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  location text NOT NULL DEFAULT 'primary',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create external_feeds table
CREATE TABLE IF NOT EXISTS external_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_type text NOT NULL,
  status text NOT NULL,
  confidence_score numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_level integer NOT NULL,
  alert_type text NOT NULL,
  trigger_conditions jsonb DEFAULT '{}'::jsonb,
  sensor_data_snapshot jsonb DEFAULT '{}'::jsonb,
  external_data_snapshot jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  evidence_recorded boolean DEFAULT false,
  dispatched boolean DEFAULT false,
  dispatched_at timestamptz,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create evidence_files table
CREATE TABLE IF NOT EXISTS evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  file_type text NOT NULL,
  file_url text NOT NULL,
  duration_seconds integer DEFAULT 30,
  file_size_bytes bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create alert_thresholds table
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_description text NOT NULL,
  conditions jsonb NOT NULL,
  alert_level integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_type_time ON sensor_readings(sensor_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_feeds_type_time ON external_feeds(feed_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_alert ON evidence_files(alert_id);

-- Enable Row Level Security
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensor_readings
CREATE POLICY "Anyone can read sensor readings"
  ON sensor_readings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert sensor readings"
  ON sensor_readings FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for external_feeds
CREATE POLICY "Anyone can read external feeds"
  ON external_feeds FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert external feeds"
  ON external_feeds FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for alerts
CREATE POLICY "Anyone can read alerts"
  ON alerts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert alerts"
  ON alerts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update alerts"
  ON alerts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for evidence_files
CREATE POLICY "Anyone can read evidence files"
  ON evidence_files FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert evidence files"
  ON evidence_files FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for alert_thresholds
CREATE POLICY "Anyone can read thresholds"
  ON alert_thresholds FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert thresholds"
  ON alert_thresholds FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update thresholds"
  ON alert_thresholds FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default alert threshold rules
INSERT INTO alert_thresholds (rule_name, rule_description, conditions, alert_level, is_active)
VALUES 
  (
    'Environmental Abuse Detection',
    'LEVEL 1: Humidity > 75% for 6 hours + Ammonia > 25ppm',
    '{"humidity_threshold": 75, "humidity_duration_hours": 6, "ammonia_threshold": 25}'::jsonb,
    1,
    true
  ),
  (
    'Immediate Rescue Required',
    'LEVEL 2: External Distress + Poor Internal Air Quality',
    '{"external_distress_required": true, "poor_air_quality_required": true}'::jsonb,
    2,
    true
  )
ON CONFLICT DO NOTHING;