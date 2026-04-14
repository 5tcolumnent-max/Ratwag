/*
  # Create feed_heartbeats table

  ## Purpose
  Tracks the last-seen timestamp and signal strength for every monitored feed
  (drones, perimeter sensors, audio, camera). Enables "Last Seen" indicators
  and persistent reconnect-attempt logging across sessions.

  ## New Tables
  - `feed_heartbeats`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → auth.users) — owner/operator
    - `feed_id` (text) — unique feed identifier e.g. "AER-01", "PERI-N-001", "audio"
    - `feed_type` (text) — category: "drone" | "sensor" | "audio" | "camera"
    - `feed_label` (text) — human-readable display name
    - `last_seen_at` (timestamptz) — most recent successful heartbeat
    - `signal_strength` (integer 0-100) — last known signal quality
    - `status` (text) — "online" | "degraded" | "offline" | "reconnecting"
    - `reconnect_attempts` (integer) — consecutive failed reconnect tries
    - `last_error` (text) — last error message if any
    - `metadata` (jsonb) — flexible extra data per feed type
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled; users can only read/write their own feed heartbeats
*/

CREATE TABLE IF NOT EXISTS feed_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_id text NOT NULL,
  feed_type text NOT NULL DEFAULT 'unknown',
  feed_label text NOT NULL DEFAULT '',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  signal_strength integer NOT NULL DEFAULT 0 CHECK (signal_strength >= 0 AND signal_strength <= 100),
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'degraded', 'offline', 'reconnecting')),
  reconnect_attempts integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feed_id)
);

ALTER TABLE feed_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own feed heartbeats"
  ON feed_heartbeats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feed heartbeats"
  ON feed_heartbeats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feed heartbeats"
  ON feed_heartbeats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own feed heartbeats"
  ON feed_heartbeats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS feed_heartbeats_user_id_idx ON feed_heartbeats(user_id);
CREATE INDEX IF NOT EXISTS feed_heartbeats_feed_type_idx ON feed_heartbeats(feed_type);
CREATE INDEX IF NOT EXISTS feed_heartbeats_status_idx ON feed_heartbeats(status);
CREATE INDEX IF NOT EXISTS feed_heartbeats_last_seen_idx ON feed_heartbeats(last_seen_at DESC);
