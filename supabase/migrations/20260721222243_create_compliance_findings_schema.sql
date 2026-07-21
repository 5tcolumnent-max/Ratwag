/*
# Create compliance findings and corrective actions schema

## Purpose
An internal compliance/audit dashboard for authorized users to log compliance
findings against controls (NIST or agency-specific), assign severity, track
review status, and record corrective actions with due dates and owners. This is
a records-management tool — it does not enforce controls or scan systems.

## New Tables

### compliance_findings
- `id` (uuid, primary key)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `control_id` (text, NOT NULL) — e.g. "AU-6", "AC-2", or agency-specific
- `control_family` (text, NOT NULL DEFAULT '')
- `title` (text, NOT NULL)
- `description` (text, NOT NULL DEFAULT '')
- `severity` (text) — low | medium | high | critical
- `status` (text) — open | in_review | remediated | accepted | closed
- `reviewer` (text, NOT NULL DEFAULT '')
- `identified_at` (timestamptz, NOT NULL DEFAULT now())
- `created_at` / `updated_at` (timestamptz)

### corrective_actions
- `id` (uuid, primary key)
- `finding_id` (uuid, NOT NULL, FK → compliance_findings ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `title` (text, NOT NULL)
- `description` (text, NOT NULL DEFAULT '')
- `owner` (text, NOT NULL DEFAULT '')
- `status` (text) — pending | in_progress | completed | verified
- `due_date` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `created_at` / `updated_at` (timestamptz)

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: authenticated users access only their own records.
- `user_id` defaults to `auth.uid()`.
*/

CREATE TABLE IF NOT EXISTS compliance_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  control_id text NOT NULL,
  control_family text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'remediated', 'accepted', 'closed')),
  reviewer text NOT NULL DEFAULT '',
  identified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_compliance_findings" ON compliance_findings;
CREATE POLICY "select_own_compliance_findings" ON compliance_findings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_compliance_findings" ON compliance_findings;
CREATE POLICY "insert_own_compliance_findings" ON compliance_findings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_compliance_findings" ON compliance_findings;
CREATE POLICY "update_own_compliance_findings" ON compliance_findings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_compliance_findings" ON compliance_findings;
CREATE POLICY "delete_own_compliance_findings" ON compliance_findings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS compliance_findings_user_id_idx ON compliance_findings(user_id);
CREATE INDEX IF NOT EXISTS compliance_findings_status_idx ON compliance_findings(status);
CREATE INDEX IF NOT EXISTS compliance_findings_severity_idx ON compliance_findings(severity);
CREATE INDEX IF NOT EXISTS compliance_findings_identified_at_idx ON compliance_findings(identified_at DESC);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid NOT NULL REFERENCES compliance_findings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_corrective_actions" ON corrective_actions;
CREATE POLICY "select_own_corrective_actions" ON corrective_actions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_corrective_actions" ON corrective_actions;
CREATE POLICY "insert_own_corrective_actions" ON corrective_actions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_corrective_actions" ON corrective_actions;
CREATE POLICY "update_own_corrective_actions" ON corrective_actions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_corrective_actions" ON corrective_actions;
CREATE POLICY "delete_own_corrective_actions" ON corrective_actions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS corrective_actions_user_id_idx ON corrective_actions(user_id);
CREATE INDEX IF NOT EXISTS corrective_actions_finding_id_idx ON corrective_actions(finding_id);
CREATE INDEX IF NOT EXISTS corrective_actions_status_idx ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS corrective_actions_due_date_idx ON corrective_actions(due_date);
