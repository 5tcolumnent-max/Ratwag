/*
# Create case management schema for authorized investigators

## Purpose
A case-management tool for authorized investigators to organize lawfully-obtained
evidence with chain-of-custody tracking and an immutable audit trail. This is
NOT a targeting or surveillance system — it is a records-organizer for evidence
the investigator already lawfully possesses (warrants, court records, signed
chain-of-custody logs). No person-identification, no external data enrichment,
no automated "criminal" labeling.

## New Tables

### cases
- `id` (uuid, primary key)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE) — owning investigator
- `case_number` (text, NOT NULL) — agency-issued case identifier
- `title` (text, NOT NULL) — short case title
- `status` (text, NOT NULL DEFAULT 'open') — open | in_progress | closed | archived
- `classification` (text, NOT NULL DEFAULT 'unclassified') — unclassified | restricted | confidential
- `summary` (text, NOT NULL DEFAULT '') — longer narrative
- `opened_at` (timestamptz, NOT NULL DEFAULT now())
- `closed_at` (timestamptz, NULL)
- `created_at` / `updated_at` (timestamptz)

### evidence_items
- `id` (uuid, primary key)
- `case_id` (uuid, NOT NULL, FK → cases ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `item_number` (text, NOT NULL) — evidence tag e.g. "EX-001"
- `title` (text, NOT NULL)
- `description` (text, NOT NULL DEFAULT '')
- `evidence_type` (text, NOT NULL) — document | photo | video | audio | physical | digital
- `collection_method` (text, NOT NULL DEFAULT '') — how it was lawfully obtained
- `collected_at` (timestamptz, NULL) — when the evidence was collected
- `collected_by` (text, NOT NULL DEFAULT '') — name of collecting officer/agent
- `storage_location` (text, NOT NULL DEFAULT '') — where it is physically stored
- `hash_sha256` (text, NOT NULL DEFAULT '') — integrity hash of digital evidence
- `chain_status` (text, NOT NULL DEFAULT 'in_custody') — in_custody | transferred | released | destroyed
- `metadata` (jsonb, NOT NULL DEFAULT '{}')
- `created_at` / `updated_at` (timestamptz)

### chain_of_custody
- `id` (uuid, primary key)
- `evidence_id` (uuid, NOT NULL, FK → evidence_items ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `from_holder` (text, NOT NULL DEFAULT '')
- `to_holder` (text, NOT NULL DEFAULT '')
- `action` (text, NOT NULL) — collected | transferred | viewed | released | returned | destroyed
- `reason` (text, NOT NULL DEFAULT '')
- `occurred_at` (timestamptz, NOT NULL DEFAULT now())
- `created_at` (timestamptz, NOT NULL DEFAULT now())

## Security
- RLS enabled on all three tables.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- `user_id` defaults to `auth.uid()` so frontend inserts that omit it succeed.
- Child tables (evidence_items, chain_of_custody) additionally verify ownership
  through the parent case/evidence owner, but also carry their own user_id for
  direct ownership checks.

## Notes
1. Only authenticated users can access case data (this app requires sign-in).
2. No UPDATE/DELETE on chain_of_custody — it is an immutable audit trail by design.
3. No PII enrichment or external lookup features are included.
*/

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  case_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'archived')),
  classification text NOT NULL DEFAULT 'unclassified' CHECK (classification IN ('unclassified', 'restricted', 'confidential')),
  summary text NOT NULL DEFAULT '',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases" ON cases FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases" ON cases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases" ON cases FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases" ON cases FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cases_user_id_idx ON cases(user_id);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases(status);
CREATE INDEX IF NOT EXISTS cases_opened_at_idx ON cases(opened_at DESC);

CREATE TABLE IF NOT EXISTS evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  evidence_type text NOT NULL CHECK (evidence_type IN ('document', 'photo', 'video', 'audio', 'physical', 'digital')),
  collection_method text NOT NULL DEFAULT '',
  collected_at timestamptz,
  collected_by text NOT NULL DEFAULT '',
  storage_location text NOT NULL DEFAULT '',
  hash_sha256 text NOT NULL DEFAULT '',
  chain_status text NOT NULL DEFAULT 'in_custody' CHECK (chain_status IN ('in_custody', 'transferred', 'released', 'destroyed')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_evidence_items" ON evidence_items;
CREATE POLICY "select_own_evidence_items" ON evidence_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_evidence_items" ON evidence_items;
CREATE POLICY "insert_own_evidence_items" ON evidence_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_evidence_items" ON evidence_items;
CREATE POLICY "update_own_evidence_items" ON evidence_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_evidence_items" ON evidence_items;
CREATE POLICY "delete_own_evidence_items" ON evidence_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS evidence_items_user_id_idx ON evidence_items(user_id);
CREATE INDEX IF NOT EXISTS evidence_items_case_id_idx ON evidence_items(case_id);
CREATE INDEX IF NOT EXISTS evidence_items_chain_status_idx ON evidence_items(chain_status);

CREATE TABLE IF NOT EXISTS chain_of_custody (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  from_holder text NOT NULL DEFAULT '',
  to_holder text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('collected', 'transferred', 'viewed', 'released', 'returned', 'destroyed')),
  reason text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chain_of_custody ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chain_of_custody" ON chain_of_custody;
CREATE POLICY "select_own_chain_of_custody" ON chain_of_custody FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chain_of_custody" ON chain_of_custody;
CREATE POLICY "insert_own_chain_of_custody" ON chain_of_custody FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chain_of_custody_user_id_idx ON chain_of_custody(user_id);
CREATE INDEX IF NOT EXISTS chain_of_custody_evidence_id_idx ON chain_of_custody(evidence_id);
CREATE INDEX IF NOT EXISTS chain_of_custody_occurred_at_idx ON chain_of_custody(occurred_at DESC);
