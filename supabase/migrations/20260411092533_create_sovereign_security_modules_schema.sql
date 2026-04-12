/*
  # Sovereign 3.0 Security Modules Schema

  ## Summary
  Adds four new tables to support the new security dashboard modules:

  1. New Tables
     - `forensic_artifacts` — Digital forensic evidence items with chain-of-custody tracking
     - `threat_intel_feeds` — Threat intelligence indicators (IOCs, TTPs, adversary profiles)
     - `incident_records` — Security incident lifecycle management with NIST IR alignment
     - `vulnerability_findings` — Vulnerability scan results with CVSS scoring and remediation tracking

  2. Security
     - RLS enabled on all tables with (select auth.uid()) pattern for performance
     - Authenticated users can only access their own records

  3. Indexes
     - Indexes on severity/status columns for efficient filtered queries
     - Foreign key indexes where applicable
*/

-- ============================================================
-- forensic_artifacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.forensic_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id text NOT NULL DEFAULT '',
  artifact_type text NOT NULL DEFAULT 'file',
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  source_host text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_hash text NOT NULL DEFAULT '',
  hash_algorithm text NOT NULL DEFAULT 'SHA-256',
  size_bytes bigint NOT NULL DEFAULT 0,
  collected_at timestamptz NOT NULL DEFAULT now(),
  chain_of_custody text NOT NULL DEFAULT '[]',
  classification text NOT NULL DEFAULT 'unclassified',
  status text NOT NULL DEFAULT 'collected',
  nist_control text NOT NULL DEFAULT 'IR-4',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forensic_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own forensic artifacts"
  ON public.forensic_artifacts FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own forensic artifacts"
  ON public.forensic_artifacts FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own forensic artifacts"
  ON public.forensic_artifacts FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own forensic artifacts"
  ON public.forensic_artifacts FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_forensic_artifacts_status ON public.forensic_artifacts (status);
CREATE INDEX IF NOT EXISTS idx_forensic_artifacts_type ON public.forensic_artifacts (artifact_type);

-- ============================================================
-- threat_intel_feeds
-- ============================================================
CREATE TABLE IF NOT EXISTS public.threat_intel_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_id text NOT NULL DEFAULT '',
  indicator_type text NOT NULL DEFAULT 'ip',
  value text NOT NULL DEFAULT '',
  threat_actor text NOT NULL DEFAULT '',
  campaign text NOT NULL DEFAULT '',
  confidence integer NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  severity text NOT NULL DEFAULT 'medium',
  tlp text NOT NULL DEFAULT 'amber',
  mitre_tactics text[] NOT NULL DEFAULT '{}',
  mitre_techniques text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT '',
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  expiry timestamptz,
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.threat_intel_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own threat intel"
  ON public.threat_intel_feeds FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own threat intel"
  ON public.threat_intel_feeds FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own threat intel"
  ON public.threat_intel_feeds FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own threat intel"
  ON public.threat_intel_feeds FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_threat_intel_severity ON public.threat_intel_feeds (severity);
CREATE INDEX IF NOT EXISTS idx_threat_intel_active ON public.threat_intel_feeds (active);

-- ============================================================
-- incident_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  category text NOT NULL DEFAULT 'security',
  affected_systems text[] NOT NULL DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz,
  resolved_at timestamptz,
  assigned_to text NOT NULL DEFAULT '',
  nist_phase text NOT NULL DEFAULT 'detection',
  iocs text[] NOT NULL DEFAULT '{}',
  timeline text NOT NULL DEFAULT '[]',
  lessons_learned text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own incident records"
  ON public.incident_records FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own incident records"
  ON public.incident_records FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own incident records"
  ON public.incident_records FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own incident records"
  ON public.incident_records FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_incident_records_severity ON public.incident_records (severity);
CREATE INDEX IF NOT EXISTS idx_incident_records_status ON public.incident_records (status);

-- ============================================================
-- vulnerability_findings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vulnerability_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vuln_id text NOT NULL DEFAULT '',
  cve_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  cvss_score numeric(3,1) NOT NULL DEFAULT 0.0 CHECK (cvss_score >= 0 AND cvss_score <= 10),
  cvss_vector text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  asset_host text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT 'server',
  port integer,
  service text NOT NULL DEFAULT '',
  plugin_id text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  exploitable boolean NOT NULL DEFAULT false,
  patch_available boolean NOT NULL DEFAULT false,
  first_detected timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  remediated_at timestamptz,
  nist_control text NOT NULL DEFAULT 'RA-5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vulnerability_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own vulnerability findings"
  ON public.vulnerability_findings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vulnerability findings"
  ON public.vulnerability_findings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vulnerability findings"
  ON public.vulnerability_findings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vulnerability findings"
  ON public.vulnerability_findings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_vulnerability_severity ON public.vulnerability_findings (severity);
CREATE INDEX IF NOT EXISTS idx_vulnerability_status ON public.vulnerability_findings (status);
CREATE INDEX IF NOT EXISTS idx_vulnerability_cvss ON public.vulnerability_findings (cvss_score);
