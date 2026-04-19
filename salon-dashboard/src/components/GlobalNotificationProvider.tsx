"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar, X, Clock, User, Scissors, XCircle, Info, Mail,
  Bell, TrendingUp, Check, Phone, MapPin
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Appointments, Customers, NotificationsDB, type Appointment } from "@/lib/db";

// Types for Reminder Summary
interface SummaryData {
  cancelled: number;
  completed: number;
  pending: number;
  revenue: number;
  newCustomers: number;
}

// Track which appointments have already triggered a reminder this session
const remindedIds = new Set<string>();

// Helper for time formatting
function formatAMPM(timeStr: string) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

export default function GlobalNotificationProvider() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Notification State (Alerts/Messages) ---
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [detailedAppointment, setDetailedAppointment] = useState<Appointment | null>(null);

  // Modal Control State
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingReason, setIsAddingReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // --- Reminder State ---
  const [reminderAppt, setReminderAppt] = useState<Appointment | null>(null);
  const [dailySummary, setDailySummary] = useState<SummaryData | null>(null);
  const [remMinutesLeft, setRemMinutesLeft] = useState(0);
  const [isRemImmediate, setIsRemImmediate] = useState(false);
  const [showedSummaryDate, setShowedSummaryDate] = useState<string | null>(null);

  // --- Realtime Subscription Setup ---
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('global-dashboard-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const newNotif = payload.new;

          if (newNotif.type === 'appointment' || newNotif.type === 'customer') {
            setActiveNotification(newNotif);

            // Dispatch global event for generic UI updates
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("notificationsUpdated"));
            }
          }
        }
      )
      .subscribe();

    // Fetch latest unread appointment notification on mount for persistence
    const fetchUnread = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('is_read', false)
          .eq('type', 'appointment')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setActiveNotification(data);
        }
      } catch (err) {
        console.error("Failed to fetch unread notifications on mount", err);
      }
    };
    fetchUnread();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Background Reminder Check ---
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
          setRemMinutesLeft(0);
          setIsRemImmediate(true);
          setReminderAppt(apt);
          break;
        }

        // 1 Hour Reminder
        if (diffMins >= 55 && diffMins <= 65 && !remindedIds.has(`${apt.id}-1h`)) {
          remindedIds.add(`${apt.id}-1h`);
          setRemMinutesLeft(diffMins);
          setIsRemImmediate(false);
          setReminderAppt(apt);
          break;
        }

        // 20 Minute Reminder
        if (diffMins >= 15 && diffMins <= 25 && !remindedIds.has(`${apt.id}-20m`)) {
          remindedIds.add(`${apt.id}-20m`);
          setRemMinutesLeft(diffMins);
          setIsRemImmediate(false);
          setReminderAppt(apt);
          break;
        }
      }

      // 2. DAILY SUMMARY LOGIC (Check after 6 PM)
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
    } catch {
      // Silently fail in background
    }
  }, [showedSummaryDate]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  // --- Post-Login Redirect Handler (viewApt query param) ---
  useEffect(() => {
    const aptId = searchParams.get("viewApt");
    if (aptId) {
      const loadApt = async () => {
        try {
          const detailedApt = await Appointments.getById(aptId);
          if (detailedApt) {
            setDetailedAppointment(detailedApt);
            setShowDetails(true);

            // Clean up the URL
            const url = new URL(window.location.href);
            url.searchParams.delete("viewApt");
            router.replace(url.pathname + url.search);
          }
        } catch (err) {
          console.error("Failed to fetch pending appointment", err);
        }
      };
      loadApt();
    }
  }, [searchParams, router]);


  // --- Action Handlers (Appointments) ---
  const handleViewAppointmentDetails = async () => {
    if (!activeNotification?.message) return;
    const aptId = activeNotification.message.replace('ID:', '');
    if (!aptId) return;

    // Check if user is logged in
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Store intent and redirect to login
      localStorage.setItem("pending_appointment_id", aptId);
      router.push("/login?showForm=true");
      setActiveNotification(null);
      return;
    }

    try {
      const detailedApt = await Appointments.getById(aptId);
      if (detailedApt) {
        setDetailedAppointment(detailedApt);
        setShowDetails(true);
      }
    } catch (err) {
      console.error("Failed to fetch appointment details", err);
    }
  };

  const handleApproveAppointment = async () => {
    if (!detailedAppointment?.id) return;
    if (!detailedAppointment.customers?.email) {
      alert("Error: Customer email is missing. Required for confirmation email.");
      return;
    }
    setShowApprovalConfirm(true);
  };

  const confirmApproval = async () => {
    if (!detailedAppointment?.id) return;
    setIsProcessing(true);
    try {
      // 1. Update Database Status
      await Appointments.update(detailedAppointment.id, { status: 'Scheduled' });

      // 2. Generate PayMongo Link
      let checkoutUrl = "";
      try {
        const checkoutRes = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: detailedAppointment.id,
            amount: detailedAppointment.price,
            serviceName: detailedAppointment.service_name,
            customerName: detailedAppointment.customer_name,
            email: detailedAppointment.customers?.email,
            phone: detailedAppointment.customers?.phone
          })
        });
        if (checkoutRes.ok) {
          const checkoutData = await checkoutRes.json();
          checkoutUrl = checkoutData.checkout_url;
        }
      } catch (err) {
        console.error("PayMongo generation failed", err);
      }

      // 3. Trigger Email API
      const response = await fetch('/api/appointment-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: detailedAppointment.customers?.email,
          customerName: detailedAppointment.customer_name,
          date: detailedAppointment.appointment_date,
          time: formatAMPM(detailedAppointment.appointment_time || ""),
          service: detailedAppointment.service_name,
          price: detailedAppointment.price,
          staff: detailedAppointment.staff_name || detailedAppointment.staff?.name || "Professional",
          checkoutUrl: checkoutUrl
        })
      });

      if (!response.ok) throw new Error("Email sending failed");

      // 4. Mark Notification as Read in DB
      if (activeNotification?.id) {
        await NotificationsDB.markRead(activeNotification.id);
      }

      window.dispatchEvent(new Event("notificationsUpdated"));
      window.dispatchEvent(new Event("appointmentsUpdated"));
      setShowApprovalConfirm(false);
      setActiveNotification(null);
      setShowDetails(false);
      alert(checkoutUrl 
        ? "Success: Appointment approved, PayMongo link generated, and email sent."
        : "Success: Appointment approved and email sent (PayMongo link failed).");
    } catch (err) {
      console.error("Approval error:", err);
      alert("Database updated, but email service failed. Please check logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (!detailedAppointment?.id) return;
    if (!detailedAppointment.customers?.email) {
      alert("Error: Customer email is missing. Required for rejection email.");
      return;
    }
    setShowRejectConfirm(true);
  };

  const confirmRejection = async () => {
    if (!detailedAppointment?.id) return;
    setIsProcessing(true);
    try {
      await Appointments.update(detailedAppointment.id, { status: 'Cancelled' });

      await fetch('/api/appointment-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: detailedAppointment.customers?.email,
          customerName: detailedAppointment.customer_name,
          date: detailedAppointment.appointment_date,
          time: formatAMPM(detailedAppointment.appointment_time || ""),
          service: detailedAppointment.service_name,
          reason: rejectionReason
        })
      });

      // Mark Notification as Read in DB
      if (activeNotification?.id) {
        await NotificationsDB.markRead(activeNotification.id);
      }

      window.dispatchEvent(new Event("notificationsUpdated"));
      window.dispatchEvent(new Event("appointmentsUpdated"));
      setShowRejectConfirm(false);
      setRejectionReason("");
      setIsAddingReason(false);
      setActiveNotification(null);
      setShowDetails(false);
      alert("Appointment rejected and customer notified.");
    } catch (err) {
      console.error("Rejection error:", err);
      alert("Failed to complete rejection flow.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI Helpers ---
  const getCustomerName = () => {
    if (!activeNotification?.title) return "Valued Customer";
    return activeNotification.title.replace('New Appointment from ', '');
  };

  // --- Rendering Logic ---

  // 1. Daily Summary (Priority Over reminders)
  if (dailySummary) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-pink-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-pink-400 to-amber-400" />
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Daily Summary</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Performance Update</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Revenue</p>
                <p className="text-2xl font-black text-gray-900">₱{dailySummary.revenue.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">New Clients</p>
                <p className="text-2xl font-black text-gray-900">{dailySummary.newCustomers}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Completed</span>
                <span className="font-black text-gray-900">{dailySummary.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Pending</span>
                <span className="font-black text-gray-900">{dailySummary.pending}</span>
              </div>
              <div className="flex justify-between items-center text-rose-500">
                <span className="font-bold">Cancelled</span>
                <span className="font-black">{dailySummary.cancelled}</span>
              </div>
            </div>

            <button
              onClick={() => setDailySummary(null)}
              className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black hover:bg-black transition-all shadow-lg active:scale-95"
            >
              Close Summary
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Appointment Reminders
  if (reminderAppt) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-pink-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="h-2 w-full bg-gradient-to-r from-pink-400 to-pink-600" />
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0">
                <Bell className="w-7 h-7 text-pink-500 animate-bounce" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {isRemImmediate ? 'Starting Now!' : 'Upcoming Visit'}
                </h3>
                <p className="text-sm font-bold text-pink-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
                  {isRemImmediate ? 'Active Session' : `In ~${remMinutesLeft} Minutes`}
                </p>
              </div>
            </div>

            <div className="bg-pink-50/50 border border-pink-100/50 rounded-3xl p-6 space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Client</span>
                  <span className="text-base font-bold text-gray-800">{reminderAppt.customers?.name || reminderAppt.customer_name || 'Walk-in'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Scissors className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Service</span>
                  <span className="text-base font-bold text-gray-800">{reminderAppt.services?.name || reminderAppt.service_name || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Scheduled Time</span>
                  <span className="text-base font-bold text-gray-800">{formatAMPM(reminderAppt.appointment_time || "N/A")}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setReminderAppt(null)}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-100 text-gray-400 font-bold hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95"
              >
                Dismiss
              </button>
              <button
                onClick={() => { setReminderAppt(null); router.push("/appointment"); }}
                className="flex-[2] py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. New Appointment Alert / Message Alert
  if (activeNotification) {
    const isAppointment = activeNotification.type === 'appointment';

    return (
      <>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1.5px] overflow-hidden rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.25),0_0_60px_rgba(255,51,153,0.15)] group">
            {/* Animated Magic Border */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-70" />

            <div className="bg-white rounded-[2.4rem] w-[440px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

              <button onClick={() => setActiveNotification(null)} className="absolute top-6 right-8 text-gray-300 hover:text-gray-900 transition-colors z-20">
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${isAppointment ? 'bg-rose-50 border-rose-100' : 'bg-pink-50 border-pink-100'}`}>
                    {isAppointment ? <Calendar className="w-8 h-8 text-rose-500" /> : <Mail className="w-8 h-8 text-pink-500" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                      {isAppointment ? 'New Appointment' : 'Client Message'}
                    </h3>
                    <p className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em] mb-0.5">Notification Alert</p>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-xl font-black text-gray-900 mb-2 px-4 leading-tight">
                    {isAppointment ? getCustomerName() : (activeNotification.title?.split(' from ')[1] || 'Guest Client')}
                  </h4>

                  <p className="text-gray-400 font-medium mb-10 px-8 leading-relaxed text-sm">
                    {isAppointment
                      ? "A new booking request requires your attention and confirmation."
                      : (activeNotification.title?.replace('New Message: ', '').split(' from ')[0] || "You have a new direct inquiry from a client.")}
                  </p>

                  <button
                    onClick={isAppointment ? handleViewAppointmentDetails : () => { router.push('/notifications'); setActiveNotification(null); }}
                    className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-sm transition-all shadow-xl hover:bg-black active:scale-[0.98]"
                  >
                    {isAppointment ? "View Details & Approve" : "Read Inquiry"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Sub-Modals (Details, Approval, Rejection) */}
        {showDetails && detailedAppointment && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500">
              <div className="h-2 w-full bg-gradient-to-r from-rose-400 via-pink-500 to-rose-600" />

              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Booking Confirmation</span>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{detailedAppointment.customer_name}</h2>
                  </div>
                  <button onClick={() => setShowDetails(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <X className="w-7 h-7 text-gray-300" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                        <Calendar className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</p>
                        <p className="text-sm font-black text-gray-800">{detailedAppointment.appointment_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                        <Clock className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</p>
                        <p className="text-sm font-black text-gray-800">{formatAMPM(detailedAppointment.appointment_time || "")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                        <Scissors className="w-5 h-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service</p>
                        <p className="text-sm font-black text-gray-800 truncate max-w-[120px]">{detailedAppointment.service_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100 font-black text-pink-500">₱</div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price</p>
                        <p className="text-sm font-black text-gray-800">₱{Number(detailedAppointment.price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-10 px-8 py-5 rounded-2xl bg-pink-50/50 border border-pink-100/50 italic text-sm text-gray-600">
                  "{detailedAppointment.notes || "No special instructions provided."}"
                </div>

                <div className="flex gap-4">
                  <button onClick={handleRejectAppointment} className="flex-1 py-4 rounded-2xl border-2 border-rose-100 text-rose-500 font-black tracking-wide hover:bg-rose-50 active:scale-95 transition-all">Reject</button>
                  <button onClick={handleApproveAppointment} className="flex-[2] py-4 rounded-2xl bg-gray-900 text-white font-black tracking-wide shadow-xl hover:bg-black active:scale-95 transition-all">Approve Booking</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmations */}
        {showApprovalConfirm && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-[400px] p-10 text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 border border-emerald-100">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Send Confirmation?</h3>
              <p className="text-gray-400 font-medium text-sm leading-relaxed mb-10 px-4">
                We'll notify <span className="text-gray-900 font-bold">{detailedAppointment?.customers?.email}</span> that their visit is scheduled.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  disabled={isProcessing}
                  onClick={confirmApproval}
                  className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black shadow-xl hover:bg-black disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Yes, Send Email"}
                </button>
                <button onClick={() => setShowApprovalConfirm(false)} className="w-full py-4 rounded-2xl text-gray-400 font-black hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showRejectConfirm && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-[400px] p-10 text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-8 border border-rose-100">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">State Reason</h3>
              <p className="text-gray-400 font-medium text-sm leading-relaxed mb-6">
                Tell <span className="text-gray-900 font-bold">{detailedAppointment?.customer_name}</span> why we can't accept this booking.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason (Optional)..."
                className="w-full h-24 p-5 rounded-2xl bg-gray-50 border-gray-100 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none mb-8"
                autoFocus
              />
              <div className="flex flex-col gap-3">
                <button
                  disabled={isProcessing}
                  onClick={confirmRejection}
                  className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black shadow-xl hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm Rejection"}
                </button>
                <button onClick={() => { setShowRejectConfirm(false); setRejectionReason(""); }} className="w-full py-4 rounded-2xl text-gray-400 font-black hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
