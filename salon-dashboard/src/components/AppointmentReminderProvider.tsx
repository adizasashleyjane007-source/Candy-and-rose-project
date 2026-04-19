"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, User, Scissors, Calendar, XCircle, TrendingUp } from "lucide-react";
import { Appointments, Customers, type Appointment } from "@/lib/db";

interface SummaryData {
    cancelled: number;
    completed: number;
    pending: number;
    revenue: number;
    newCustomers: number;
}

// Track which appointments have already triggered a reminder this session
const remindedIds = new Set<string>();

export default function AppointmentReminderProvider() {
    const router = useRouter();
    const [reminderAppt, setReminderAppt] = useState<Appointment | null>(null);
    const [dailySummary, setDailySummary] = useState<SummaryData | null>(null);
    const [isImmediate, setIsImmediate] = useState(false);
    const [minutesLeft, setMinutesLeft] = useState(0);
    const [showedSummaryDate, setShowedSummaryDate] = useState<string | null>(null);

    const checkReminders = useCallback(async () => {
        try {
            const appointments = await Appointments.list();
            const now = new Date();
            const dateString = now.toLocaleDateString('en-CA');

            // 1. Check for reminders
            for (const apt of appointments) {
                if (apt.status === "Cancelled" || apt.status === "Completed") continue;

                const aptTime = new Date(apt.appointment_date);
                if (apt.appointment_time) {
                    const timeMatch = apt.appointment_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (timeMatch) {
                        let h = parseInt(timeMatch[1], 10);
                        const m = parseInt(timeMatch[2], 10);
                        const ampm = timeMatch[3]?.toUpperCase();
                        if (ampm === "PM" && h < 12) h += 12;
                        if (ampm === "AM" && h === 12) h = 0;
                        aptTime.setHours(h, m, 0, 0);
                    }
                }

                if (isNaN(aptTime.getTime())) continue;

                const diffMs = aptTime.getTime() - now.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                // IMMEDIATE REMINDER
                if (diffMins === 0 && !remindedIds.has(`${apt.id}-now`)) {
                    remindedIds.add(`${apt.id}-now`);
                    setMinutesLeft(0);
                    setIsImmediate(true);
                    setReminderAppt(apt);
                    break;
                }

                // 1 Hour Reminder
                if (diffMins >= 55 && diffMins <= 65 && !remindedIds.has(`${apt.id}-1h`)) {
                    remindedIds.add(`${apt.id}-1h`);
                    setMinutesLeft(diffMins);
                    setIsImmediate(false);
                    setReminderAppt(apt);
                    break;
                }

                // 20 Minute Reminder
                if (diffMins >= 15 && diffMins <= 25 && !remindedIds.has(`${apt.id}-20m`)) {
                    remindedIds.add(`${apt.id}-20m`);
                    setMinutesLeft(diffMins);
                    setIsImmediate(false);
                    setReminderAppt(apt);
                    break;
                }
            }

            // 2. DAILY SUMMARY LOGIC (Check after 6 PM as a default if no settings)
            if (now.getHours() >= 18 && showedSummaryDate !== dateString) {
                const todayApts = appointments.filter(a => a.appointment_date === dateString);
                const cancelled = todayApts.filter(a => a.status === "Cancelled").length;
                const completed = todayApts.filter(a => a.status === "Completed").length;
                const pending = todayApts.filter(a => a.status === "Pending").length;
                const revenue = todayApts
                    .filter(a => a.status === "Completed")
                    .reduce((sum, a) => sum + (a.price || 0), 0);

                const customers = await Customers.list();
                const newCustomers = customers.filter(c => {
                    const cd = new Date(c.created_at || '');
                    return cd.toLocaleDateString('en-CA') === dateString;
                }).length;

                setDailySummary({ cancelled, completed, pending, revenue, newCustomers });
                setShowedSummaryDate(dateString);
            }
        } catch (error: any) {
            // Log as warning instead of error to avoid aggressive Next.js dev overlays, since it's a background loop
            console.warn("Background reminder check gracefully handled an issue:", error?.message || "Unknown Supabase/Network error");
        }
    }, [showedSummaryDate]);

    useEffect(() => {
        checkReminders();
        const interval = setInterval(checkReminders, 60000);
        return () => clearInterval(interval);
    }, [checkReminders]);

    const handleOkay = () => {
        setReminderAppt(null);
        setDailySummary(null);
        router.push("/appointment");
    };

    const handleClose = () => {
        setReminderAppt(null);
        setDailySummary(null);
    };

    if (!reminderAppt && !dailySummary) return null;

    if (dailySummary) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-pink-100 overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-pink-400 to-amber-400" />
                    <div className="p-7">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-6 h-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">End of Day Summary</h3>
                                <p className="text-sm text-gray-500">Today's performance</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Revenue</p>
                                <p className="text-xl font-bold text-gray-900">₱{dailySummary.revenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-600 uppercase mb-1">New Clients</p>
                                <p className="text-xl font-bold text-gray-900">{dailySummary.newCustomers}</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-600">Completed</span>
                                <span className="font-bold text-gray-900">{dailySummary.completed}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-600">Pending</span>
                                <span className="font-bold text-gray-900">{dailySummary.pending}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-600">Cancelled</span>
                                <span className="font-bold text-gray-900">{dailySummary.cancelled}</span>
                            </div>
                        </div>

                        <button onClick={handleClose} className="w-full px-4 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold transition-all">Close Summary</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-pink-100 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r from-pink-400 to-pink-600`} />
                <div className="p-7">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-pink-500 animate-bounce" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                {isImmediate ? 'Starting Now!' : 'Upcoming Appointment'}
                            </h3>
                            <p className="text-sm font-semibold text-pink-500">
                                {isImmediate ? 'Scheduled for exactly now' : `In ~${minutesLeft} minutes`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 space-y-3 mb-6">
                        <DetailRow icon={<User className="w-4 h-4 text-pink-400" />} label="Client" value={reminderAppt!.customers?.name || reminderAppt!.customer_name || 'Walk-in'} />
                        <DetailRow icon={<Scissors className="w-4 h-4 text-pink-400" />} label="Service" value={reminderAppt!.services?.name || reminderAppt!.service_name || 'N/A'} />
                        <DetailRow icon={<Calendar className="w-4 h-4 text-pink-400" />} label="Time" value={reminderAppt!.appointment_time || 'N/A'} />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">Dismiss</button>
                        <button onClick={handleOkay} className="flex-[2] px-4 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold transition-all">View Schedule</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3">
            <span className="shrink-0">{icon}</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-16">{label}</span>
            <span className="text-sm font-semibold text-gray-800 truncate">{value}</span>
        </div>
    );
}
