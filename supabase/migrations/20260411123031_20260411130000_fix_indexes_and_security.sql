/*
  # Fix Index Issues and Security Configuration

  ## Changes

  1. Unindexed Foreign Keys
    - Add index on `evidence_files.alert_id` to cover the `evidence_files_alert_id_fkey` foreign key
      and improve JOIN/lookup performance.

  2. Unused Indexes Removed
    - Drop unused `user_id` indexes on the following tables:
      - `incident_records`
      - `robotics_telemetry`
      - `safety_scan_results`
      - `sensor_readings`
      - `alerts`
      - `audit_log`
      - `evidence_files`
      - `external_feeds`
      - `forensic_artifacts`
      - `threat_intel_feeds`
      - `vulnerability_findings`
    - Unused indexes waste storage and slow down writes with no read benefit.

  ## Notes
  - Auth connection strategy and leaked password protection must be configured
    in the Supabase Dashboard (Auth settings) — these are not configurable via SQL migrations.
*/

-- Add covering index for the unindexed foreign key on evidence_files.alert_id
CREATE INDEX IF NOT EXISTS idx_evidence_files_alert_id
  ON public.evidence_files (alert_id);

-- Drop unused user_id indexes
DROP INDEX IF EXISTS public.idx_incident_records_user_id;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_user_id;
DROP INDEX IF EXISTS public.idx_safety_scan_results_user_id;
DROP INDEX IF EXISTS public.idx_sensor_readings_user_id;
DROP INDEX IF EXISTS public.idx_alerts_user_id;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_evidence_files_user_id;
DROP INDEX IF EXISTS public.idx_external_feeds_user_id;
DROP INDEX IF EXISTS public.idx_forensic_artifacts_user_id;
DROP INDEX IF EXISTS public.idx_threat_intel_feeds_user_id;
DROP INDEX IF EXISTS public.idx_vulnerability_findings_user_id;
