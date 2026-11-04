import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

export type ReportCategory = "appointment" | "inventory" | "billing" | "nail_design";

/**
 * Returns today's date formatted as YYYY-MM-DD in the Philippine timezone (Asia/Manila, UTC+8).
 */
export function getPhilippineTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // e.g. "2026-11-04"
}

/**
 * Converts any ISO timestamp or Date object into a YYYY-MM-DD string in Asia/Manila timezone.
 */
export function toPhilippineDateString(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) {
    // If it's already a plain date string like "2026-11-04"
    if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(isoOrDate)) {
      return isoOrDate.substring(0, 10);
    }
    return "";
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats a date into a human-friendly date string (e.g. "November 4, 2026").
 */
export function formatPhilippineDateDisplay(dateStr?: string): string {
  const targetDate = dateStr ? new Date(`${dateStr}T12:00:00+08:00`) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(targetDate);
}

/**
 * Formats an ISO string to a friendly time string (e.g. "10:30 AM").
 */
export function formatPhilippineTimeDisplay(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "N/A";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return String(isoOrDate);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Formats numeric values to Philippine Peso display (e.g. "₱1,250.00").
 */
export function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Triggers a download of an XLSX workbook in the browser.
 */
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  try {
    XLSX.writeFile(wb, filename);
  } catch {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A. Appointment Report
 */
export async function generateTodayAppointmentReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const todayStr = getPhilippineTodayDateString();
  const todayDisplay = formatPhilippineDateDisplay(todayStr);

  // Fetch appointments with relations
  const { data: allAppointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      customer_name,
      service_name,
      appointment_date,
      appointment_time,
      date,
      time,
      status,
      created_at,
      customers(name),
      services(name)
    `)
    .order("appointment_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch appointment records: ${error.message}`);
  }

  const rawAppointments = (allAppointments as any[]) || [];

  // Filter appointments associated with today's date
  const todayApts = rawAppointments.filter((apt: any) => {
    const aptDate = apt.appointment_date || apt.date;
    if (aptDate && String(aptDate).substring(0, 10) === todayStr) return true;
    return false;
  });

  const totalAppointments = todayApts.length;
  const completedAppointments = todayApts.filter(
    (a: any) => (a.status || "").toLowerCase() === "completed"
  ).length;
  const cancelledAppointments = todayApts.filter(
    (a: any) => (a.status || "").toLowerCase() === "cancelled"
  ).length;
  const noShowAppointments = todayApts.filter((a: any) => {
    const s = (a.status || "").toLowerCase();
    return s === "no-show" || s === "no_show" || s === "noshow";
  }).length;

  const aoa: any[][] = [
    ["Today's Appointment Summary"],
    ["Report Date:", todayDisplay, "Philippine Date:", todayStr],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Appointments", totalAppointments],
    ["Number of Completed Appointments", completedAppointments],
    ["Number of Cancelled Appointments", cancelledAppointments],
    ["Number of No-Show Appointments", noShowAppointments],
    [],
    ["APPOINTMENT DETAILS"],
    ["Customer Name", "Services", "Appointment Date", "Appointment Time", "Status"],
  ];

  if (todayApts.length === 0) {
    aoa.push(["No appointment records found for today.", "", "", "", ""]);
  } else {
    todayApts.forEach((apt: any) => {
      const customerName = apt.customer_name || apt.customers?.name || "Customer";
      const services = apt.service_name || apt.services?.name || "Standard Service";
      const appointmentDate = apt.appointment_date || apt.date || todayStr;
      const appointmentTime = apt.appointment_time || apt.time || "N/A";
      const status = apt.status || "Scheduled";

      aoa.push([customerName, services, appointmentDate, appointmentTime, status]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 28 }, // Customer Name
    { wch: 36 }, // Services
    { wch: 18 }, // Appointment Date
    { wch: 18 }, // Appointment Time
    { wch: 16 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Appointment Summary");

  const filename = `Appointment_Summary_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  return { filename, count: totalAppointments };
}

/**
 * B. Inventory Report
 */
export async function generateTodayInventoryReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const todayStr = getPhilippineTodayDateString();
  const todayDisplay = formatPhilippineDateDisplay(todayStr);

  const { data: inventoryData, error } = await supabase
    .from("inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch inventory records: ${error.message}`);
  }

  const items = (inventoryData as any[]) || [];
  const totalItems = items.length;
  const totalStockAvailable = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
  
  const lowStockItems = items.filter((item: any) => {
    const s = (item.status || "").toLowerCase();
    const qty = Number(item.quantity) || 0;
    const reorder = Number(item.reorder_level) || 10;
    return s === "low stock" || (qty > 0 && qty < reorder);
  }).length;

  const outOfStockItems = items.filter((item: any) => {
    const s = (item.status || "").toLowerCase();
    const qty = Number(item.quantity) || 0;
    return s === "out of stock" || qty <= 0;
  }).length;

  const aoa: any[][] = [
    ["Today's Inventory Summary"],
    ["Report Date:", todayDisplay, "Philippine Date:", todayStr],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Inventory Items", totalItems],
    ["Total Stock Available", totalStockAvailable],
    ["Items with Low Stock", lowStockItems],
    ["Out-of-Stock Items", outOfStockItems],
    [],
    ["INVENTORY DETAILS"],
    ["Item Name", "Category", "Opening Stock", "Stock Added", "Stock Deducted", "Current Stock", "Status"],
  ];

  if (items.length === 0) {
    aoa.push(["No inventory records found in the database.", "", "", "", "", "", ""]);
  } else {
    items.forEach((item: any) => {
      const name = item.name || "Unnamed Item";
      const category = item.category || "General";
      // As specified: If historical opening stock or transaction data is unavailable, do not fabricate.
      const openingStock = "N/A";
      const stockAdded = "N/A";
      const stockDeducted = "N/A";
      const currentStock = item.quantity ?? 0;
      const status =
        item.status || (currentStock <= 0 ? "Out of Stock" : currentStock < 10 ? "Low Stock" : "In Stock");

      aoa.push([name, category, openingStock, stockAdded, stockDeducted, currentStock, status]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 30 }, // Item Name
    { wch: 22 }, // Category
    { wch: 16 }, // Opening Stock
    { wch: 16 }, // Stock Added
    { wch: 16 }, // Stock Deducted
    { wch: 16 }, // Current Stock
    { wch: 16 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory Summary");

  const filename = `Inventory_Summary_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  return { filename, count: totalItems };
}

/**
 * C. Billing Report
 */
export async function generateTodayBillingReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const todayStr = getPhilippineTodayDateString();
  const todayDisplay = formatPhilippineDateDisplay(todayStr);

  const { data: allBilling, error } = await supabase
    .from("billing")
    .select(`
      id,
      amount,
      cash_received,
      payment_method,
      status,
      created_at,
      customer_id,
      appointment_id,
      customers(name),
      appointments(customer_name, service_name, price)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch billing records: ${error.message}`);
  }

  const rawBilling = (allBilling as any[]) || [];

  // Filter billing records created today in Philippine timezone
  const todayBilling = rawBilling.filter((b: any) => {
    return toPhilippineDateString(b.created_at) === todayStr;
  });

  const totalTransactions = todayBilling.length;

  // Only count successfully completed/paid transactions as collected revenue. Do not include unpaid.
  const paidTransactions = todayBilling.filter((b: any) => {
    const s = (b.status || "").toLowerCase();
    return s === "paid" || s === "completed" || s === "success";
  });

  const totalRevenueCollected = paidTransactions.reduce(
    (sum: number, b: any) => sum + (Number(b.amount) || 0),
    0
  );

  const totalCashPayments = paidTransactions
    .filter((b: any) => (b.payment_method || "").toLowerCase() === "cash")
    .reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

  const totalRefundedAmount = todayBilling
    .filter((b: any) => (b.status || "").toLowerCase() === "refunded")
    .reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

  const aoa: any[][] = [
    ["Today's Billing Summary"],
    ["Report Date:", todayDisplay, "Philippine Date:", todayStr],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Transactions", totalTransactions],
    ["Total Revenue Collected", formatCurrency(totalRevenueCollected)],
    ["Total Cash Payments", formatCurrency(totalCashPayments)],
    ["Total Refunded Amount", formatCurrency(totalRefundedAmount)],
    [],
    ["BILLING DETAILS"],
    ["Customer Name", "Services", "Payment Method", "Amount", "Payment Date", "Payment Status"],
  ];

  if (todayBilling.length === 0) {
    aoa.push(["No billing transactions found for today.", "", "", "", "", ""]);
  } else {
    todayBilling.forEach((b: any) => {
      const customerName =
        b.customers?.name ||
        b.appointments?.customer_name ||
        "Walk-in Customer";
      const services = b.appointments?.service_name || "Salon Service";
      const paymentMethod = b.payment_method || "Cash";
      const amount = formatCurrency(Number(b.amount) || 0);
      const paymentDate = formatPhilippineTimeDisplay(b.created_at);
      const status = b.status || "Paid";

      aoa.push([customerName, services, paymentMethod, amount, paymentDate, status]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 28 }, // Customer Name
    { wch: 35 }, // Services
    { wch: 18 }, // Payment Method
    { wch: 18 }, // Amount
    { wch: 22 }, // Payment Date
    { wch: 16 }, // Payment Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Billing Summary");

  const filename = `Billing_Summary_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  return { filename, count: totalTransactions };
}

/**
 * D. Nail Design Booked Report
 */
export async function generateTodayNailDesignBookedReport(): Promise<{ filename: string; count: number }> {
  const supabase = createClient();
  const todayStr = getPhilippineTodayDateString();
  const todayDisplay = formatPhilippineDateDisplay(todayStr);

  // Fetch appointments created today with relations
  const { data: allAppointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      customer_name,
      service_name,
      design_name,
      design_id,
      price,
      appointment_date,
      date,
      status,
      payment_status,
      created_at,
      notes,
      customers(name),
      services(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch appointment records: ${error.message}`);
  }

  const rawAppointments = (allAppointments as any[]) || [];

  // Include ONLY nail design bookings created today (based on created_at, not appointment_date)
  const todayNailBookings = rawAppointments.filter((apt: any) => {
    // 1. Must be created today in Philippine timezone
    const createdDate = toPhilippineDateString(apt.created_at);
    if (createdDate !== todayStr) return false;

    // 2. Must be a nail design booking
    const hasDesignName = Boolean(apt.design_name && String(apt.design_name).trim().length > 0);
    const hasDesignId = Boolean(apt.design_id && String(apt.design_id).trim().length > 0);
    const serviceName = (apt.service_name || apt.services?.name || "").toLowerCase();
    const isNailService = serviceName.includes("nail art") || serviceName.includes("artisan") || serviceName.includes("design");
    const notesMatch = Boolean(apt.notes && apt.notes.toLowerCase().includes("nail"));

    return hasDesignName || hasDesignId || isNailService || notesMatch;
  });

  const totalNailDesignsBooked = todayNailBookings.length;

  // Calculate revenue from nail design bookings (only paid or completed)
  const totalRevenue = todayNailBookings
    .filter((apt: any) => {
      const pStatus = (apt.payment_status || "").toLowerCase();
      const status = (apt.status || "").toLowerCase();
      return pStatus === "paid" || status === "completed";
    })
    .reduce((sum: number, apt: any) => sum + (Number(apt.price) || 0), 0);

  const aoa: any[][] = [
    ["Today's Nail Design Booked Summary"],
    ["Report Date:", todayDisplay, "Philippine Date:", todayStr],
    [],
    ["SUMMARY STATISTICS"],
    ["Total Nail Designs Booked", totalNailDesignsBooked],
    ["Total Revenue from Nail Design Bookings", formatCurrency(totalRevenue)],
    [],
    ["BOOKING DETAILS"],
    ["Customer Name", "Nail Design Name", "Price", "Booking Date", "Appointment Date", "Status"],
  ];

  if (todayNailBookings.length === 0) {
    aoa.push(["No nail design bookings created today.", "", "", "", "", ""]);
  } else {
    todayNailBookings.forEach((apt: any) => {
      const customerName = apt.customer_name || apt.customers?.name || "Customer";
      const nailDesignName = apt.design_name || apt.service_name || "Custom Nail Design";
      const price = formatCurrency(Number(apt.price) || 0);
      const bookingDate = formatPhilippineTimeDisplay(apt.created_at);
      const appointmentDate = apt.appointment_date || apt.date || "N/A";
      const status = apt.status || "Scheduled";

      aoa.push([customerName, nailDesignName, price, bookingDate, appointmentDate, status]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 28 }, // Customer Name
    { wch: 32 }, // Nail Design Name
    { wch: 18 }, // Price
    { wch: 22 }, // Booking Date
    { wch: 20 }, // Appointment Date
    { wch: 16 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nail Design Summary");

  const filename = `Nail_Design_Booked_Summary_${todayStr}.xlsx`;
  downloadWorkbook(wb, filename);

  return { filename, count: totalNailDesignsBooked };
}
