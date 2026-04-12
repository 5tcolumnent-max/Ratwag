/*
  # Fix Indexes and Security Configuration

  ## Summary
  Addresses all reported performance and security advisories.

  ## Changes

  ### 1. Add Missing Foreign Key Index
  - `evidence_files.alert_id` — adds a covering index so JOINs and lookups
    against `alerts` do not trigger sequential scans.

  ### 2. Drop Unused user_id Indexes
  The following indexes were flagged as unused. Because RLS policies already
  filter every query by `auth.uid() = user_id`, Postgres never needs a
  separate B-tree index on `user_id` alone for these tables. Removing them
  reduces write amplification and index bloat.

  Tables affected:
  - safety_scan_results
  - alerts
  - audit_log
  - evidence_files
  - external_feeds
  - forensic_artifacts
  - incident_records
  - robotics_telemetry
  - sensor_readings
  - threat_intel_feeds
  - vulnerability_findings

  ### Notes
  - Auth DB connection strategy and leaked password protection are
    project-level settings managed in the Supabase dashboard and cannot
    be changed via SQL migrations.
*/

-- 1. Add covering index for the unindexed foreign key
CREATE INDEX IF NOT EXISTS idx_evidence_files_alert_id
  ON public.evidence_files (alert_id);

-- 2. Drop unused user_id indexes
DROP INDEX IF EXISTS public.idx_safety_scan_results_user_id;
DROP INDEX IF EXISTS public.idx_alerts_user_id;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_evidence_files_user_id;
DROP INDEX IF EXISTS public.idx_external_feeds_user_id;
DROP INDEX IF EXISTS public.idx_forensic_artifacts_user_id;
DROP INDEX IF EXISTS public.idx_incident_records_user_id;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_user_id;
DROP INDEX IF EXISTS public.idx_sensor_readings_user_id;
DROP INDEX IF EXISTS public.idx_threat_intel_feeds_user_id;
DROP INDEX IF EXISTS public.idx_vulnerability_findings_user_id;
