/*
  # Research Administration System Schema

  ## Summary
  Creates the full database schema for the DOE Genesis Mission Phase I
  Research Administration System. This migration adds four new tables
  to support grant compliance tracking, budget management, document
  version control, and infrastructure telemetry.

  ## New Tables

  ### 1. grant_milestones
  Tracks DOE Phase I submission milestones with due dates, priorities,
  and completion status. Supports the Administrative Lifecycle Controller
  for deadline and draft versioning management.
  - id, user_id, title, description, due_date, status, phase, priority

  ### 2. budget_items
  Manages personnel salary allocations and hardware asset acquisitions
  (including Optimus Gen 3). Tracks allocated vs. spent amounts for
  variance analysis and federal reporting.
  - id, user_id, category, item_name, description, allocated_amount, spent_amount, status, acquisition_date

  ### 3. compliance_documents
  Federal document version control for audit readiness. Supports
  DOE technical narrative, budget justification, data management plan,
  and security assessment documents.
  - id, user_id, title, document_type, version, status, notes

  ### 4. infrastructure_readings
  15m perimeter sensor telemetry with NIST SP 800-53 control references
  and automated risk level classification (low/medium/high/critical).
  - id, user_id, sensor_id, sensor_type, location, value, unit, risk_level, nist_control, recorded_at

  ## Security
  - RLS enabled on all four tables (restrictive by default)
  - Authenticated users can only access records where user_id = auth.uid()
  - Separate SELECT, INSERT, UPDATE, DELETE policies for each table
  - infrastructure_readings has no UPDATE policy (immutable telemetry log)

  ## Indexes
  - Indexed user_id columns for fast per-user queries
  - Indexed due_date on milestones for deadline sorting
  - Indexed category on budget_items for category aggregation
  - Indexed recorded_at on infrastructure_readings for time-series queries
*/

CREATE TABLE IF NOT EXISTS grant_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  due_date timestamptz NOT NULL,
  status text DEFAULT 'pending',
  phase text DEFAULT 'Phase_I',
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE grant_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own milestones"
  ON grant_milestones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones"
  ON grant_milestones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON grant_milestones FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own milestones"
  ON grant_milestones FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  item_name text NOT NULL,
  description text DEFAULT '',
  allocated_amount numeric(14,2) DEFAULT 0,
  spent_amount numeric(14,2) DEFAULT 0,
  status text DEFAULT 'active',
  acquisition_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own budget items"
  ON budget_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget items"
  ON budget_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget items"
  ON budget_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget items"
  ON budget_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  document_type text NOT NULL,
  version integer DEFAULT 1,
  status text DEFAULT 'draft',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own compliance documents"
  ON compliance_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compliance documents"
  ON compliance_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compliance documents"
  ON compliance_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own compliance documents"
  ON compliance_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS infrastructure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sensor_id text NOT NULL,
  sensor_type text NOT NULL,
  location text DEFAULT '',
  value numeric,
  unit text DEFAULT '',
  risk_level text DEFAULT 'low',
  nist_control text DEFAULT '',
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE infrastructure_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own infrastructure readings"
  ON infrastructure_readings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own infrastructure readings"
  ON infrastructure_readings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own infrastructure readings"
  ON infrastructure_readings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_grant_milestones_user_id ON grant_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_milestones_due_date ON grant_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_budget_items_user_id ON budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_user_id ON compliance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_readings_user_id ON infrastructure_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_readings_recorded_at ON infrastructure_readings(recorded_at);
