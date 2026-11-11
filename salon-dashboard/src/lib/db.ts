/**
 * Supabase data access layer for the Salon Dashboard.
 * All CRUD operations for every entity live here.
 */
import { createClient } from "@/lib/supabase/client";
import { calculateCustomerRisk, type CustomerRiskLevel } from "@/lib/customer-risk";

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
  total_appointments?: number;
  completed_appointments?: number;
  cancelled_appointments?: number;
  noshow_appointments?: number;
  failed_appointments?: number;
  risk_status?: CustomerRiskLevel;
  is_flagged?: boolean;
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
  employment_status?: "Active" | "Inactive";
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
  image_url?: string;
}

export interface Appointment {
  id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  design_id?: string | null;
  design_name?: string | null;
  design_image?: string | null;
  hairstyle_reference_image?: string | null;
  appointment_date: string;
  appointment_time: string;
  source: string;
  price?: number | null;
  duration?: string | null;
  notes?: string | null;
  phone?: string | null;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'no_show' | 'No-Show';
  payment_method?: string | null;
  payment_status?: string | null;
  cancellation_reason?: string | null;
  loyalty_reward_id?: string | null;
  original_amount?: number | null;
  loyalty_discount_amount?: number | null;
  loyalty_reward_description?: string | null;
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

export type InventoryTransactionType =
  | "RESTOCK"
  | "ISSUE"
  | "RETURN"
  | "ADJUSTMENT"
  | "WASTE"
  | "EXPIRED"
  | "DAMAGED";

export type IssuedToType =
  | "Staff"
  | "Customer"
  | "Department/Salon Use"
  | "Other"
  | "System";

export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  quantity_delta: number;
  stock_before: number;
  stock_after: number;
  issued_by: string;
  issued_by_name: string;
  issued_to?: string | null;
  issued_to_id?: string | null;
  issued_to_type?: IssuedToType | null;
  appointment_id?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  inventory?: {
    id: string;
    name: string;
    category?: string;
    unit?: string;
    quantity?: number;
    status?: string;
  } | null;
  appointment?: {
    id: string;
    customer_name?: string;
    service_name?: string;
    appointment_date?: string;
    appointment_time?: string;
  } | null;
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
  loyalty_reward_id?: string | null;
  original_amount?: number | null;
  loyalty_discount_amount?: number | null;
  loyalty_reward_description?: string | null;
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
  created_at?: string;
  name: string;
  image_url: string;
  preview_url?: string;
  category?: string;
  description?: string;
  inclusions?: string;
  is_trending?: boolean;
  price?: number;
  shape?: string;
  primary_color?: string;
  secondary_color?: string;
  texture?: string;
  art_data?: any;
  visibility?: 'public' | 'private';
  customer_id?: string | null;
}

