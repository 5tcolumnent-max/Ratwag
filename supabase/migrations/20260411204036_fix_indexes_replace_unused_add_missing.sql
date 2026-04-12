/*
  # Fix indexes: drop unused user_id indexes, add missing alert_id index

  ## Summary
  The previously added user_id indexes have not been used in queries and are flagged
  as unused, adding unnecessary write overhead. This migration removes them and adds
  the missing covering index for the evidence_files alert_id foreign key.

  ## Changes

  ### 1. Drop Unused Indexes
  The following indexes were created but have not been used by any queries:
  - idx_alerts_user_id
  - idx_audit_log_user_id
  - idx_evidence_files_user_id
  - idx_external_feeds_user_id
  - idx_forensic_artifacts_user_id
  - idx_incident_records_user_id
  - idx_robotics_telemetry_user_id
  - idx_safety_scan_results_user_id
  - idx_sensor_readings_user_id
  - idx_threat_intel_feeds_user_id
  - idx_vulnerability_findings_user_id

  ### 2. Add Missing Foreign Key Index
  - `public.evidence_files` - idx_evidence_files_alert_id covering the alert_id foreign key

  ### Notes
  - Unused indexes consume storage and slow down writes with no read benefit
  - The alert_id FK index is needed for JOIN/filter performance on evidence_files
*/

DROP INDEX IF EXISTS public.idx_alerts_user_id;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_evidence_files_user_id;
DROP INDEX IF EXISTS public.idx_external_feeds_user_id;
DROP INDEX IF EXISTS public.idx_forensic_artifacts_user_id;
DROP INDEX IF EXISTS public.idx_incident_records_user_id;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_user_id;
DROP INDEX IF EXISTS public.idx_safety_scan_results_user_id;
DROP INDEX IF EXISTS public.idx_sensor_readings_user_id;
DROP INDEX IF EXISTS public.idx_threat_intel_feeds_user_id;
DROP INDEX IF EXISTS public.idx_vulnerability_findings_user_id;

CREATE INDEX IF NOT EXISTS idx_evidence_files_alert_id ON public.evidence_files (alert_id);
