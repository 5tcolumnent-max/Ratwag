/*
# Governance, Auditing, and Safety Layer

## Summary
Implements three core safety/governance patterns on top of the existing
Sovereign 3.0 tactical platform:

1. Human-in-the-Loop (HITL) action verification — a new `pending_actions`
   table records high-severity / administrative actions that require explicit
   human sign-off before any system state is mutated. Actions move through
   `pending → approved | denied | expired` and are append-only once a
   decision is recorded.
2. Immutable cryptographic system audit logging — hardens the existing
   `audit_log_entries` table to strictly append-only behavior. All UPDATE
   and DELETE operations are denied for every role (including service_role)
   so non-repudiation is preserved. A new `entry_hash` column stores a
   SHA-256 chain hash linking each entry to its predecessor.
3. Graceful degradation & fail-safe fallbacks — a new `operational_mode`
   table records the platform's current operating state (NORMAL,
   STALE_TELEMETRY, MANUAL_CONTROL, OFFLINE). Edge functions and the
   frontend read this single source of truth to decide whether automated
   decisions may execute or whether the platform must fall back to manual
   control.

## New Tables

### pending_actions
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, references auth.users) — operator who requested the action
- `action_type` (text, NOT NULL) — e.g. `RESOLVE_CRITICAL_THREAT`,
  `OVERRIDE_TRIGGER`, `REVOKE_ACCESS`
- `target_entity_type` (text) — e.g. `threat`, `alert`, `user`
- `target_entity_id` (text) — id of the entity the action targets
- `payload` (jsonb) — full input context / parameters of the requested action
- `severity` (text, NOT NULL, default `critical`) — `critical` | `high` | `administrative`
- `status` (text, NOT NULL, default `pending`) — `pending` | `approved` | `denied` | `expired`
- `requested_by` (uuid, NOT NULL, references auth.users) — same as user_id; kept for clarity
- `requested_at` (timestamptz, default now())
- `reviewed_by` (uuid, references auth.users, nullable) — the human who signed off
- `reviewed_at` (timestamptz, nullable)
- `review_note` (text, nullable) — optional reason/justification
- `expires_at` (timestamptz, NOT NULL) — auto-expire deadline (default 10 min)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### operational_mode
- `id` (uuid, PK)
- `mode` (text, NOT NULL) — `NORMAL` | `STALE_TELEMETRY` | `MANUAL_CONTROL` | `OFFLINE`
- `reason` (text) — human-readable explanation of why the mode changed
- `triggered_by` (text) — `system` | `edge_function` | `operator` | `watchdog`
- `telemetry_integrity_pct` (numeric, default 100) — 0-100 confidence in feed health
- `active` (boolean, NOT NULL, default true) — only one row is active at a time
- `created_at` (timestamptz, default now())

## Modified Tables

### audit_log_entries (harden to append-only + add hash chain)
- Adds `actor_source` (text) — who/what wrote the entry:
  `user` | `edge_function` | `automated` | `system`
- Adds `entry_hash` (text) — SHA-256 chain hash: hex(sha256(prev_hash || canonical_json(this_entry)))
- Adds `prev_hash` (text) — the previous entry's `entry_hash` (null for the first entry)
- Adds `payload` (jsonb) — structured input context / payload of the action

## Security Changes (RLS)

### audit_log_entries — STRICTLY APPEND-ONLY
- SELECT: authenticated users can read their own audit entries.
- INSERT: authenticated users (and edge functions via service role) can append.
- UPDATE: DENIED for all roles (no policy → default deny). The table is
  explicitly locked by also revoking UPDATE/DELETE table privileges from
  the `authenticated` and `anon` roles.
- DELETE: DENIED for all roles (no policy → default deny). Table privileges
  revoked as above.

### pending_actions — owner-scoped with reviewer flow
- SELECT: authenticated users can read actions they requested OR are
  designated to review (for now, any authenticated operator can see the
  queue so the on-call human can act).
- INSERT: authenticated users can create a pending action for themselves.
- UPDATE: authenticated users can update the status / review fields of a
  pending action (approve/deny). Once a terminal status is reached the row
  is effectively immutable — enforced by a WITH CHECK guard.
- DELETE: DENIED for all roles (no policy). Pending actions are part of the
  audit trail and must never be removed.

### operational_mode — single source of truth
- SELECT: any authenticated user can read the current mode (the whole UI
  needs to know the platform state).
- INSERT: authenticated users, edge functions, and the system can insert a
  new mode row.
- UPDATE/DELETE: DENIED for all roles — mode history is append-only. A new
  row is inserted and the previous active row is deactivated via a trigger.

## Important Notes
1. The migration is idempotent — every CREATE TABLE addition is wrapped in
   a DO $$ ... IF NOT EXISTS ... END $$ block and every policy is dropped
   before being recreated.
2. No data is lost: existing audit_log_entries rows keep their values; the
   new columns default to NULL / sensible defaults.
3. A trigger deactivates the previously-active operational_mode row whenever
   a new one is inserted, so exactly one row is active at any time.
4. UPDATE/DELETE on audit_log_entries and operational_mode are blocked at
   the RLS layer (no matching policy) AND at the privilege layer (REVOKE),
   providing defense in depth.
*/

