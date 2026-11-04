CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text,
    image_url text,
    phone text,
    role text DEFAULT 'Administrator',
    bio text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    phone text,
    visits integer DEFAULT 0,
    last_visit text,
    total_spent numeric DEFAULT 0,
    status text DEFAULT 'Active',
    membership_type text DEFAULT 'New',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
    duration text,
    category text,
    status text DEFAULT 'Active',
    required_role text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    role text,
    email text,
    phone text,
    rating numeric,
    schedule text,
    status text DEFAULT 'Present',
    employment_status text NOT NULL DEFAULT 'Active' CHECK (employment_status IN ('Active','Inactive')),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS employment_status text NOT NULL DEFAULT 'Active';

CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
    staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    service_name text,
    staff_name text,
    "date" text,
    "time" text,
    appointment_date date,
    appointment_time time,
    duration text,
    price numeric,
    status text DEFAULT 'Scheduled',
    payment_method text DEFAULT 'Cash',
    payment_status text DEFAULT 'Pending',
    screenshot_filename text,
    screenshot_url text,
    verification_status text DEFAULT 'Pending',
    verified_at timestamptz,
    verified_by text,
    source text DEFAULT 'Walk-in',
    notes text,
    design_id text,
    design_name text,
    design_image text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text DEFAULT 'Cash',
    status text DEFAULT 'Active',
    icon text,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.billing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
    payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    cash_received numeric,
    payment_method text DEFAULT 'Cash',
    status text DEFAULT 'Paid',
    notes text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
    name text NOT NULL,
    category text,
    quantity integer DEFAULT 0,
    unit text,
    reorder_level integer DEFAULT 10,
    cost_price numeric,
    status text DEFAULT 'In Stock',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    message text,
    type text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nail_designs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    name text NOT NULL,
    shape text,
    primary_color text,
    secondary_color text,
    is_gradient boolean DEFAULT false,
    texture text,
    art_data jsonb,
    image_url text,
    preview_url text,
    category text,
    description text,
    inclusions text,
    price numeric,
    is_trending boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name varchar,
    "date" date NOT NULL,
    status text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(staff_id, "date")
);

CREATE TABLE IF NOT EXISTS public.salon_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    "key" text UNIQUE NOT NULL,
    setting_label text,
    name varchar,
    phone varchar,
    address varchar,
    email varchar,
    tagline varchar,
    logo_url varchar,
    "value" jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    config_name text,
    settings jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_otps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamptz NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nail_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    discount_type text DEFAULT 'percentage',
    discount_value numeric NOT NULL,
    start_date date,
    end_date date,
    status text DEFAULT 'Active',
    code text UNIQUE,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS promotional_price numeric;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS inclusions text;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS availability_month text;

-- Automatically synchronize payment_status to 'Cancelled' when an appointment is cancelled
CREATE OR REPLACE FUNCTION sync_cancelled_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Cancelled' THEN
    NEW.payment_status := 'Cancelled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_cancelled_payment_status ON public.appointments;
CREATE TRIGGER trigger_sync_cancelled_payment_status
BEFORE INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION sync_cancelled_payment_status();


-- ==========================================
-- EMAIL NOTIFICATIONS (Idempotent SMTP Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Sent', 'Failed', 'Uncertain')),
  idempotency_key TEXT NOT NULL UNIQUE,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_lookup 
  ON public.email_notifications (idempotency_key, status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_reference
  ON public.email_notifications (event_type, reference_id);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email notifications"
  ON public.email_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')
    )
  );

