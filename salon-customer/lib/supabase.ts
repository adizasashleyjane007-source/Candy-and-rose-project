import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uswenkzmczuglebopzwx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fd_uvyBBIAQ3x7qwAjXYMw_p1YyWjLD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Customer = {
  id?: string;
  user_id?: string | null;
  name: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  visits?: number;
  last_visit?: string | null;
  total_spent?: number;
  status?: string;
  membership_type?: string;
  created_at?: string;
};

export type Staff = {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  rating?: number | null;
  schedule?: string | null;
  status?: string;
  created_at?: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  duration?: string | null;
  duration_min?: number;
  price: number;
  image_url?: string | null;
  status?: string;
  required_role?: string | null;
  created_at?: string;
};

export type Appointment = {
  id?: string;
  customer_id?: string | null;
  customer_name: string;
  service_id?: string | null;
  service_name?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  appointment_date: string;
  appointment_time: string;
  date?: string | null;
  time?: string | null;
  duration?: string | null;
  price: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  cancellation_reason?: string | null;
  payment_method?: string;
  source?: string;
  notes?: string | null;
  created_at?: string;
  customers?: { name: string; email?: string; phone?: string };
  staff?: { name: string };
  services?: { name: string; price: number; category: string };
};

export type Notification = {
  id?: string;
  user_id?: string | null;
  title: string;
  message?: string | null;
  type?: string;
  is_read?: boolean;
  created_at?: string;
};

export type Feedback = {
  id?: string;
  user_id?: string;
  appointment_id?: string | null;
  rating: number;
  comment?: string | null;
  created_at?: string;
};

export type Profile = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  created_at?: string;
};

export type Message = {
  id?: string;
  customer_id?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at?: string;
};

export function parseDurationToMinutes(durationStr: string | null | undefined): number {
  if (!durationStr) return 30;
  const match = durationStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return parseInt(durationStr, 10) || 30;
  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || 'mins';
  if (unit.includes('hr') || unit.includes('hour')) {
    return Math.round(value * 60);
  }
  return Math.round(value);
}

export type SalonInfo = {
  name: string;
  phone: string;
  address: string;
  email: string;
  tagline?: string;
  logo_url?: string;
};

export const defaultSalonInfo: SalonInfo = {
  name: "Candy And Rose Salon",
  address: "Blk and Lot, Dasmarinas Cavite",
  phone: "09123456789",
  email: "candyandroses@gmail.com",
  tagline: "Where beauty meets elegance",
};

export async function getSalonInfo(): Promise<SalonInfo> {
  try {
    const { data, error } = await supabase
      .from('salon_settings')
      .select('*')
      .eq('key', 'salon_info')
      .maybeSingle();

    if (error || !data) return defaultSalonInfo;

    return {
      name: data.name || defaultSalonInfo.name,
      phone: data.phone || defaultSalonInfo.phone,
      address: data.address || defaultSalonInfo.address,
      email: data.email || defaultSalonInfo.email,
      tagline: data.tagline || defaultSalonInfo.tagline,
      logo_url: data.logo_url || "",
      ...(data.value || {})
    };
  } catch (e) {
    console.error('Error fetching salon info:', e);
    return defaultSalonInfo;
  }
}


