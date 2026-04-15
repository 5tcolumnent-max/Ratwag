/*
  # Create safety_interlocks table

  1. New Tables
    - `safety_interlocks`
      - `id` (uuid, primary key, auto-generated)
      - `mission_id` (text, not null) — identifies the mission requiring authorization
      - `status` (text, default 'PENDING') — constrained to PENDING, APPROVED, DENIED
      - `requested_action` (text, not null) — the action requiring human authorization
      - `authorized_by` (text) — identifier of the authorizing operator
      - `created_at` (timestamptz, default now()) — when the interlock was created
      - `resolved_at` (timestamptz, nullable) — when the interlock was resolved

  2. Security
    - Enable RLS on `safety_interlocks` table
    - Authenticated users can insert their own interlock requests
    - Authenticated users can read their own interlock records
    - Authenticated users can update status on their own records (for resolution)

  3. Notes
    - The status CHECK constraint enforces the three valid states: PENDING, APPROVED, DENIED
    - resolved_at is nullable — only populated once status moves from PENDING
    - user_id column added to support RLS (not in original DDL, required for per-user isolation)
*/

CREATE TABLE IF NOT EXISTS safety_interlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  requested_action TEXT NOT NULL,
  authorized_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS safety_interlocks_user_id_idx ON safety_interlocks (user_id);
CREATE INDEX IF NOT EXISTS safety_interlocks_mission_id_idx ON safety_interlocks (mission_id);
CREATE INDEX IF NOT EXISTS safety_interlocks_status_idx ON safety_interlocks (status);

ALTER TABLE safety_interlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interlock requests"
  ON safety_interlocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own interlock records"
  ON safety_interlocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own interlock records"
  ON safety_interlocks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
