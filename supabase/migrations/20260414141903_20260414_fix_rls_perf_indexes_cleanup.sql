/*
  # Fix RLS Performance, Unindexed FKs, and Unused Indexes

  ## Summary
  Addresses all security advisor warnings from the Supabase dashboard:

  1. RLS auth() re-evaluation — wrap auth.uid() in (select auth.uid()) for all affected policies
     on: forensic_analysis_sessions, biometric_credentials, feed_heartbeats,
         forensic_vsr_results, forensic_slr_detections

  2. Unindexed foreign keys — add covering indexes for:
     - evidence_files.alert_id
     - forensic_slr_detections.session_id
     - forensic_vsr_results.session_id

  3. Unused indexes — drop indexes that have never been used to reduce write overhead:
     idx_threat_intel_feeds_user_id, idx_vulnerability_findings_user_id,
     idx_forensic_sessions_user_created, idx_audit_log_user_id, idx_evidence_files_user_id,
     idx_alerts_user_id, idx_external_feeds_user_id, idx_forensic_artifacts_user_id,
     idx_incident_records_user_id, idx_robotics_telemetry_user_id,
     idx_safety_scan_results_user_id, idx_sensor_readings_user_id,
     feed_heartbeats_status_idx, idx_forensic_vsr_user_created, feed_heartbeats_last_seen_idx,
     idx_forensic_slr_user_created, idx_biometric_credentials_user, feed_heartbeats_user_id_idx,
     feed_heartbeats_feed_type_idx, idx_sensor_readings_recorded_at,
     idx_robotics_telemetry_recorded_at, idx_robotics_telemetry_drone_id
*/

-- ============================================================
-- 1. FIX RLS: forensic_analysis_sessions (4 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can select own forensic sessions" ON forensic_analysis_sessions;
DROP POLICY IF EXISTS "Users can insert own forensic sessions" ON forensic_analysis_sessions;
DROP POLICY IF EXISTS "Users can update own forensic sessions" ON forensic_analysis_sessions;
DROP POLICY IF EXISTS "Users can delete own forensic sessions" ON forensic_analysis_sessions;

CREATE POLICY "Users can select own forensic sessions"
  ON forensic_analysis_sessions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own forensic sessions"
  ON forensic_analysis_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own forensic sessions"
  ON forensic_analysis_sessions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own forensic sessions"
  ON forensic_analysis_sessions FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 2. FIX RLS: biometric_credentials (4 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can select own biometric credential" ON biometric_credentials;
DROP POLICY IF EXISTS "Users can insert own biometric credential" ON biometric_credentials;
DROP POLICY IF EXISTS "Users can update own biometric credential" ON biometric_credentials;
DROP POLICY IF EXISTS "Users can delete own biometric credential" ON biometric_credentials;

CREATE POLICY "Users can select own biometric credential"
  ON biometric_credentials FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own biometric credential"
  ON biometric_credentials FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own biometric credential"
  ON biometric_credentials FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own biometric credential"
  ON biometric_credentials FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 3. FIX RLS: feed_heartbeats (4 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can select own feed heartbeats" ON feed_heartbeats;
DROP POLICY IF EXISTS "Users can insert own feed heartbeats" ON feed_heartbeats;
DROP POLICY IF EXISTS "Users can update own feed heartbeats" ON feed_heartbeats;
DROP POLICY IF EXISTS "Users can delete own feed heartbeats" ON feed_heartbeats;

CREATE POLICY "Users can select own feed heartbeats"
  ON feed_heartbeats FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own feed heartbeats"
  ON feed_heartbeats FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own feed heartbeats"
  ON feed_heartbeats FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own feed heartbeats"
  ON feed_heartbeats FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 4. FIX RLS: forensic_vsr_results (4 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can select own vsr results" ON forensic_vsr_results;
DROP POLICY IF EXISTS "Users can insert own vsr results" ON forensic_vsr_results;
DROP POLICY IF EXISTS "Users can update own vsr results" ON forensic_vsr_results;
DROP POLICY IF EXISTS "Users can delete own vsr results" ON forensic_vsr_results;

CREATE POLICY "Users can select own vsr results"
  ON forensic_vsr_results FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own vsr results"
  ON forensic_vsr_results FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own vsr results"
  ON forensic_vsr_results FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own vsr results"
  ON forensic_vsr_results FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 5. FIX RLS: forensic_slr_detections (4 policies)
-- ============================================================
DROP POLICY IF EXISTS "Users can select own slr detections" ON forensic_slr_detections;
DROP POLICY IF EXISTS "Users can insert own slr detections" ON forensic_slr_detections;
DROP POLICY IF EXISTS "Users can update own slr detections" ON forensic_slr_detections;
DROP POLICY IF EXISTS "Users can delete own slr detections" ON forensic_slr_detections;

CREATE POLICY "Users can select own slr detections"
  ON forensic_slr_detections FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own slr detections"
  ON forensic_slr_detections FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own slr detections"
  ON forensic_slr_detections FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own slr detections"
  ON forensic_slr_detections FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 6. ADD INDEXES for unindexed foreign keys
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_evidence_files_alert_id
  ON evidence_files (alert_id);

CREATE INDEX IF NOT EXISTS idx_forensic_slr_detections_session_id
  ON forensic_slr_detections (session_id);

CREATE INDEX IF NOT EXISTS idx_forensic_vsr_results_session_id
  ON forensic_vsr_results (session_id);

-- ============================================================
-- 7. DROP unused indexes
-- ============================================================
DROP INDEX IF EXISTS public.idx_threat_intel_feeds_user_id;
DROP INDEX IF EXISTS public.idx_vulnerability_findings_user_id;
DROP INDEX IF EXISTS public.idx_forensic_sessions_user_created;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_evidence_files_user_id;
DROP INDEX IF EXISTS public.idx_alerts_user_id;
DROP INDEX IF EXISTS public.idx_external_feeds_user_id;
DROP INDEX IF EXISTS public.idx_forensic_artifacts_user_id;
DROP INDEX IF EXISTS public.idx_incident_records_user_id;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_user_id;
DROP INDEX IF EXISTS public.idx_safety_scan_results_user_id;
DROP INDEX IF EXISTS public.idx_sensor_readings_user_id;
DROP INDEX IF EXISTS public.feed_heartbeats_status_idx;
DROP INDEX IF EXISTS public.idx_forensic_vsr_user_created;
DROP INDEX IF EXISTS public.feed_heartbeats_last_seen_idx;
DROP INDEX IF EXISTS public.idx_forensic_slr_user_created;
DROP INDEX IF EXISTS public.idx_biometric_credentials_user;
DROP INDEX IF EXISTS public.feed_heartbeats_user_id_idx;
DROP INDEX IF EXISTS public.feed_heartbeats_feed_type_idx;
DROP INDEX IF EXISTS public.idx_sensor_readings_recorded_at;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_recorded_at;
DROP INDEX IF EXISTS public.idx_robotics_telemetry_drone_id;
