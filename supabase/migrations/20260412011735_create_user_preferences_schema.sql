/*
  # Create user_preferences table

  ## Summary
  Adds a per-user preferences table to persist configuration settings
  for the Sovereign 3.0 platform, including notification preferences,
  security policies, and display settings.

  ## New Tables

  ### `user_preferences`
  Stores per-user configuration values as a JSONB blob for flexibility,
  along with typed columns for the most-queried settings.

  - `id` - UUID primary key
  - `user_id` - References auth.users, unique per user
  - `display_name` - User's chosen display name
  - `organization` - Organization or institute affiliation
  - `role_designation` - Role label (e.g., Principal Investigator)
  - `notify_critical` - Receive critical severity alerts (default true)
  - `notify_warning` - Receive warning severity alerts (default true)
  - `notify_info` - Receive informational alerts (default false)
  - `session_timeout_minutes` - Auto-logout after inactivity (default 60)
  - `require_biometric` - Force biometric auth on login (default false)
  - `audit_retention_days` - Audit log retention period in days (default 90)
  - `created_at` - Row creation timestamp
  - `updated_at` - Last modification timestamp

  ## Security
  - RLS enabled
  - Users can only read and modify their own preference row
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  role_designation text NOT NULL DEFAULT 'Principal Investigator',
  notify_critical boolean NOT NULL DEFAULT true,
  notify_warning boolean NOT NULL DEFAULT true,
  notify_info boolean NOT NULL DEFAULT false,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  require_biometric boolean NOT NULL DEFAULT false,
  audit_retention_days integer NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences (user_id);
