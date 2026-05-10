/*
  # Create human_authorization_logs table

  ## Summary
  Adds a human-in-the-loop safety interlock table for mission control.
  Every robot command must be explicitly authorized (APPROVE) or denied (DENY)
  by a named human operator before execution is allowed. This creates an
  immutable audit trail of all authorization decisions.

  ## New Tables

  ### human_authorization_logs
  - `id` (uuid, primary key) — unique record identifier
  - `user_id` (uuid, FK to auth.users) — authenticated operator who made the decision
  - `mission_id` (text) — mission being authorized (e.g. MSNS-2026-001)
  - `status` (text) — APPROVE or DENY
  - `authorized_by` (text) — display name of the authorizing operator
  - `command` (text) — robot command packet issued on APPROVE (e.g. EXECUTE)
  - `timestamp` (timestamptz) — when the decision was recorded
  - `created_at` (timestamptz) — row creation time

  ## Security
  - RLS enabled; authenticated users can insert and read only their own records
  - No UPDATE or DELETE policies — authorization logs are immutable by design
*/

CREATE TABLE IF NOT EXISTS human_authorization_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id      text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'DENY' CHECK (status IN ('APPROVE', 'DENY')),
  authorized_by   text NOT NULL DEFAULT '',
  command         text NOT NULL DEFAULT '',
  timestamp       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_human_authorization_logs_user_id  ON human_authorization_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_human_authorization_logs_mission  ON human_authorization_logs (mission_id);
CREATE INDEX IF NOT EXISTS idx_human_authorization_logs_ts       ON human_authorization_logs (timestamp DESC);

ALTER TABLE human_authorization_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own authorization logs"
  ON human_authorization_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own authorization logs"
  ON human_authorization_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
