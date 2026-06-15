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
    created_at timestamptz DEFAULT now()
);

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
    status text DEFAULT 'Pending',
    payment_method text DEFAULT 'Cash',
    source text DEFAULT 'Walk-in',
    notes text,
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