-- Atomic claim function with hardened security
CREATE OR REPLACE FUNCTION public.claim_email_notification(
  p_idempotency_key TEXT,
  p_event_type TEXT,
  p_reference_id TEXT,
  p_recipient_email TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 120
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record public.email_notifications%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_lock_until TIMESTAMPTZ := v_now + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'Invalid idempotency_key');
  END IF;
  IF p_recipient_email IS NULL OR length(trim(p_recipient_email)) = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'Invalid recipient_email');
  END IF;

  INSERT INTO public.email_notifications (
    event_type, reference_id, recipient_email, status, idempotency_key, locked_until
  )
  VALUES (
    p_event_type, p_reference_id, p_recipient_email, 'Pending', p_idempotency_key, v_lock_until
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_record;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', true,
      'record_id', v_record.id,
      'status', 'Pending'
    );
  END IF;

  SELECT * INTO v_record
  FROM public.email_notifications
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'error', 'Notification record disappeared');
  END IF;

  IF v_record.status = 'Sent' THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'ALREADY_SENT',
      'sent_at', v_record.sent_at
    );
  END IF;

  IF v_record.status = 'Uncertain' THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'DELIVERY_OUTCOME_UNCERTAIN_MANUAL_REVIEW_REQUIRED'
    );
  END IF;

  IF v_record.status = 'Pending' AND v_record.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'reason', 'LOCKED_BY_ANOTHER_PROCESS',
      'locked_until', v_record.locked_until
    );
  END IF;

  UPDATE public.email_notifications
  SET status = 'Pending',
      locked_until = v_lock_until,
      retry_count = v_record.retry_count + 1,
      error_message = NULL
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'claimed', true,
    'record_id', v_record.id,
    'status', 'Pending',
    'retry_count', v_record.retry_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_email_notification(TEXT, TEXT, TEXT, TEXT, INTEGER) TO authenticated, anon;

-- Update notification status function
CREATE OR REPLACE FUNCTION public.update_email_notification_status(
  p_idempotency_key TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_clear_lock BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record public.email_notifications%ROWTYPE;
BEGIN
  IF p_status NOT IN ('Sent', 'Failed', 'Uncertain') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status. Must be Sent, Failed, or Uncertain.');
  END IF;

  UPDATE public.email_notifications
  SET status = p_status,
      sent_at = CASE WHEN p_status = 'Sent' THEN NOW() ELSE sent_at END,
      error_message = COALESCE(p_error_message, error_message),
      locked_until = CASE WHEN p_clear_lock THEN NULL ELSE locked_until END
  WHERE idempotency_key = p_idempotency_key
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found for given idempotency_key');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_record.id,
    'status', v_record.status,
    'sent_at', v_record.sent_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_email_notification_status(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, anon;

-- Admin resolution function for Uncertain notifications
CREATE OR REPLACE FUNCTION public.admin_resolve_uncertain_notification(
  p_idempotency_key TEXT,
  p_resolution TEXT,
  p_admin_user_id UUID,
  p_admin_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record public.email_notifications%ROWTYPE;
BEGIN
  IF p_resolution NOT IN ('MarkSent', 'AllowRetry') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resolution. Must be MarkSent or AllowRetry.');
  END IF;

  SELECT * INTO v_record
  FROM public.email_notifications
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification record not found');
  END IF;

  IF p_resolution = 'MarkSent' THEN
    UPDATE public.email_notifications
    SET status = 'Sent',
        sent_at = NOW(),
        locked_until = NULL,
        resolved_by = p_admin_user_id,
        resolved_at = NOW(),
        resolution_notes = p_admin_notes,
        error_message = COALESCE(error_message, '') || ' | Resolved: Marked Sent by admin'
    WHERE id = v_record.id;
  ELSIF p_resolution = 'AllowRetry' THEN
    UPDATE public.email_notifications
    SET status = 'Failed',
        locked_until = NULL,
        resolved_by = p_admin_user_id,
        resolved_at = NOW(),
        resolution_notes = p_admin_notes,
        error_message = COALESCE(error_message, '') || ' | Resolved: Reset for retry by admin'
    WHERE id = v_record.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'resolution', p_resolution,
    'idempotency_key', p_idempotency_key,
    'resolved_by', p_admin_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_uncertain_notification(TEXT, TEXT, UUID, TEXT) TO authenticated;
