/*
# Merchant Fraud Detection & Anomaly Ingestion Module

## Overview
Adds two new tables to support merchant payment fraud detection alongside
existing telemetry signals: `merchant_transactions` for ingesting payment
stream data, and `stix_threat_indicators` for STIX 2.1 cyber observable
objects forwarded from flagged fraud incidents for cross-agency auditing.

## 1. New Tables

### merchant_transactions
Ingests payment stream data for fraud evaluation.
- `id` (uuid, PK, default gen_random_uuid())
- `created_at` (timestamptz, default now())
- `merchant_id` (text) — merchant identifier
- `terminal_id` (text) — POS / terminal identifier
- `transaction_amount` (numeric(10,2)) — payment amount
- `currency` (text, default 'USD') — ISO currency code
- `customer_geo_location` (text) — customer's geographic location
- `card_country` (text) — card issuer country
- `spending_velocity_count` (int) — transactions in past 10 minutes
- `fraud_risk_score` (int, default 0) — computed risk score 0-100
- `status` (text, default 'APPROVED') — APPROVED | FLAGGED | BLOCKED
- `user_id` (uuid, default auth.uid()) — owning operator for RLS scoping

### stix_threat_indicators
Stores STIX 2.1 Cyber Observable objects forwarded from flagged fraud incidents.
- `id` (uuid, PK, default gen_random_uuid())
- `created_at` (timestamptz, default now())
- `user_id` (uuid, default auth.uid()) — owning operator
- `indicator_id` (text) — STIX indicator ID (e.g. "indicator--<uuid>")
- `indicator_type` (text) — STIX pattern type (e.g. "malicious-transaction")
- `value` (text) — observable value (merchant_id + terminal composite)
- `severity` (text) — low | medium | high | critical
- `confidence` (int, default 0) — confidence score 0-100
- `source` (text, default 'merchant-fraud-engine')
- `description` (text)
- `stix_bundle` (jsonb) — full STIX 2.1 bundle for cross-agency audit
- `active` (boolean, default true)
- `first_seen` (timestamptz, default now())
- `last_seen` (timestamptz, default now())

## 2. Indexes
- merchant_transactions: merchant_id, terminal_id, status, created_at
- stix_threat_indicators: indicator_id, active, last_seen

## 3. Security (RLS)

### merchant_transactions
- SELECT: Restricted to verified operators (clearance_level IN
  ('RESTRICTED','ADMIN')). Uses a SECURITY DEFINER helper function
  `operator_has_clearance(min_level text)` that reads the user's
  clearance from user_preferences.role_designation.
- INSERT: Service role / ingestion API bridge only — no anon/authenticated
  INSERT policy, so only the service role (which bypasses RLS) can insert.
- UPDATE / DELETE: Disabled for standard users — no policies created,
  maintaining audit integrity.

### stix_threat_indicators
- SELECT: Same operator clearance check as merchant_transactions.
- INSERT: Service role / edge function only — no anon/authenticated INSERT.
- UPDATE / DELETE: Disabled — no policies, maintaining audit integrity.

## 4. Helper Function
- `operator_has_clearance(min_level text)` — SECURITY DEFINER function that
  checks whether the calling authenticated user's role_designation in
  user_preferences matches the required clearance level. Returns true if the
  user's clearance is RESTRICTED or ADMIN (the two levels that satisfy the
  fraud monitoring SELECT requirement).

## Important Notes
1. The service role key bypasses RLS entirely, so the edge function
   `detect-merchant-fraud` can INSERT into both tables and UPDATE
   merchant_transactions.status using the service role client.
2. Standard authenticated users can only SELECT rows where their clearance
   level qualifies. They cannot INSERT, UPDATE, or DELETE — preserving the
   audit trail.
3. The helper function is marked SECURITY DEFINER so it can read another
   user's user_preferences row without needing a SELECT policy on that table.
*/

-- =========================================================
-- Helper: operator clearance check
-- =========================================================
CREATE OR REPLACE FUNCTION public.operator_has_clearance(min_level text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role_designation INTO user_role
  FROM public.user_preferences
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- RESTRICTED and ADMIN satisfy any min_level passed for fraud monitoring
  IF user_role IN ('RESTRICTED', 'ADMIN') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- =========================================================
-- Table: merchant_transactions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  merchant_id text NOT NULL,
  terminal_id text NOT NULL,
  transaction_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  customer_geo_location text,
  card_country text,
  spending_velocity_count int NOT NULL DEFAULT 0,
  fraud_risk_score int NOT NULL DEFAULT 0 CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
  status text NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'FLAGGED', 'BLOCKED')),
  user_id uuid DEFAULT auth.uid()
);

ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_merchant_tx_merchant_id
  ON public.merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_tx_terminal_id
  ON public.merchant_transactions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_merchant_tx_status
  ON public.merchant_transactions(status);
CREATE INDEX IF NOT EXISTS idx_merchant_tx_created_at
  ON public.merchant_transactions(created_at DESC);

-- SELECT: restricted to verified operators with RESTRICTED or ADMIN clearance
DROP POLICY IF EXISTS "select_merchant_tx_clearance" ON public.merchant_transactions;
CREATE POLICY "select_merchant_tx_clearance"
  ON public.merchant_transactions FOR SELECT
  TO authenticated
  USING (public.operator_has_clearance('RESTRICTED'));

-- No INSERT / UPDATE / DELETE policies for authenticated or anon:
-- only the service role (bypasses RLS) can write, preserving audit integrity.

-- =========================================================
-- Table: stix_threat_indicators
-- =========================================================
CREATE TABLE IF NOT EXISTS public.stix_threat_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  indicator_id text NOT NULL,
  indicator_type text NOT NULL DEFAULT 'malicious-transaction',
  value text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  confidence int NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  source text NOT NULL DEFAULT 'merchant-fraud-engine',
  description text,
  stix_bundle jsonb,
  active boolean NOT NULL DEFAULT true,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE public.stix_threat_indicators ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stix_indicator_id
  ON public.stix_threat_indicators(indicator_id);
CREATE INDEX IF NOT EXISTS idx_stix_active
  ON public.stix_threat_indicators(active);
CREATE INDEX IF NOT EXISTS idx_stix_last_seen
  ON public.stix_threat_indicators(last_seen DESC);

-- SELECT: restricted to verified operators with RESTRICTED or ADMIN clearance
DROP POLICY IF EXISTS "select_stix_clearance" ON public.stix_threat_indicators;
CREATE POLICY "select_stix_clearance"
  ON public.stix_threat_indicators FOR SELECT
  TO authenticated
  USING (public.operator_has_clearance('RESTRICTED'));

-- No INSERT / UPDATE / DELETE policies: service role only.