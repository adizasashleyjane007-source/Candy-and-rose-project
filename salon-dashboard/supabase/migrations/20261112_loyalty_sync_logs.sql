-- Migration: 20261112_loyalty_sync_logs.sql
-- Description: Creates the loyalty_sync_logs audit table with RLS for administrators only,
-- and ensures an idempotent UNIQUE constraint on loyalty_rewards(ranking_period, customer_id).

-- ============================================================================
-- 1. Check for duplicates and ensure UNIQUE constraint on loyalty_rewards
-- ============================================================================
-- Check query to run before applying constraint (must return 0 rows):
-- SELECT ranking_period, customer_id, count(*)
-- FROM public.loyalty_rewards
-- GROUP BY ranking_period, customer_id
-- HAVING count(*) > 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_loyalty_rewards_customer_period'
    ) THEN
        ALTER TABLE public.loyalty_rewards
        ADD CONSTRAINT uq_loyalty_rewards_customer_period UNIQUE (ranking_period, customer_id);
    END IF;
END $$;

-- ============================================================================
-- 2. Create loyalty_sync_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ranking_period TEXT NOT NULL,
    ranking_period_label TEXT,
    triggered_by TEXT NOT NULL, -- 'cron', 'manual', 'staff_session'
    winners_created INTEGER NOT NULL DEFAULT 0,
    winners_skipped INTEGER NOT NULL DEFAULT 0,
    rewards_expired INTEGER NOT NULL DEFAULT 0,
    zero_price_services_count INTEGER NOT NULL DEFAULT 0,
    zero_price_services JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Manila'::text, now())
);

-- Index for fast lookup of latest sync run per ranking period
CREATE INDEX IF NOT EXISTS idx_loyalty_sync_logs_period_created 
ON public.loyalty_sync_logs(ranking_period, created_at DESC);

-- ============================================================================
-- 3. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.loyalty_sync_logs ENABLE ROW LEVEL SECURITY;

-- Read policy: Only authenticated administrators can read the sync logs
DROP POLICY IF EXISTS "Admins can view loyalty sync logs" ON public.loyalty_sync_logs;
CREATE POLICY "Admins can view loyalty sync logs"
ON public.loyalty_sync_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role ILIKE '%admin%' OR profiles.role ILIKE '%administrator%')
    )
);

-- Write policy: Server service-role client bypasses RLS automatically.
-- For authenticated admin manual sync fallback:
DROP POLICY IF EXISTS "Admins can insert loyalty sync logs" ON public.loyalty_sync_logs;
CREATE POLICY "Admins can insert loyalty sync logs"
ON public.loyalty_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role ILIKE '%admin%' OR profiles.role ILIKE '%administrator%')
    )
);

