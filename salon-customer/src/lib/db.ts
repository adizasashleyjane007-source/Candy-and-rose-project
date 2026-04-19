/**
 * Supabase data access layer for the Salon Dashboard.
 * All CRUD operations for every entity live here.
 */
import { createClient } from "@/lib/supabase/client";

const supabaseClient = createClient();
const supabase = () => supabaseClient;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id?: string;
  created_at?: string;
  name: string;
  email?: string;
  phone?: string;
  visits?: number;
  last_visit?: string | null;
  total_spent?: number;
  status?: string;
  membership_type?: string;
}

export interface Staff {
  id?: string;
  created_at?: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  status?: string;
  schedule?: string;
}

export interface Service {
  id?: string;
  created_at?: string;
  name: string;
  category?: string;
  price?: number;
  duration?: string;
  description?: string;
  status?: string;
  required_role?: string;
}

export interface Appointment {
  id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  appointment_date: string;
  appointment_time: string;
  source: string;
  price?: number | null;
  duration?: string | null;
  notes?: string | null;
  status: 'Scheduled' | 'Pending' | 'Completed' | 'Cancelled';
  created_at?: string;
  customers?: { name: string; email?: string; phone?: string };
  staff?: { name: string };
  services?: { name: string; price: number; category: string };
}

export interface InventoryItem {
  id?: string;
  created_at?: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  reorder_level?: number;
  cost_price?: number | null;
  status?: string;
}

export interface BillingRecord {
  id?: string;
  created_at?: string;
  customer_id?: string | null;
  appointment_id?: string | null;
  amount: number;
  cash_received?: number;
  payment_method?: string;
  status?: string;
  notes?: string;
  customers?: { name: string } | null;
}

export interface Notification {
  id?: string;
  created_at?: string;
  title: string;
  message?: string;
  type?: string;
  is_read?: boolean;
}

export interface Attendance {
  id?: string;
  created_at?: string;
  staff_id: string;
  staff_name?: string;
  date: string;
  status: string;
}

export interface NailDesign {
  id?: string;
  name: string;
  image_url: string;
  category?: string;
  is_trending?: boolean;
}

export interface StudioConfiguration {
  id?: string;
  user_id?: string;
  config_name: string;
  settings: any;
  created_at?: string;
}

export interface SalonSetting {
  id?: string;
  created_at?: string;
  key: string;
  setting_label?: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  tagline?: string;
  logo_url?: string;
  value: any;
}

