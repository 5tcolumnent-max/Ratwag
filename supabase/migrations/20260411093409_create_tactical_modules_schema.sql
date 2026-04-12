/*
  # Tactical Modules Schema

  ## Summary
  Adds three tables to support the new Sovereign 3.0 tactical modules:

  1. New Tables
     - `audit_log_entries` — System-wide activity log for federal-nexus documentation; records
       all user actions, module interactions, and system events with severity levels
     - `robotics_telemetry` — Real-time telemetry snapshots from aerial and aquatic drones;
       includes battery, GPS, LiDAR/sonar sensor readings, and mission phase
     - `safety_scan_results` — Micro-imagery analysis results with pathogen detection scoring,
       hazard classification, and morphological signature data

  2. Security
     - RLS enabled on all tables using (select auth.uid()) pattern for performance
     - Authenticated users can only read/write their own records

  3. Indexes
     - Indexed on created_at for efficient time-based queries (logs, telemetry streams)
     - Indexed on hazard_level for fast safety triage
*/

-- ============================================================
-- audit_log_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  module text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  entity_id text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  session_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own audit log entries"
  ON public.audit_log_entries FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own audit log entries"
  ON public.audit_log_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON public.audit_log_entries (severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log_entries (module);

-- ============================================================
-- robotics_telemetry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.robotics_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drone_id text NOT NULL DEFAULT '',
  drone_type text NOT NULL DEFAULT 'aerial',
  mission_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'standby',
  battery_pct integer NOT NULL DEFAULT 100 CHECK (battery_pct >= 0 AND battery_pct <= 100),
  latitude numeric(10,6) NOT NULL DEFAULT 0,
  longitude numeric(10,6) NOT NULL DEFAULT 0,
  altitude_m numeric(8,2) NOT NULL DEFAULT 0,
  depth_m numeric(8,2) NOT NULL DEFAULT 0,
  heading_deg integer NOT NULL DEFAULT 0 CHECK (heading_deg >= 0 AND heading_deg <= 360),
  speed_ms numeric(6,2) NOT NULL DEFAULT 0,
  signal_strength integer NOT NULL DEFAULT 100 CHECK (signal_strength >= 0 AND signal_strength <= 100),
  lidar_range_m numeric(8,2) NOT NULL DEFAULT 0,
  sonar_depth_m numeric(8,2) NOT NULL DEFAULT 0,
  obstacle_detected boolean NOT NULL DEFAULT false,
  obstacle_distance_m numeric(6,2),
  temperature_c numeric(5,2) NOT NULL DEFAULT 20,
  payload_active boolean NOT NULL DEFAULT false,
  spatial_map_json text NOT NULL DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.robotics_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own robotics telemetry"
  ON public.robotics_telemetry FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own robotics telemetry"
  ON public.robotics_telemetry FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_robotics_telemetry_drone ON public.robotics_telemetry (drone_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_robotics_telemetry_recorded ON public.robotics_telemetry (recorded_at DESC);

-- ============================================================
-- safety_scan_results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.safety_scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id text NOT NULL DEFAULT '',
  sample_label text NOT NULL DEFAULT '',
  image_name text NOT NULL DEFAULT '',
  image_size_bytes bigint NOT NULL DEFAULT 0,
  hazard_level text NOT NULL DEFAULT 'low',
  confidence_pct integer NOT NULL DEFAULT 0 CHECK (confidence_pct >= 0 AND confidence_pct <= 100),
  pathogen_detected boolean NOT NULL DEFAULT false,
  pathogen_class text NOT NULL DEFAULT '',
  morphology_signatures text[] NOT NULL DEFAULT '{}',
  gram_stain text NOT NULL DEFAULT 'unknown',
  motility text NOT NULL DEFAULT 'unknown',
  shape text NOT NULL DEFAULT 'unknown',
  notes text NOT NULL DEFAULT '',
  analyst text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_scan_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own safety scans"
  ON public.safety_scan_results FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own safety scans"
  ON public.safety_scan_results FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own safety scans"
  ON public.safety_scan_results FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_safety_scans_hazard ON public.safety_scan_results (hazard_level);
CREATE INDEX IF NOT EXISTS idx_safety_scans_scanned ON public.safety_scan_results (scanned_at DESC);
