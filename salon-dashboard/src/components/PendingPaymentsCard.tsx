"use client";

import { CreditCard, ArrowUpRight, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Appointments, Billing, type Appointment, type BillingRecord } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import AppointmentDetailsModal from "./AppointmentDetailsModal";

export interface PendingPaymentItem {
  id: string;
  customerName: string;
  appointmentDate: string;
  dateStr: string;
  serviceName: string;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: "Pending" | "Partial";
  rawAppointment: Appointment;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "Today";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default function PendingPaymentsCard() {
  const [items, setItems] = useState<PendingPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allAppointments, allBillings] = await Promise.all([
        Appointments.list(),
        Billing.list().catch(() => [] as BillingRecord[]),
      ]);

      // Map paid billing amounts by appointment_id, summing all successful payments
      const billingsByApt = new Map<string, number>();
      (allBillings || []).forEach((b) => {
        if (b.appointment_id) {
          const statusLower = (b.status || "").toLowerCase();
          const isSuccessfulPayment =
            !b.status ||
            statusLower === "paid" ||
            statusLower === "partially paid" ||
            statusLower === "completed";
          if (isSuccessfulPayment) {
            const current = billingsByApt.get(b.appointment_id) || 0;
            billingsByApt.set(b.appointment_id, current + Number(b.amount || 0));
          }
        }
      });

      // Today baseline at midnight
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const threeDaysAgo = todayMidnight - 3 * 24 * 60 * 60 * 1000;

      // Filter eligible active bookings with outstanding payments
      const eligibleItems: PendingPaymentItem[] = [];

      for (const apt of allAppointments) {
        if (!apt || !apt.id) continue;

        // 1. Exclude cancelled appointments
        if (apt.status === "Cancelled" || apt.payment_status === "Cancelled") {
          continue;
        }

        // 2. Exclude no-show bookings
        if (apt.status === "no_show" || apt.status === "No-Show") {
          continue;
        }

        // 3. Exclude explicitly marked as Paid
        if (apt.payment_status === "Paid") {
          continue;
        }

        // 4. Calculate amounts
        const total = Number(apt.price || (apt as any).original_amount || apt.services?.price || 0);
        if (total <= 0) continue;

        // Retrieve downpayment recorded on appointment record
        const aptDownpayment = Number(
          (apt as any).downpayment_paid ??
          apt.downpayment_amount ??
          (apt as any).amount_paid ??
          (apt as any).paid_amount ??
          0
        );

        // Sum of successful billing payments for this appointment
        const billedAmount = billingsByApt.get(apt.id) || 0;

        // Total amount paid includes downpayment and/or successful billing payments (supporting multiple payments)
        const totalAlreadyPaid = Math.max(billedAmount, aptDownpayment);
        const amountPaid = Math.min(total, totalAlreadyPaid);
        const remainingBalance = Math.max(0, total - amountPaid);

        // Exclude fully paid bookings
        if (remainingBalance <= 0) {
          continue;
        }

        // 5. Exclude expired bookings & old pending transactions that are no longer active
        // Active bookings:
        // - Bookings for today or upcoming (aptTimestamp >= todayMidnight)
        // - Bookings currently "In Progress"
        // - Recently created bookings (within last 3 days)
        // - Recently scheduled bookings
        // - Any booking with an active partial payment and remaining balance
        const dateVal = apt.appointment_date || (apt as any).date;
        const aptTimestamp = dateVal ? new Date(dateVal).getTime() : 0;
        const createdTimestamp = apt.created_at ? new Date(apt.created_at).getTime() : aptTimestamp;

        const isUpcomingOrToday = aptTimestamp >= todayMidnight;
        const isOngoing = apt.status === "In Progress";
        const isRecentlyCreated = createdTimestamp >= threeDaysAgo;
        const isRecentlyScheduled = aptTimestamp >= threeDaysAgo && apt.status === "Scheduled";
        const hasActivePayment = amountPaid > 0 && remainingBalance > 0;

        if (!isUpcomingOrToday && !isOngoing && !isRecentlyCreated && !isRecentlyScheduled && !hasActivePayment) {
          // Stale / expired transaction from the past that was never fulfilled
          continue;
        }

        // Determine badge: Partial if some amount paid or status explicitly says Partial / Partially Paid
        const paymentStatus: "Pending" | "Partial" =
          amountPaid > 0 ||
          apt.payment_status === "Partial" ||
          apt.payment_status === "Partially Paid"
            ? "Partial"
            : "Pending";

        const customerName = apt.customers?.name || apt.customer_name || "Valued Client";
        const serviceName = apt.services?.name || apt.service_name || "Salon Service";

        eligibleItems.push({
          id: apt.id,
          customerName,
          appointmentDate: dateVal || "",
          dateStr: formatDateDisplay(dateVal),
          serviceName,
          totalAmount: total,
          amountPaid,
          remainingBalance,
          paymentStatus,
          rawAppointment: apt,
        });
      }

