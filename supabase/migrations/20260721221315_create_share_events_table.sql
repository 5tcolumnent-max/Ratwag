/*
# Create share_events table

## Purpose
Records social-share telemetry for the Sovereign platform: every time a user
shares a module/section (or specific entity) via one of the supported channels
(Twitter/X, LinkedIn, Reddit, Email, Copy Link), a row is written here. This
powers share-count badges, "most shared" analytics, and an audit trail of
outbound social activity per user.

## New Tables
- `share_events`
  - `id` (uuid, primary key)
  - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK → auth.users ON DELETE CASCADE) — owner
  - `channel` (text, NOT NULL) — share destination: "twitter" | "linkedin" | "reddit" | "email" | "copy"
  - `section` (text, NOT NULL) — app section being shared (e.g. "dashboard", "forensic_ai")
  - `entity_id` (text, NULL) — optional specific entity id within the section
  - `entity_type` (text, NULL) — optional entity type label (e.g. "audit_log_entry", "scan_result")
  - `share_url` (text, NOT NULL) — the URL that was shared
  - `message` (text, NOT NULL DEFAULT '') — optional user-authored share message
  - `metadata` (jsonb, NOT NULL DEFAULT '{}') — flexible extra data (campaign, utm tags, etc.)
  - `created_at` (timestamptz, NOT NULL DEFAULT now())

## Security
- RLS enabled on `share_events`.
- Owner-scoped CRUD: each authenticated user can only read/insert/update/delete
  their own share events. `user_id` defaults to `auth.uid()` so frontend inserts
  that omit `user_id` still satisfy the INSERT WITH CHECK.

## Notes
1. Only authenticated users can share (this app requires sign-in).
2. No UPDATE/DELETE policies are exposed to the client by design — share events
   are an immutable audit trail. Policies are still defined for completeness
   and future admin tooling, scoped to ownership.
*/

CREATE TABLE IF NOT EXISTS share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('twitter', 'linkedin', 'reddit', 'email', 'copy')),
  section text NOT NULL,
  entity_id text,
  entity_type text,
  share_url text NOT NULL,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_share_events" ON share_events;
CREATE POLICY "select_own_share_events"
  ON share_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_share_events" ON share_events;
CREATE POLICY "insert_own_share_events"
  ON share_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_share_events" ON share_events;
CREATE POLICY "update_own_share_events"
  ON share_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_share_events" ON share_events;
CREATE POLICY "delete_own_share_events"
  ON share_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS share_events_user_id_idx ON share_events(user_id);
CREATE INDEX IF NOT EXISTS share_events_section_idx ON share_events(section);
CREATE INDEX IF NOT EXISTS share_events_channel_idx ON share_events(channel);
CREATE INDEX IF NOT EXISTS share_events_created_at_idx ON share_events(created_at DESC);
