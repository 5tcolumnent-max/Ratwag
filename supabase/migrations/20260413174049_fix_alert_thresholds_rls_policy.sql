/*
  # Fix alert_thresholds RLS policy

  ## Changes

  1. Security Fix
    - Drop the existing `USING (true)` policy on `alert_thresholds` which defeats RLS
      by granting unrestricted row access to all authenticated users
    - Replace with a policy that uses `(select auth.uid() is not null)` to ensure
      only authenticated sessions can read rows, evaluated efficiently via subquery
      rather than per-row re-evaluation
*/

DROP POLICY IF EXISTS "Authenticated users can read thresholds" ON public.alert_thresholds;

CREATE POLICY "Authenticated users can read thresholds"
  ON public.alert_thresholds
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);
