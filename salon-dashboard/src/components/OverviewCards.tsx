"use client";

import { CalendarIcon, Users, PhilippinePeso, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Appointments, Customers, Billing, type Appointment, type BillingRecord } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

/**
 * Converts a Date or ISO timestamp into a YYYY-MM-DD date string in Asia/Manila timezone.
 */
export function toManilaDateString(isoOrDate: string | Date | null | undefined): string {
    if (!isoOrDate) return "";
    if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate.trim())) {
        return isoOrDate.trim();
    }
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) {
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
 * Calculates Today Sales: total amount of actual payments successfully collected TODAY (Asia/Manila),
 * based on payment transaction timestamps regardless of appointment date.
 * - Includes successful/paid payments recorded today
 * - Excludes pending, unpaid, failed, and cancelled transactions
 * - Accounts for refunded/reversed payments
 * - Prevents duplicate counting per appointment/transaction
 */
export function calculateTodaySales(
    billings: BillingRecord[],
    appointments: Appointment[],
    now: Date = new Date()
): number {
    const todayManila = toManilaDateString(now);

    const aptMap = new Map<string, Appointment>();
    (appointments || []).forEach((apt) => {
        if (apt?.id) {
            aptMap.set(String(apt.id), apt);
        }
    });

    // Track appointments that have any billing record (on any date)
    const appointmentsWithAnyBilling = new Set<string>();
    // Track appointments or standalone billings already counted today to prevent duplicate counting
    const countedPaymentKeys = new Set<string>();
    // Track appointments that were refunded/reversed/cancelled
    const invalidatedAppointments = new Set<string>();

    (billings || []).forEach((bill) => {
        const aptId = bill.appointment_id ? String(bill.appointment_id) : "";
        if (aptId) {
            appointmentsWithAnyBilling.add(aptId);
        }
        const statusLower = String(bill.status || "").trim().toLowerCase();
        if (
            statusLower === "refunded" ||
            statusLower === "reversed" ||
            statusLower === "cancelled" ||
            statusLower === "failed" ||
            statusLower === "void"
        ) {
            if (aptId) invalidatedAppointments.add(aptId);
        }
    });

    let todaySalesTotal = 0;

    // 1. Primary source of truth: Billing payment transaction records created today in Asia/Manila
    (billings || []).forEach((bill) => {
        if (!bill) return;

        // Must be recorded today in Asia/Manila based on payment transaction timestamp
        const billDateManila = toManilaDateString(bill.created_at);
        if (billDateManila !== todayManila) return;

        const statusLower = String(bill.status || "").trim().toLowerCase();

        // Only count successful collected payments; exclude pending, unpaid, failed, cancelled, refunded, reversed
        const isPaidSuccess =
            statusLower === "paid" || statusLower === "completed" || statusLower === "success";
        if (!isPaidSuccess) return;

        const aptId = bill.appointment_id ? String(bill.appointment_id) : "";
        if (aptId) {
            if (invalidatedAppointments.has(aptId)) return;

            const linkedApt = aptMap.get(aptId);
            if (linkedApt) {
                const aptStatus = String(linkedApt.status || "").trim().toLowerCase();
                const aptPayStatus = String(linkedApt.payment_status || "").trim().toLowerCase();
                if (
                    aptStatus === "cancelled" ||
                    aptStatus === "no-show" ||
                    aptStatus === "no_show" ||
                    aptPayStatus === "cancelled" ||
                    aptPayStatus === "refunded" ||
                    aptPayStatus === "reversed" ||
                    aptPayStatus === "failed" ||
                    aptPayStatus === "pending" ||
                    aptPayStatus === "unpaid"
                ) {
                    return;
                }
            }
        }

        // Prevent duplicate payment counting for the same appointment or billing ID
        const dedupeKey = aptId ? `apt:${aptId}` : `bill:${bill.id || Math.random()}`;
        if (countedPaymentKeys.has(dedupeKey)) return;
        countedPaymentKeys.add(dedupeKey);

        const amount = Number(bill.amount) || 0;
        if (amount > 0) {
            todaySalesTotal += amount;
        }
    });

    // 2. Fallback for appointments directly marked Paid/Completed today that do not yet have a billing row
    (appointments || []).forEach((apt) => {
        if (!apt?.id) return;
        const aptId = String(apt.id);

        if (appointmentsWithAnyBilling.has(aptId) || countedPaymentKeys.has(`apt:${aptId}`)) {
            return;
        }

        const aptStatus = String(apt.status || "").trim().toLowerCase();
        const aptPayStatus = String(apt.payment_status || "").trim().toLowerCase();

        // Exclude cancelled, no-show, pending, unpaid, failed, refunded
        if (
            aptStatus === "cancelled" ||
            aptStatus === "no-show" ||
            aptStatus === "no_show" ||
            aptPayStatus === "cancelled" ||
            aptPayStatus === "refunded" ||
            aptPayStatus === "reversed" ||
            aptPayStatus === "failed" ||
            aptPayStatus === "pending" ||
            aptPayStatus === "unpaid"
        ) {
            return;
        }

        const isExplicitlyPaid = aptPayStatus === "paid" && aptStatus === "completed";
        if (!isExplicitlyPaid) return;

        const createdDateManila = toManilaDateString(apt.created_at);
        if (createdDateManila !== todayManila) return;

        const amount = Number(apt.price ?? apt.services?.price) || 0;
        if (amount > 0) {
            countedPaymentKeys.add(`apt:${aptId}`);
            todaySalesTotal += amount;
        }
    });

    return todaySalesTotal;
}

export default function OverviewCards() {
    const [stats, setStats] = useState({
        revenue: 0,
        todaySales: 0,
        todaysBookings: 0,
        confirmedBookings: 0,
        totalCustomers: 0
    });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (showSpinner = false) => {
        try {
            if (showSpinner) setLoading(true);
            const [appointments, customers, billings] = await Promise.all([
                Appointments.list(),
                Customers.list(),
                Billing.list().catch(() => [] as BillingRecord[])
            ]);

            let revenue = 0;
            let todaysBookings = 0;
            let confirmedBookings = 0;

            const now = new Date();
            const todayStr = now.toDateString();

            appointments.forEach((apt) => {
                // 1. Revenue: Preserve existing overall revenue calculation from completed bookings
                if (apt.status === 'Completed') {
                    revenue += (apt.price || apt.services?.price || 0);
                }

                // 2. Bookings for today
                if (apt.appointment_date) {
                    const aptDate = new Date(apt.appointment_date);
                    if (!isNaN(aptDate.getTime()) && aptDate.toDateString() === todayStr) {
                        todaysBookings++;
                        if (apt.status === 'Scheduled' || apt.status === 'Completed') {
                            confirmedBookings++;
                        }
                    }
                }
            });

            // 3. Today Sales: Independent calculation based on actual payments collected today (Asia/Manila)
            const todaySales = calculateTodaySales(billings, appointments, now);

            setStats({
                revenue,
                todaySales,
                todaysBookings,
                confirmedBookings,
                totalCustomers: customers.length
            });
        } catch (error) {
            console.error("Failed to load overview stats:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(true);

        // Real-time subscription so Today Sales & other overview cards update automatically
        const supabase = createClient();
        const channel = supabase
            .channel("overview-cards-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "billing" },
                () => loadData(false)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "appointments" },
                () => loadData(false)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "customers" },
                () => loadData(false)
            )
            .subscribe();

        const handleLocalSync = () => loadData(false);
        window.addEventListener("appointment-updated", handleLocalSync);
        window.addEventListener("payment-updated", handleLocalSync);

        const interval = setInterval(() => loadData(false), 30000);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener("appointment-updated", handleLocalSync);
            window.removeEventListener("payment-updated", handleLocalSync);
            clearInterval(interval);
        };
    }, [loadData]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-pink-100 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-200" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* 1. Revenue */}
            <Link 
                href="/billing?status=Paid"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors min-w-0"
            >
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-gray-500">Revenue</p>
                    <PhilippinePeso className="w-5 h-5 text-pink-400 shrink-0" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900 truncate">₱{stats.revenue.toLocaleString()}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">from completed bookings</p>
                </div>
            </Link>

            {/* 2. Today Sales (NEW) */}
            <Link 
                href="/billing?status=Paid"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors min-w-0"
            >
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-gray-500">Today Sales</p>
                    <PhilippinePeso className="w-5 h-5 text-pink-400 shrink-0" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900 truncate">
                        ₱{Math.round(stats.todaySales).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">Total sales collected today</p>
                </div>
            </Link>

            {/* 3. Today's Bookings */}
            <Link 
                href="/appointment?filter=Today"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors min-w-0"
            >
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-gray-500">Today's Bookings</p>
                    <CalendarIcon className="w-5 h-5 text-pink-400 shrink-0" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900 truncate">{stats.todaysBookings}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">{stats.confirmedBookings} confirmed</p>
                </div>
            </Link>

            {/* 4. Total Customers */}
            <Link 
                href="/customer"
                className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 flex flex-col justify-between hover:bg-pink-50 transition-colors min-w-0"
            >
                <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium text-gray-500">Total Customers</p>
                    <Users className="w-5 h-5 text-pink-400 shrink-0" />
                </div>
                <div className="mt-3">
                    <h3 className="text-3xl font-bold text-gray-900 truncate">{stats.totalCustomers}</h3>
                    <p className="text-sm text-pink-500 mt-1 font-medium">registered clients</p>
                </div>
            </Link>
        </div>
    );
}
