/*
# Add agency_id column to user_preferences

## Summary
Adds an `agency_id` column to the `user_preferences` table so each user can
select which federal agency their research administration work is tied to.
This enables the platform to present itself as a multi-agency compliance
portal rather than being hardcoded to a single agency (DOE).

## Changes
- `user_preferences.agency_id` — text column, defaults to 'doe', stores the
  identifier of the user's selected federal agency (e.g. 'doe', 'nih', 'nsf').

## Security
- No RLS policy changes needed; existing per-user ownership policies already
  cover the new column since it lives on the same row.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN agency_id text NOT NULL DEFAULT 'doe';
  END IF;
END $$;