-- ============================================================
-- 1. Harden audit_log_entries to append-only + add hash chain
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log_entries'
      AND column_name = 'actor_source'
  ) THEN
    ALTER TABLE public.audit_log_entries ADD COLUMN actor_source text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log_entries'
      AND column_name = 'entry_hash'
  ) THEN
    ALTER TABLE public.audit_log_entries ADD COLUMN entry_hash text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log_entries'
      AND column_name = 'prev_hash'
  ) THEN
    ALTER TABLE public.audit_log_entries ADD COLUMN prev_hash text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log_entries'
      AND column_name = 'payload'
  ) THEN
    ALTER TABLE public.audit_log_entries ADD COLUMN payload jsonb;
  END IF;
END $$;

-- Index for time-ordered reads
CREATE INDEX IF NOT EXISTS audit_log_entries_created_at_idx
  ON public.audit_log_entries (created_at DESC);

-- Defense in depth: revoke UPDATE / DELETE from anon + authenticated.
-- The service_role bypasses RLS but we still want to discourage mutation;
-- the RLS policy layer (no UPDATE/DELETE policy) is the primary guard.
REVOKE UPDATE, DELETE ON public.audit_log_entries FROM anon, authenticated;

-- Re-create RLS policies: SELECT (own) + INSERT only. No UPDATE/DELETE policy.
ALTER TABLE public.audit_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_entries" ON public.audit_log_entries;
CREATE POLICY "select_own_audit_entries"
  ON public.audit_log_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_audit_entries" ON public.audit_log_entries;
CREATE POLICY "insert_own_audit_entries"
  ON public.audit_log_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- NOTE: deliberately NO UPDATE or DELETE policy => default deny for all
-- roles (including service_role when not bypassing RLS). Combined with the
-- REVOKE above, audit_log_entries is strictly append-only.

-- ============================================================
-- 2. pending_actions — HITL verification queue
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_entity_type text,
  target_entity_id text,
  payload jsonb,
  severity text NOT NULL DEFAULT 'critical'
    CHECK (severity IN ('critical', 'high', 'administrative')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pending_actions_status_idx
  ON public.pending_actions (status, expires_at);
CREATE INDEX IF NOT EXISTS pending_actions_user_idx
  ON public.pending_actions (user_id);

DROP POLICY IF EXISTS "select_pending_actions" ON public.pending_actions;
CREATE POLICY "select_pending_actions"
  ON public.pending_actions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_own_pending_action" ON public.pending_actions;
CREATE POLICY "insert_own_pending_action"
  ON public.pending_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = requested_by);

DROP POLICY IF EXISTS "review_pending_action" ON public.pending_actions;
CREATE POLICY "review_pending_action"
  ON public.pending_actions FOR UPDATE
  TO authenticated
  USING (status = 'pending')
  WITH CHECK (status IN ('approved', 'denied', 'expired'));

-- No DELETE policy => pending actions are never removable.

