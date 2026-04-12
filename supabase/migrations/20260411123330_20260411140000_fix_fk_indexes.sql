/*
  # Fix Unindexed Foreign Keys and Unused Index

  ## Changes

  1. Re-add covering indexes for user_id foreign keys on all affected tables
     - These were previously dropped as "unused" but are required to cover the FK constraints
     - Tables: alerts, audit_log, evidence_files, external_feeds, forensic_artifacts,
       incident_records, robotics_telemetry, safety_scan_results, sensor_readings,
       threat_intel_feeds, vulnerability_findings

  2. Drop unused index
     - Drop idx_evidence_files_alert_id which was added but has not been used

  ## Notes
  - Auth connection strategy and leaked password protection must be configured
    in the Supabase Dashboard under Authentication settings
*/

-- Re-add user_id indexes to cover foreign key constraints
CREATE INDEX IF NOT EXISTS idx_alerts_user_id
  ON public.alerts (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON public.audit_log (user_id);

CREATE INDEX IF NOT EXISTS idx_evidence_files_user_id
  ON public.evidence_files (user_id);

CREATE INDEX IF NOT EXISTS idx_external_feeds_user_id
  ON public.external_feeds (user_id);

CREATE INDEX IF NOT EXISTS idx_forensic_artifacts_user_id
  ON public.forensic_artifacts (user_id);

CREATE INDEX IF NOT EXISTS idx_incident_records_user_id
  ON public.incident_records (user_id);

CREATE INDEX IF NOT EXISTS idx_robotics_telemetry_user_id
  ON public.robotics_telemetry (user_id);

CREATE INDEX IF NOT EXISTS idx_safety_scan_results_user_id
  ON public.safety_scan_results (user_id);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id
  ON public.sensor_readings (user_id);

CREATE INDEX IF NOT EXISTS idx_threat_intel_feeds_user_id
  ON public.threat_intel_feeds (user_id);

CREATE INDEX IF NOT EXISTS idx_vulnerability_findings_user_id
  ON public.vulnerability_findings (user_id);

-- Drop unused alert_id index
DROP INDEX IF EXISTS public.idx_evidence_files_alert_id;