export interface Message {
  id?: string;
  name?: string;
  email?: string;
  sender_name?: string;
  sender_email?: string;
  subject: string;
  message: string;
  created_at?: string;
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

export interface Promotion {
  id?: string;
  name: string;
  inclusions?: string;
  price?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  created_at?: string;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export const Customers = {
  async list() {
    const { data, error } = await supabase()
      .from("customers")
      .select("*, appointments(price, status, appointment_date, created_at, date)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Calculate total_spent, visits, and risk metrics dynamically for accuracy
    const enrichedData = ((data as any[]) || []).map(cust => {
      const aptsList = (cust.appointments || []) as Array<{ price?: number | string; status?: string }>;
      const completedApts = aptsList.filter((a: any) => a.status === 'Completed');
      const totalSpent = completedApts.reduce((sum: number, a: any) => sum + (Number(a.price) || 0), 0);
      const visitCount = aptsList.length;

      const risk = calculateCustomerRisk(aptsList, { id: cust.id, name: cust.name });

      return {
        ...cust,
        total_spent: totalSpent,
        visits: visitCount,
        total_appointments: risk.totalAppointments,
        completed_appointments: risk.completedAppointments,
        cancelled_appointments: risk.cancelledAppointments,
        noshow_appointments: risk.noshowAppointments,
        failed_appointments: risk.failedAppointments,
        risk_status: risk.riskStatus,
        is_flagged: risk.isFlagged,
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
    const { data: item } = await supabase()
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("customer", item);
    }
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
    const { data: item } = await supabase()
      .from("staff")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("staff", item);
    }
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
    const { data: item } = await supabase()
      .from("services")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("service", item);
    }
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
    if (payload.status && payload.status !== "Completed") {
      const { data: existing } = await supabase()
        .from("appointments")
        .select("status")
        .eq("id", id)
        .maybeSingle();

      if (existing && existing.status === "Completed") {
        throw new Error("Forbidden: Once an appointment is Completed, its status is permanently locked.");
      }
    }

    if (payload.status === "Cancelled" && !payload.payment_status) {
      payload.payment_status = "Cancelled";
    }

    const { data, error } = await supabase()
      .from("appointments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Appointment;
  },

  async getById(id: string) {
    const { data, error } = await supabase()
      .from("appointments")
      .select(`
        *,
        notes,
        customers(name, email, phone),
        staff(name),
        services(name, price, duration)
      `)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Appointment;
  },


  async remove(id: string) {
    const { data: item } = await supabase()
      .from("appointments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("appointment", item);
    }
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

    // Automatically log initial RESTOCK audit record if initial quantity > 0
    const initialQty = Number(data?.quantity || 0);
    if (data?.id && initialQty > 0) {
      try {
        const { data: authData } = await supabase().auth.getUser();
        const user = authData?.user;
        if (user) {
          const { data: profile } = await supabase()
            .from("profiles")
            .select("name, email")
            .eq("id", user.id)
            .maybeSingle();
          const actorName =
            profile?.name?.trim() ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Admin User";
          await supabase().from("inventory_transactions").insert({
            inventory_id: data.id,
            transaction_type: "RESTOCK",
            quantity: initialQty,
            quantity_delta: initialQty,
            stock_before: 0,
            stock_after: initialQty,
            issued_by: user.id,
            issued_by_name: actorName,
            reason: "Initial Stock",
            notes: `Initial stock added for ${data.name}`,
          });
        }
      } catch (txErr) {
        console.warn("Could not record initial inventory transaction:", txErr);
      }
    }

    return data as InventoryItem;
  },

  async update(id: string, payload: Partial<InventoryItem>) {
    // Fetch previous stock before updating so we can log a RESTOCK/ADJUSTMENT audit entry if quantity changed
    const { data: prevItem } = await supabase()
      .from("inventory")
      .select("quantity, name")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase()
      .from("inventory")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    if (prevItem && payload.quantity !== undefined) {
      const oldQty = Number(prevItem.quantity || 0);
      const newQty = Number(payload.quantity || 0);
      const diff = newQty - oldQty;
      if (diff !== 0) {
        try {
          const { data: authData } = await supabase().auth.getUser();
          const user = authData?.user;
          if (user) {
            const { data: profile } = await supabase()
              .from("profiles")
              .select("name, email")
              .eq("id", user.id)
              .maybeSingle();
            const actorName =
              profile?.name?.trim() ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Admin User";
            await supabase().from("inventory_transactions").insert({
              inventory_id: id,
              transaction_type: diff > 0 ? "RESTOCK" : "ADJUSTMENT",
              quantity: Math.abs(diff),
              quantity_delta: diff,
              stock_before: oldQty,
              stock_after: newQty,
              issued_by: user.id,
              issued_by_name: actorName,
              reason: diff > 0 ? "Restock" : "Stock Adjustment",
              notes: `Stock updated from ${oldQty} to ${newQty} via Inventory Management`,
            });
          }
        } catch (txErr) {
          console.warn("Could not record stock update transaction:", txErr);
        }
      }
    }

    return data as InventoryItem;
  },

  async remove(id: string) {
    const { data: item } = await supabase()
      .from("inventory")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("inventory", item);
    }
    const { error } = await supabase()
      .from("inventory")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

export const InventoryTransactions = {
  async list(inventoryId?: string): Promise<{
    transactions: InventoryTransaction[];
    currentUser: { id: string; name: string; email: string; role: string } | null;
  }> {
    const url = inventoryId
      ? `/api/inventory/transactions?inventoryId=${encodeURIComponent(inventoryId)}`
      : "/api/inventory/transactions";
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return {
        transactions: (json.transactions || []) as InventoryTransaction[],
        currentUser: json.currentUser || null,
      };
    }

    // Fallback to direct Supabase query if API route is unavailable
    let query = supabase()
      .from("inventory_transactions")
      .select(
        `
        *,
        inventory:inventory_id (id, name, category, unit, quantity, status),
        appointment:appointment_id (id, customer_name, service_name, appointment_date, appointment_time)
      `
      )
      .order("created_at", { ascending: false });

    if (inventoryId) {
      query = query.eq("inventory_id", inventoryId);
    }

    const { data } = await query;
    return {
      transactions: (data || []) as InventoryTransaction[],
      currentUser: null,
    };
  },

  async record(input: {
    inventoryId: string;
    transactionType?: InventoryTransactionType;
    quantity: number;
    issuedTo?: string | null;
    issuedToId?: string | null;
    issuedToType?: IssuedToType | null;
    appointmentId?: string | null;
    reason?: string | null;
    notes?: string | null;
    isNegativeAdjustment?: boolean;
  }): Promise<{
    success: boolean;
    transaction?: InventoryTransaction;
    inventory?: any;
    error?: string;
  }> {
    const res = await fetch("/api/inventory/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: json.error || "Failed to record inventory transaction.",
      };
    }

    return {
      success: true,
      transaction: json.transaction as InventoryTransaction,
      inventory: json.inventory,
    };
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
    const { data: item } = await supabase()
      .from("billing")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("billing", item);
    }
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
      .select()
      .single();
    if (error) throw error;
    return data as Notification;
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
    const { data: item } = await supabase()
      .from("notifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("notification", item);
    }
    const { error } = await supabase()
      .from("notifications")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

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

  async update(id: string, payload: Partial<NailDesign>) {
    const { data, error } = await supabase()
      .from("nail_designs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as NailDesign;
  },

  async remove(id: string) {
    const { data: item } = await supabase()
      .from("nail_designs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("nail_design", item);
    }
    const { error } = await supabase()
      .from("nail_designs")
      .delete()
      .eq("id", id);
    if (error) throw error;
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
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'image';
    const fileName = `${sanitizedName}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase()
      .storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

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

// ─── Archive DB ──────────────────────────────────────────────────────────────

export interface ArchivedRecord {
  id: string;
  type: string;
  name: string;
  deleted_at: string;
  details: any;
}

export const ArchiveDB = {
  async getArchive() {
    try {
      const records = await SettingsDB.get("archived_records");
      return (records || []) as ArchivedRecord[];
    } catch (e) {
      console.error("Failed to get archive", e);
      return [];
    }
  },

  async saveArchive(archive: ArchivedRecord[]) {
    return await SettingsDB.set("archived_records", archive, "Archived Records");
  },

  async archiveItem(type: string, details: any) {
    try {
      const archive = await this.getArchive();
      const name = details.name || details.customer_name || details.service_name || details.staff_name || details.title || `Item ID: ${details.id}`;
      const newItem: ArchivedRecord = {
        id: details.id || Math.random().toString(),
        type,
        name,
        deleted_at: new Date().toISOString(),
        details
      };
      await this.saveArchive([newItem, ...archive]);
    } catch (e) {
      console.error("Failed to archive item", e);
    }
  },

  async restoreItem(item: ArchivedRecord) {
    const { type, details } = item;
    const cleanDetails = { ...details };

    // Remove relation properties that may cause database errors on insert
    delete cleanDetails.customers;
    delete cleanDetails.staff;
    delete cleanDetails.services;
    delete cleanDetails.appointments;
    delete cleanDetails.nail_id;

    let tableName = "";
    if (type === "customer") tableName = "customers";
    else if (type === "staff") tableName = "staff";
    else if (type === "service") tableName = "services";
    else if (type === "appointment") tableName = "appointments";
    else if (type === "inventory") tableName = "inventory";
    else if (type === "billing") tableName = "billing";
    else if (type === "notification") tableName = "notifications";
    else if (type === "nail_design" || type === "nail" || type === "nail design") tableName = "nail_designs";
    else if (type === "promotion") tableName = "promotions";

    if (!tableName) throw new Error("Unknown item type: " + type);

    const { error } = await supabase()
      .from(tableName)
      .insert(cleanDetails);
    if (error) throw error;
  }
};

// ─── Promotions ──────────────────────────────────────────────────────────────

export const PromotionsDB = {
  async list() {
    const { data, error } = await supabase()
      .from("promotions")
      .select("*")
      .order("id", { ascending: false });
    if (error) throw error;
    return data as Promotion[];
  },

  async create(payload: Omit<Promotion, "id">) {
    const { data, error } = await supabase()
      .from("promotions")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as Promotion;
  },

  async update(id: string, payload: Partial<Promotion>) {
    const { data, error } = await supabase()
      .from("promotions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Promotion;
  },

  async remove(id: string) {
    const { data: item } = await supabase()
      .from("promotions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (item) {
      await ArchiveDB.archiveItem("promotion", item);
    }
    const { error } = await supabase()
      .from("promotions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
};

export async function fulfillPaymentSuccess(input: {
  appointmentId: string;
  amount?: number;
  cashReceived?: number;
  paymentMethod?: string;
  notes?: string;
  loyaltyRewardId?: string | null;
  originalAmount?: number;
  loyaltyDiscountAmount?: number;
  loyaltyRewardDescription?: string | null;
}) {
  const {
    appointmentId,
    amount,
    cashReceived,
    paymentMethod = "GCash",
    notes,
    loyaltyRewardId,
    originalAmount,
    loyaltyDiscountAmount,
    loyaltyRewardDescription,
  } = input;

  if (!appointmentId) {
    console.error("❌ [PAYMENT FULFILLMENT] Missing appointmentId.");
    return { success: false, error: "Missing appointmentId" };
  }

  try {
    const { data: apt, error: fetchError } = await supabase()
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchError || !apt) {
      console.error(`❌ [PAYMENT FULFILLMENT] Appointment not found: ${appointmentId}`, fetchError);
      return { success: false, error: "Appointment not found" };
    }

    // Server/DB-side verification of loyalty reward if provided
    let verifiedReward: any = null;
    let computedOriginalAmount =
      originalAmount !== undefined && !isNaN(originalAmount)
        ? originalAmount
        : Number(apt.original_amount ?? apt.price ?? 0);
    let computedDiscountAmount =
      loyaltyDiscountAmount !== undefined && !isNaN(loyaltyDiscountAmount)
        ? loyaltyDiscountAmount
        : 0;
    let computedRewardDesc = loyaltyRewardDescription || null;

    if (loyaltyRewardId) {
      const { data: rewardRow, error: rewardErr } = await supabase()
        .from("loyalty_rewards")
        .select("*")
        .eq("id", loyaltyRewardId)
        .maybeSingle();

      if (rewardErr || !rewardRow) {
        return { success: false, error: "Selected loyalty reward was not found." };
      }

      const now = new Date();
      if (new Date(rewardRow.valid_until).getTime() < now.getTime()) {
        await supabase()
          .from("loyalty_rewards")
          .update({ status: "EXPIRED", updated_at: now.toISOString() })
          .eq("id", rewardRow.id);
        return { success: false, error: "This loyalty reward has expired." };
      }

      if (
        rewardRow.status === "USED" &&
        rewardRow.redeemed_appointment_id &&
        rewardRow.redeemed_appointment_id !== appointmentId
      ) {
        return {
          success: false,
          error: "This loyalty reward has already been redeemed.",
        };
      }

      verifiedReward = rewardRow;
      computedRewardDesc = computedRewardDesc || rewardRow.reward_description || "Top 5 Loyalty Reward";

      // If caller didn't pass explicit discount amount, calculate from reward row
      if (computedDiscountAmount <= 0 && computedOriginalAmount > 0) {
        if (rewardRow.reward_type === "percentage_discount") {
          const pct = Math.min(100, Math.max(0, Number(rewardRow.reward_value) || 0));
          computedDiscountAmount = Math.round((computedOriginalAmount * pct) / 100);
        } else if (rewardRow.reward_type === "fixed_amount") {
          computedDiscountAmount = Math.min(
            computedOriginalAmount,
            Math.max(0, Number(rewardRow.reward_value) || 0)
          );
        } else if (rewardRow.reward_type === "free_service") {
          computedDiscountAmount = Math.min(
            computedOriginalAmount,
            Math.max(0, Number(rewardRow.reward_value) || computedOriginalAmount)
          );
        }
      }
    }

    const finalAmount =
      amount !== undefined && !isNaN(amount) && amount >= 0
        ? amount
        : Math.max(0, computedOriginalAmount - computedDiscountAmount);

    const finalCashReceived =
      cashReceived !== undefined && !isNaN(cashReceived) && cashReceived >= finalAmount
        ? cashReceived
        : finalAmount;

    const isAlreadyCompleted = apt.status === "Completed";

    const aptUpdatePayload: Record<string, any> = {
      status: "Completed",
      payment_method: paymentMethod || apt.payment_method || "GCash",
      payment_status: "Paid",
    };

    if (verifiedReward) {
      aptUpdatePayload.loyalty_reward_id = verifiedReward.id;
      aptUpdatePayload.original_amount = computedOriginalAmount;
      aptUpdatePayload.loyalty_discount_amount = computedDiscountAmount;
      aptUpdatePayload.loyalty_reward_description = computedRewardDesc;
      aptUpdatePayload.price = finalAmount;
    }

    // Update appointment status to 'Completed' if not already completed
    if (!isAlreadyCompleted) {
      const { error: updateError } = await supabase()
        .from("appointments")
        .update(aptUpdatePayload)
        .eq("id", appointmentId);

      if (updateError) {
        console.error(`❌ [PAYMENT FULFILLMENT] Failed to update appointment status:`, updateError);
        return { success: false, error: updateError.message };
      }
      console.log(`✅ [PAYMENT FULFILLMENT] Appointment ${appointmentId} status updated to Completed.`);
    } else {
      if (apt.payment_status !== "Paid" || verifiedReward) {
        await supabase()
          .from("appointments")
          .update(aptUpdatePayload)
          .eq("id", appointmentId);
      }
      console.log(`ℹ️ [PAYMENT FULFILLMENT] Appointment ${appointmentId} was already Completed.`);
    }

    // Idempotent Billing Record Creation/Update
    const { data: existingBilling } = await supabase()
      .from("billing")
      .select("*")
      .eq("appointment_id", appointmentId)
      .limit(1)
      .maybeSingle();

    let billingId: string | null = existingBilling?.id || null;

    if (!existingBilling) {
      const insertBillingPayload: Record<string, any> = {
        appointment_id: appointmentId,
        customer_id: apt.customer_id || verifiedReward?.customer_id || null,
        amount: finalAmount,
        cash_received: finalCashReceived,
        payment_method: paymentMethod || "GCash",
        status: "Paid",
        notes: notes || `Payment for ${apt.service_name || "service"}`,
      };

      if (verifiedReward) {
        insertBillingPayload.loyalty_reward_id = verifiedReward.id;
        insertBillingPayload.original_amount = computedOriginalAmount;
        insertBillingPayload.loyalty_discount_amount = computedDiscountAmount;
        insertBillingPayload.loyalty_reward_description = computedRewardDesc;
      }

      const { data: insertedBill, error: billInsertErr } = await supabase()
        .from("billing")
        .insert(insertBillingPayload)
        .select("*")
        .single();

      if (billInsertErr) {
        console.error(`❌ [PAYMENT FULFILLMENT] Billing insert error:`, billInsertErr);
      } else {
        billingId = insertedBill?.id || null;
        console.log(`✅ [PAYMENT FULFILLMENT] Billing record created with status Paid.`);
      }
    } else if (existingBilling.status !== "Paid" || verifiedReward) {
      const updateBillingPayload: Record<string, any> = {
        status: "Paid",
        amount: finalAmount,
        cash_received: finalCashReceived,
        payment_method: paymentMethod || existingBilling.payment_method || "GCash",
      };

      if (verifiedReward) {
        updateBillingPayload.loyalty_reward_id = verifiedReward.id;
        updateBillingPayload.original_amount = computedOriginalAmount;
        updateBillingPayload.loyalty_discount_amount = computedDiscountAmount;
        updateBillingPayload.loyalty_reward_description = computedRewardDesc;
      }

      await supabase()
        .from("billing")
        .update(updateBillingPayload)
        .eq("id", existingBilling.id);
      console.log(`✅ [PAYMENT FULFILLMENT] Existing billing record updated to Paid.`);
    }

    // Mark loyalty reward as USED only after payment is fulfilled
    if (verifiedReward && verifiedReward.status !== "USED") {
      const nowIso = new Date().toISOString();
      await supabase()
        .from("loyalty_rewards")
        .update({
          status: "USED",
          redeemed_at: nowIso,
          redeemed_appointment_id: appointmentId,
          redeemed_billing_id: billingId,
          original_amount: computedOriginalAmount,
          discount_amount: computedDiscountAmount,
          final_amount: finalAmount,
          updated_at: nowIso,
        })
        .eq("id", verifiedReward.id);
      console.log(`✅ [PAYMENT FULFILLMENT] Loyalty reward ${verifiedReward.id} marked as USED.`);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("payment-updated"));
      window.dispatchEvent(new Event("appointment-updated"));
    }

    return {
      success: true,
      appointmentId,
      status: "Completed",
      alreadyCompleted: isAlreadyCompleted,
      finalAmount,
      originalAmount: computedOriginalAmount,
      loyaltyDiscountAmount: computedDiscountAmount,
      loyaltyRewardDescription: computedRewardDesc,
    };
  } catch (err: any) {
    console.error(`❌ [PAYMENT FULFILLMENT] Server exception:`, err);
    return { success: false, error: err?.message || "Server fulfillment exception" };
  }
}