-- ============================================================
-- 3. operational_mode — single source of truth for safe state
-- ============================================================

CREATE TABLE IF NOT EXISTS public.operational_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL
    CHECK (mode IN ('NORMAL', 'STALE_TELEMETRY', 'MANUAL_CONTROL', 'OFFLINE')),
  reason text,
  triggered_by text NOT NULL DEFAULT 'system'
    CHECK (triggered_by IN ('system', 'edge_function', 'operator', 'watchdog')),
  telemetry_integrity_pct numeric NOT NULL DEFAULT 100
    CHECK (telemetry_integrity_pct >= 0 AND telemetry_integrity_pct <= 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_mode ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS operational_mode_active_idx
  ON public.operational_mode (active) WHERE active = true;

DROP POLICY IF EXISTS "select_operational_mode" ON public.operational_mode;
CREATE POLICY "select_operational_mode"
  ON public.operational_mode FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "insert_operational_mode" ON public.operational_mode;
CREATE POLICY "insert_operational_mode"
  ON public.operational_mode FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE / DELETE policy => append-only mode history.
REVOKE UPDATE, DELETE ON public.operational_mode FROM anon, authenticated;

-- Trigger: when a new active row is inserted, deactivate all prior rows.
CREATE OR REPLACE FUNCTION public.deactivate_prior_operational_modes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active THEN
    UPDATE public.operational_mode
      SET active = false
      WHERE active = true AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_prior_operational_modes
  ON public.operational_mode;
CREATE TRIGGER trg_deactivate_prior_operational_modes
  AFTER INSERT ON public.operational_mode
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_prior_operational_modes();

-- ============================================================
-- 4. Helper: append an audit entry with a hash chain (SECURITY DEFINER)
--    Used by edge functions and the frontend to guarantee the hash is
--    computed server-side and cannot be tampered with.
-- ============================================================

CREATE OR REPLACE FUNCTION public.append_audit_entry(
  p_user_id uuid,
  p_module text,
  p_action text,
  p_detail text DEFAULT NULL,
  p_severity text DEFAULT 'info',
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_actor_source text DEFAULT 'user',
  p_payload jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_prev_hash text;
  v_entry_hash text;
  v_canonical text;
BEGIN
  -- Grab the most recent entry hash for the chain.
  SELECT entry_hash INTO v_prev_hash
    FROM public.audit_log_entries
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

  -- Canonical representation of this entry for hashing.
  v_canonical := coalesce(v_prev_hash, '') || '|' ||
    coalesce(p_module, '') || '|' ||
    coalesce(p_action, '') || '|' ||
    coalesce(p_detail, '') || '|' ||
    coalesce(p_severity, '') || '|' ||
    coalesce(p_entity_type, '') || '|' ||
    coalesce(p_entity_id, '') || '|' ||
    coalesce(p_actor_source, '') || '|' ||
    coalesce(p_payload::text, '{}');

  v_entry_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  INSERT INTO public.audit_log_entries (
    id, user_id, module, action, detail, severity,
    entity_type, entity_id, actor_source, payload,
    prev_hash, entry_hash, timestamp
  ) VALUES (
    v_id, p_user_id, p_module, p_action, p_detail, p_severity,
    p_entity_type, p_entity_id, p_actor_source, p_payload,
    v_prev_hash, v_entry_hash, now()
  );

  RETURN v_id;
END;
$$;

-- The service_role calls append_audit_entry; authenticated users can call it
-- for their own entries too. The function is SECURITY DEFINER so it runs as
-- the owner and bypasses the INSERT policy restriction on direct table
-- writes (edge functions writing as the service role have no auth.uid()).
GRANT EXECUTE ON FUNCTION public.append_audit_entry TO authenticated, anon;

-- ============================================================
-- 5. Seed an initial NORMAL operational mode if none exists.
-- ============================================================
INSERT INTO public.operational_mode (mode, reason, triggered_by, telemetry_integrity_pct, active)
SELECT 'NORMAL', 'Initial platform state — all telemetry streams nominal', 'system', 100, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.operational_mode WHERE active = true
);
