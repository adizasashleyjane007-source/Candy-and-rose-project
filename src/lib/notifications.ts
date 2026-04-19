/**
 * Notification utility — writes to Supabase (and fires local event for UI refresh).
 * Falls back gracefully if Supabase is unavailable.
 */
import { createClient } from "@/lib/supabase/client";

export type NotificationType = 'inventory' | 'customer' | 'appointment' | 'system' | 'billing';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
}

/**
 * Add a notification to Supabase.
 * Dispatches a custom "notificationsUpdated" event so any mounted UI can refresh.
 */
export const addNotification = async (
  title: string,
  message: string,
  type: NotificationType
): Promise<void> => {
  try {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .insert({ title, message, type, is_read: false });
  } catch (e) {
    console.error("Failed to add notification:", e);
  }

  // Notify mounted components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notificationsUpdated"));
  }
};

/**
 * Fetch all notifications from Supabase.
 */
export const getNotifications = async (): Promise<AppNotification[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((n: any) => ({
      id: String(n.id),
      title: n.title,
      message: n.message ?? "",
      timestamp: new Date(n.created_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: n.is_read ?? false,
      type: (n.type ?? "system") as NotificationType,
    }));
  } catch (e) {
    console.error("Failed to fetch notifications:", e);
    return [];
  }
};