export interface PaymentMethod {
  id?: string;
  created_at?: string;
  name: string;
  type?: string;
  status?: string;
  icon?: string;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export const Customers = {
  async list() {
    const { data, error } = await supabase()
      .from("customers")
      .select("*, appointments(price, status)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    
    // Calculate total_spent and visits dynamically for accuracy
    const enrichedData = ((data as any[]) || []).map(cust => {
      const completedApts = (cust.appointments || []).filter((a: any) => a.status === 'Completed');
      const totalSpent = completedApts.reduce((sum: number, a: any) => sum + (Number(a.price) || 0), 0);
      const visitCount = (cust.appointments || []).length;
      
      return {
        ...cust,
        total_spent: totalSpent,
        visits: visitCount
      };
    });

    return enrichedData as Customer[];
  },

  async create(payload: Omit<Customer, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("customers")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, payload: Partial<Customer>) {
    const { data, error } = await supabase()
      .from("customers")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("customers")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Staff ────────────────────────────────────────────────────────────────────

export const StaffDB = {
  async list() {
    const { data, error } = await supabase()
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Staff[];
  },

  async create(payload: Omit<Staff, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("staff")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Staff;
  },

  async update(id: string, payload: Partial<Staff>) {
    const { data, error } = await supabase()
      .from("staff")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Staff;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("staff")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const Services = {
  async list() {
    const { data, error } = await supabase()
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Service[];
  },

  async create(payload: Omit<Service, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("services")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async update(id: string, payload: Partial<Service>) {
    const { data, error } = await supabase()
      .from("services")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("services")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export const Appointments = {
  async list() {
    const { data, error } = await supabase()
      .from("appointments")
      .select(`
        *,
        customers(name, email, phone),
        staff(name),
        services(name, price)
      `)
      .order("appointment_date", { ascending: false });
    if (error) throw error;
    return (data || []) as Appointment[];
  },

  async create(payload: Omit<Appointment, "id" | "created_at" | "customers" | "staff" | "services">) {
    const { data, error } = await supabase()
      .from("appointments")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Appointment;
  },

  async update(id: string, payload: Partial<Omit<Appointment, "customers" | "staff" | "services">>) {
    const { data, error } = await supabase()
      .from("appointments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Appointment;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("appointments")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const Inventory = {
  async list() {
    const { data, error } = await supabase()
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as InventoryItem[];
  },

  async create(payload: Omit<InventoryItem, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("inventory")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as InventoryItem;
  },

  async update(id: string, payload: Partial<InventoryItem>) {
    const { data, error } = await supabase()
      .from("inventory")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as InventoryItem;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("inventory")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export const Billing = {
  async list() {
    const { data, error } = await supabase()
      .from("billing")
      .select(`
        *,
        customers(name)
      `)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as BillingRecord[];
  },

  async create(payload: Omit<BillingRecord, "id" | "created_at" | "customers">) {
    const { data, error } = await supabase()
      .from("billing")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as BillingRecord;
  },

  async update(id: string, payload: Partial<BillingRecord>) {
    const { data, error } = await supabase()
      .from("billing")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as BillingRecord;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("billing")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const NotificationsDB = {
  async list() {
    const { data, error } = await supabase()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Notification[];
  },

  async add(title: string, message: string, type: string) {
    const { data, error } = await supabase()
      .from("notifications")
      .insert({ title, message, type, is_read: false })
      .select();
    if (error) throw error;
    return (data ? data[0] : null) as Notification;
  },

  async markRead(id: string) {
    const { error } = await supabase()
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (error) throw error;
  },

  async markAllRead() {
    const { error } = await supabase()
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase()
      .from("notifications")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

export const AttendanceDB = {
  async list(date?: string) {
    let query = supabase().from("attendance").select("*");
    if (date) query = query.eq("date", date);
    const { data, error } = await query;
    if (error) throw error;
    return data as Attendance[];
  },

  async upsert(payload: Attendance) {
    const { data, error } = await supabase()
      .from("attendance")
      .upsert(payload, { onConflict: "staff_id,date" })
      .select()
      .single();
    if (error) throw error;
    return data as Attendance;
  },

  async listAll() {
    const { data, error } = await supabase().from("attendance").select("*");
    if (error) throw error;
    return data as Attendance[];
  }
};

// ─── Nails ────────────────────────────────────────────────────────────────────

export const NailDesigns = {
  async list() {
    const { data, error } = await supabase()
      .from("nail_designs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as NailDesign[];
  },

  async create(payload: Omit<NailDesign, "id">) {
    const { data, error } = await supabase()
      .from("nail_designs")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as NailDesign;
  },
};

export const StudioConfigurations = {
  async list() {
    const { data, error } = await supabase()
      .from("studio_configurations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as StudioConfiguration[];
  },

  async create(payload: Omit<StudioConfiguration, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("studio_configurations")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as StudioConfiguration;
  },
};

export const Storage = {
    async upload(bucket: string, file: File, name: string) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${name}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase()
            .storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase()
            .storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const SettingsDB = {
  async get(key: string) {
    const { data, error } = await supabase()
      .from("salon_settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    
    if (key === 'salon_info' && data && (data.name || data.email)) {
      return {
        name: data.name,
        phone: data.phone,
        address: data.address,
        email: data.email,
        tagline: data.tagline,
        logo_url: data.logo_url,
        ...(data.value || {})
      };
    }
    
    return data?.value;
  },

  async set(key: string, value: any, setting_label?: string) {
    const payload: any = { key, value };
    if (setting_label) payload.setting_label = setting_label;
    
    if (key === 'salon_info' && value && typeof value === 'object') {
      const { name, phone, address, email, tagline, logo_url, ...remainingValue } = value;
      payload.name = name;
      payload.phone = phone;
      payload.address = address;
      payload.email = email;
      payload.tagline = tagline;
      payload.logo_url = logo_url;
      payload.value = remainingValue; 
    }
    
    const { data, error } = await supabase()
      .from("salon_settings")
      .upsert(payload, { onConflict: "key" })
      .select()
      .single();
    if (error) throw error;
    
    if (key === 'salon_info') {
        return {
            name: data.name,
            phone: data.phone,
            address: data.address,
            email: data.email,
            tagline: data.tagline,
            logo_url: data.logo_url,
            ...(data.value || {})
        };
    }
    
    return data?.value;
  },

  async getAll() {
    const { data, error } = await supabase()
      .from("salon_settings")
      .select("*");
    if (error) throw error;
    return data as SalonSetting[];
  },

  // --- Payment Methods CRUD ---
  async listPaymentMethods() {
    const { data, error } = await supabase()
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as PaymentMethod[];
  },

  async createPaymentMethod(payload: Omit<PaymentMethod, "id" | "created_at">) {
    const { data, error } = await supabase()
      .from("payment_methods")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as PaymentMethod;
  },

  async updatePaymentMethod(id: string, payload: Partial<PaymentMethod>) {
    const { data, error } = await supabase()
      .from("payment_methods")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PaymentMethod;
  },

  async removePaymentMethod(id: string) {
    const { error } = await supabase()
      .from("payment_methods")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
};

export interface Message {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at?: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const MessagesDB = {
  async add(payload: Message) {
    const { data, error } = await supabase()
      .from("messages")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Message;
  }
};
