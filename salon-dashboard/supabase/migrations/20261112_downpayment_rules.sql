-- Migration: 20261112_downpayment_rules.sql
-- Description: Adds downpayment fields to appointments & billing, creates the
-- append-only appointment_downpayments audit table with staff/admin RLS,
-- and seeds the initial downpayment_rules in salon_settings.

-- ============================================================================
-- 1. Extend appointments table with downpayment fields
-- ============================================================================
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS downpayment_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS downpayment_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS downpayment_status TEXT DEFAULT 'Not Required',
ADD COLUMN IF NOT EXISTS downpayment_reason TEXT,
ADD COLUMN IF NOT EXISTS downpayment_hold_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS downpayment_waived_reason TEXT,
ADD COLUMN IF NOT EXISTS downpayment_waived_by TEXT,
ADD COLUMN IF NOT EXISTS downpayment_waived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pricing_flag TEXT,
ADD COLUMN IF NOT EXISTS downpayment_carried_over BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS downpayment_original_appointment_id UUID;

-- Index for querying pending downpayment holds and expiry
CREATE INDEX IF NOT EXISTS idx_appointments_downpayment_hold 
ON public.appointments(status, downpayment_status, downpayment_hold_until);

-- ============================================================================
-- 2. Extend billing table with downpayment credit field
-- ============================================================================
ALTER TABLE public.billing
ADD COLUMN IF NOT EXISTS downpayment_credited NUMERIC DEFAULT 0;

-- ============================================================================
-- 3. Create appointment_downpayments audit table (Append-Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointment_downpayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    reference_number TEXT,
    proof_image_url TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Manila'::text, now()),
    recorded_by TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'RECORDED', -- 'RECORDED', 'REFUNDED', 'FORFEITED', 'TRANSFERRED', 'WAIVED'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Manila'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_appointment_downpayments_appt 
ON public.appointment_downpayments(appointment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_downpayments_paid_at 
ON public.appointment_downpayments(paid_at DESC);

-- ============================================================================
-- 4. Row Level Security for appointment_downpayments
-- ============================================================================
ALTER TABLE public.appointment_downpayments ENABLE ROW LEVEL SECURITY;

-- Read policy: Staff and administrators only
DROP POLICY IF EXISTS "Staff and admin can view downpayments" ON public.appointment_downpayments;
CREATE POLICY "Staff and admin can view downpayments"
ON public.appointment_downpayments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role ILIKE '%staff%' 
            OR profiles.role ILIKE '%employee%' 
            OR profiles.role ILIKE '%admin%' 
            OR profiles.role ILIKE '%administrator%'
        )
    )
);

-- Insert policy: Staff and administrators only
DROP POLICY IF EXISTS "Staff and admin can insert downpayments" ON public.appointment_downpayments;
CREATE POLICY "Staff and admin can insert downpayments"
ON public.appointment_downpayments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role ILIKE '%staff%' 
            OR profiles.role ILIKE '%employee%' 
            OR profiles.role ILIKE '%admin%' 
            OR profiles.role ILIKE '%administrator%'
        )
    )
);

-- Note: NO UPDATE OR DELETE policies are created to ensure appointment_downpayments is append-only.

-- ============================================================================
-- 5. Seed initial downpayment_rules in salon_settings
-- ============================================================================
INSERT INTO public.salon_settings (key, setting_label, value)
VALUES (
    'downpayment_rules',
    'Downpayment Rules & Configuration',
    '{
        "is_enabled": true,
        "downpayment_percentage": 50,
        "early_cutoff_time": "10:00",
        "hold_time_hours": 24,
        "rule_a_hair_makeup_enabled": true,
        "rule_b_early_hair_nail_enabled": true,
        "category_mappings": {
            "hair_categories": ["HAIR CARE", "HAIRCUT & STYLING", "TREATMENTS & SERVICES"],
            "makeup_categories": ["Makeup"],
            "nail_categories": ["NAIL ART", "Nails"]
        }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

