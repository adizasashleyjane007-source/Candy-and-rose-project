import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_min: number;
  price: number;
  image_url: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  user_id: string;
  appointment_date: string;
  status: string;
  total_price: number;
  notes: string | null;
  created_at: string;
};

export type Feedback = {
  id: string;
  user_id: string;
  appointment_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};
