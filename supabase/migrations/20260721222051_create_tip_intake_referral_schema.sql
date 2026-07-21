/*
# Create tip intake and referral schema

## Purpose
A tip-intake and law-enforcement referral workflow for authorized investigators.
Investigators record tips received through various channels (hotline, email,
walk-in, anonymous drop), triage them, and refer them to appropriate agencies
with a tracked referral record. This is a records-management tool — it does not
conduct investigations or make determinations about individuals.

## New Tables

### tips
- `id` (uuid, primary key)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `source_channel` (text) — hotline | email | walk_in | anonymous_drop | web_form | other
- `is_anonymous` (boolean, NOT NULL DEFAULT false)
- `submitter_name` (text) — nullable when anonymous
- `submitter_contact` (text) — nullable when anonymous
- `category` (text) — fraud | waste | abuse | safety | corruption | other
- `priority` (text) — low | medium | high | critical
- `subject` (text, NOT NULL) — short summary
- `description` (text) — detailed narrative
- `incident_location` (text)
- `incident_date` (timestamptz, nullable)
- `status` (text) — new | under_review | referred | closed | unfounded
- `created_at` / `updated_at` (timestamptz)

### tip_referrals
- `id` (uuid, primary key)
- `tip_id` (uuid, NOT NULL, FK → tips ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE)
- `referred_to_agency` (text, NOT NULL) — receiving agency name
- `referred_to_contact` (text) — contact at agency
- `referral_reason` (text) — why referred
- `referral_date` (timestamptz, NOT NULL DEFAULT now())
- `status` (text) — pending | accepted | rejected | closed
- `agency_case_number` (text) — case number assigned by agency
- `notes` (text)
- `created_at` / `updated_at` (timestamptz)

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: authenticated users access only their own records.
- `user_id` defaults to `auth.uid()`.
*/

CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source_channel text NOT NULL DEFAULT 'other' CHECK (source_channel IN ('hotline', 'email', 'walk_in', 'anonymous_drop', 'web_form', 'other')),
  is_anonymous boolean NOT NULL DEFAULT false,
  submitter_name text,
  submitter_contact text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('fraud', 'waste', 'abuse', 'safety', 'corruption', 'other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  incident_location text NOT NULL DEFAULT '',
  incident_date timestamptz,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'referred', 'closed', 'unfounded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tips" ON tips;
CREATE POLICY "select_own_tips" ON tips FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tips" ON tips;
CREATE POLICY "insert_own_tips" ON tips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tips" ON tips;
CREATE POLICY "update_own_tips" ON tips FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tips" ON tips;
CREATE POLICY "delete_own_tips" ON tips FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tips_user_id_idx ON tips(user_id);
CREATE INDEX IF NOT EXISTS tips_status_idx ON tips(status);
CREATE INDEX IF NOT EXISTS tips_priority_idx ON tips(priority);
CREATE INDEX IF NOT EXISTS tips_created_at_idx ON tips(created_at DESC);

CREATE TABLE IF NOT EXISTS tip_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id uuid NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_to_agency text NOT NULL,
  referred_to_contact text NOT NULL DEFAULT '',
  referral_reason text NOT NULL DEFAULT '',
  referral_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'closed')),
  agency_case_number text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tip_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tip_referrals" ON tip_referrals;
CREATE POLICY "select_own_tip_referrals" ON tip_referrals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tip_referrals" ON tip_referrals;
CREATE POLICY "insert_own_tip_referrals" ON tip_referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tip_referrals" ON tip_referrals;
CREATE POLICY "update_own_tip_referrals" ON tip_referrals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tip_referrals" ON tip_referrals;
CREATE POLICY "delete_own_tip_referrals" ON tip_referrals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tip_referrals_user_id_idx ON tip_referrals(user_id);
CREATE INDEX IF NOT EXISTS tip_referrals_tip_id_idx ON tip_referrals(tip_id);
CREATE INDEX IF NOT EXISTS tip_referrals_status_idx ON tip_referrals(status);