      // Sort by booking creation date and time, newest first
      eligibleItems.sort((a, b) => {
        const timeA = a.rawAppointment.created_at
          ? new Date(a.rawAppointment.created_at).getTime()
          : new Date(a.rawAppointment.appointment_date || 0).getTime();
        const timeB = b.rawAppointment.created_at
          ? new Date(b.rawAppointment.created_at).getTime()
          : new Date(b.rawAppointment.appointment_date || 0).getTime();
        return timeB - timeA;
      });

      // Keep latest 5 eligible records
      setItems(eligibleItems.slice(0, 5));
    } catch (error) {
      console.error("Failed to load pending payments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Real-time updates for both appointments and billing tables
    const supabase = createClient();
    const channel = supabase
      .channel("pending-payments-card-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billing" },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Custom window event listener for instant local sync
    const handleLocalUpdate = () => {
      loadData();
    };
    window.addEventListener("appointment-updated", handleLocalUpdate);

    // Silent background poll (every 30s)
    const interval = setInterval(loadData, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("appointment-updated", handleLocalUpdate);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleRowClick = (item: PendingPaymentItem) => {
    setSelectedAptDetails(item.rawAppointment);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-pink-200 flex flex-col h-full relative min-w-0">
      {/* ─── Card Header ─── */}
      <div className="flex items-center justify-between mb-4 pb-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-5 h-5 text-pink-500 shrink-0" />
          <h3 className="font-bold text-gray-900 text-lg tracking-tight">
            Pending Payments
          </h3>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-pink-100 text-[#FF3399] text-[10px] font-extrabold">
              {items.length}
            </span>
          )}
        </div>
        <Link
          href="/billing?status=Pending"
          className="text-pink-500 hover:text-pink-600 font-bold text-xs flex items-center gap-1 transition-colors group cursor-pointer"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      {/* ─── Content Area ─── */}
      {loading ? (
        <div className="flex-1 min-h-[300px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-pink-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800">All payments settled!</p>
          <p className="text-xs text-gray-400 mt-1">
            No active customers with outstanding balances at this moment.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
          {items.map((item) => {
            const initial = item.customerName.charAt(0).toUpperCase() || "C";
            const isPartial = item.paymentStatus === "Partial";

            return (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="p-3 rounded-2xl border border-pink-100/70 hover:border-pink-300 hover:bg-pink-50/30 transition-all cursor-pointer group flex flex-col gap-2 shadow-2xs hover:shadow-xs"
              >
                {/* Top Row: Customer Info + Date + Service + Payment Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {item.customerName}
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">
                        {item.dateStr} • {item.serviceName}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-tight ${
                      isPartial
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {item.paymentStatus}
                  </span>
                </div>

                {/* Bottom Row: Total, Paid, and Remaining Balance */}
                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-gray-100/80 text-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Total
                    </span>
                    <span className="text-[11px] font-semibold text-gray-700">
                      ₱{item.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Paid
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      ₱{item.amountPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#FF3399]">
                      Balance
                    </span>
                    <span className="text-[11px] font-extrabold text-[#FF3399]">
                      ₱{item.remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAptDetails}
        onStatusChange={() => {
          loadData();
        }}
      />
    </div>
  );
}

