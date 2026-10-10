"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  Calendar, X, Clock, User, Scissors, XCircle, Info, Mail,
  Bell, TrendingUp, Check, AlertTriangle, PhoneCall, UserCheck
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Appointments, Customers, NotificationsDB, type Appointment } from "@/lib/db";
import { addNotification } from "@/lib/notifications";

// Types for Reminder Summary
interface SummaryData {
  cancelled: number;
  completed: number;
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

const AUTH_ROUTES = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/update-password"];

export default function GlobalNotificationProvider() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((route) => pathname?.startsWith(route));

  // --- Notification State (Alerts/Messages) ---
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [detailedAppointment, setDetailedAppointment] = useState<Appointment | null>(null);

  // Modal Control State
  const [showDetails, setShowDetails] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error',
    title: "",
    message: ""
  });

  const showStatus = (type: 'success' | 'error', title: string, message: string) => {
    setStatusModal({ isOpen: true, type, title, message });
  };

  // --- Reminder State ---
  const [reminderAppt, setReminderAppt] = useState<Appointment | null>(null);
  const [dailySummary, setDailySummary] = useState<SummaryData | null>(null);
  const [remMinutesLeft, setRemMinutesLeft] = useState(0);
  const [isRemImmediate, setIsRemImmediate] = useState(false);
  const [showedSummaryDate, setShowedSummaryDate] = useState<string | null>(null);

  // --- Late & No-Show Alert System State ---
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [minimizedLateIds, setMinimizedLateIds] = useState<Set<string>>(new Set());
  const [acknowledgedNoShowIds, setAcknowledgedNoShowIds] = useState<Set<string>>(new Set());
  const [cancelledConfirmAppt, setCancelledConfirmAppt] = useState<Appointment | null>(null);
  const [phoneNoticeMsg, setPhoneNoticeMsg] = useState<string | null>(null);

  // Fetch appointments list
  const loadAppointmentsList = useCallback(async () => {
    if (isAuthPage) return;
    try {
      const data = await Appointments.list();
      setAppointmentsList(data);
    } catch (err) {
      console.error("Failed to fetch appointments in GlobalNotificationProvider:", err);
    }
  }, [isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;
    loadAppointmentsList();

    const handleAptsUpdated = () => loadAppointmentsList();
    window.addEventListener("appointmentsUpdated", handleAptsUpdated);

    // 1-second ticker for live countdown and exact second updates
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener("appointmentsUpdated", handleAptsUpdated);
      clearInterval(timer);
    };
  }, [loadAppointmentsList, isAuthPage]);

  // Helper function to parse scheduled timestamp cleanly
  const getScheduledTimestamp = (apt: Appointment): number | null => {
    const dateVal = apt.appointment_date;
    if (!dateVal) return null;

    let year: number, month: number, day: number;
    if (typeof dateVal === "string" && dateVal.includes("-")) {
      const cleanDate = dateVal.split("T")[0];
      const parts = cleanDate.split("-");
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    } else {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }

    let hours = 0;
    let minutes = 0;
    const timeVal = apt.appointment_time;

    if (timeVal) {
      const match = timeVal.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
      }
    }

    return new Date(year, month, day, hours, minutes, 0, 0).getTime();
  };

  // Evaluate late & no-show logic for DB status updates
  useEffect(() => {
    if (isAuthPage || appointmentsList.length === 0) return;
    const nowMs = currentTime.getTime();

    for (const apt of appointmentsList) {
      if (!apt.id) continue;
      // If already started, completed, cancelled, or no_show, skip DB update
      if (
        apt.status === "Completed" ||
        apt.status === "Cancelled" ||
        apt.status === "In Progress" ||
        apt.status === "no_show" ||
        apt.status === "No-Show"
      ) {
        continue;
      }

      const scheduledTs = getScheduledTimestamp(apt);
      if (!scheduledTs) continue;

      const diffSecs = Math.floor((nowMs - scheduledTs) / 1000);

      // If 30 minutes (1800s) or more have elapsed since scheduled start time:
      if (diffSecs >= 1800) {
        // Update DB status to 'no_show'
        Appointments.update(apt.id, { status: "no_show" })
          .then(() => {
            addNotification(
              "Customer No-Show",
              `${apt.customer_name || apt.customers?.name || "Customer"} did not arrive for scheduled appointment. Status updated to No-Show.`,
              "appointment"
            );
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("appointmentsUpdated"));
            }
          })
          .catch((err) => console.error("Failed to auto-update appointment to no_show:", err));
      }
    }
  }, [currentTime, appointmentsList, isAuthPage]);

  // Derived active late & no-show lists
  const nowMs = currentTime.getTime();

  const lateAppts = appointmentsList.filter((apt) => {
    if (!apt.id) return false;
    if (
      apt.status === "Completed" ||
      apt.status === "Cancelled" ||
      apt.status === "In Progress" ||
      apt.status === "no_show" ||
      apt.status === "No-Show"
    ) {
      return false;
    }
    const scheduledTs = getScheduledTimestamp(apt);
    if (!scheduledTs) return false;
    const diffSecs = Math.floor((nowMs - scheduledTs) / 1000);
    return diffSecs >= 0 && diffSecs < 1800;
  });

  const noShowAppts = appointmentsList.filter((apt) => {
    if (!apt.id) return false;
    if (acknowledgedNoShowIds.has(apt.id)) return false;

    const isNoShowStatus = apt.status === "no_show" || apt.status === "No-Show";
    if (isNoShowStatus) return true;

    if (apt.status === "Completed" || apt.status === "Cancelled" || apt.status === "In Progress") {
      return false;
    }

    const scheduledTs = getScheduledTimestamp(apt);
    if (!scheduledTs) return false;
    const diffSecs = Math.floor((nowMs - scheduledTs) / 1000);
    return diffSecs >= 1800;
  });

  const activeLateAppt = lateAppts.find((a) => a.id && !minimizedLateIds.has(a.id)) || null;
  const minimizedLateAppt = lateAppts.find((a) => a.id && minimizedLateIds.has(a.id)) || null;
  const activeNoShowAppt = noShowAppts[0] || null;

  // Calculate metrics for late appointment
  const getLateMetrics = (apt: Appointment) => {
    const scheduledTs = getScheduledTimestamp(apt);
    if (!scheduledTs) return { elapsedStr: "0m 0s", remainingStr: "30:00", remainingSecs: 1800 };
    const diffSecs = Math.max(0, Math.floor((nowMs - scheduledTs) / 1000));
    const remainingSecs = Math.max(0, 1800 - diffSecs);

    const elMins = Math.floor(diffSecs / 60);
    const elSecs = diffSecs % 60;
    const elapsedStr = `${elMins}m ${elSecs}s elapsed`;

    const remMins = Math.floor(remainingSecs / 60);
    const remSecs = remainingSecs % 60;
    const remainingStr = `${remMins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`;

    return { elapsedStr, remainingStr, remainingSecs };
  };

  // Mark customer as arrived action
  const handleMarkArrived = async (apt: Appointment) => {
    if (!apt.id) return;
    try {
      await Appointments.update(apt.id, { status: "In Progress" });
      setMinimizedLateIds((prev) => {
        const next = new Set(prev);
        if (apt.id) next.delete(apt.id);
        return next;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("appointmentsUpdated"));
      }
      showStatus(
        "success",
        "Customer Arrived",
        `${apt.customer_name || apt.customers?.name || "Customer"} marked as arrived. Appointment is now In Progress.`
      );
    } catch (err) {
      console.error("Failed to mark customer as arrived:", err);
      showStatus("error", "Status Update Failed", "Could not mark appointment as arrived. Please try again.");
    }
  };

  // Contact Customer action
  const handleContactCustomer = (apt: Appointment) => {
    const phone = apt.customers?.phone || apt.phone;
    const customerName = apt.customer_name || apt.customers?.name || "Customer";

    if (phone && phone.trim() !== "") {
      setPhoneNoticeMsg(`Contacting ${customerName} at ${phone}...`);
      window.location.href = `tel:${phone}`;
    } else {
      setPhoneNoticeMsg(`No contact number is recorded for ${customerName}.`);
    }
  };

  // Acknowledge No-Show action
  const handleAcknowledgeNoShow = async (apt: Appointment) => {
    if (!apt.id) return;
    try {
      await Appointments.update(apt.id, { status: 'Cancelled' });
      
      setAcknowledgedNoShowIds((prev) => new Set(prev).add(apt.id!));
      setPhoneNoticeMsg(null);
      setCancelledConfirmAppt(apt);
      
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("appointmentsUpdated"));
      }
    } catch (err) {
      console.error("Failed to acknowledge no-show appointment:", err);
      showStatus("error", "Update Failed", "Failed to cancel the appointment. Please try again.");
    }
  };

  // --- Realtime Subscription Setup ---
  useEffect(() => {
    if (isAuthPage) return;

    const supabase = createClient();

    console.log("Initializing Global Notification Subscription...");

    const channelName = 'global-dashboard-events-' + Math.random().toString(36).substring(7);
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("Real-time notification received via INSERT:", payload);
          const newNotif = payload.new;

          if (newNotif.type === 'appointment' || newNotif.type === 'customer') {
            if (
              newNotif.title === 'Walk-in Booking Saved' || 
              newNotif.title === 'Appointment Updated' || 
              newNotif.title === 'Status Updated' ||
              newNotif.title === 'Appointment Deleted'
            ) {
              showStatus('success', newNotif.title, newNotif.message || 'Action completed successfully');
              
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("notificationsUpdated"));
              }
              return;
            }

            setActiveNotification(newNotif);

            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("notificationsUpdated"));
            }
          }
        }
      )
      .subscribe((status: string, err?: any) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`Global Notification Subscription Status: ${status}`, err || '');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Supabase Realtime issues: ${status}. Notifications might be delayed.`);
        }
      });

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
      console.log("Cleaning up Global Notification Subscription...");
      supabase.removeChannel(channel);
    };
  }, [isAuthPage]);

  // --- Background Reminder Check ---
  const checkReminders = useCallback(async () => {
    if (isAuthPage) return;
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
        const revenue = todayApts
          .filter(a => a.status === "Completed")
          .reduce((sum, a) => sum + (a.price || 0), 0);

        const customers = await Customers.list();
        const newCustomers = customers.filter(c => {
          const cd = new Date(c.created_at || '');
          return cd.toLocaleDateString('en-CA') === dateString;
        }).length;

        setDailySummary({ cancelled, completed, revenue, newCustomers });
        setShowedSummaryDate(dateString);
      }
    } catch {
      // Silently fail in background
    }
  }, [showedSummaryDate, isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders, isAuthPage]);

  // --- Post-Login Redirect Handler (viewApt query param) ---
  useEffect(() => {
    if (isAuthPage) return;
    const aptId = searchParams.get("viewApt");
    if (aptId) {
      const loadApt = async () => {
        try {
          const detailedApt = await Appointments.getById(aptId);
          if (detailedApt) {
            setDetailedAppointment(detailedApt);
            setShowDetails(true);

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
  }, [searchParams, router, isAuthPage]);

  // --- Action Handlers (Appointments) ---
  const handleViewAppointmentDetails = async () => {
    if (!activeNotification?.message || typeof activeNotification.message !== 'string') {
      console.warn("Invalid notification message for appointment view");
      setActiveNotification(null);
      return;
    }

    if (!activeNotification.message.startsWith('ID:')) {
      setActiveNotification(null);
      return;
    }

    const aptId = activeNotification.message.replace('ID:', '').trim();
    if (!aptId) {
      setActiveNotification(null);
      return;
    }

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
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
      } else {
        showStatus('error', 'Appointment Not Found', "The details for this appointment could not be found. It may have been deleted.");
        setActiveNotification(null);
      }
    } catch (err) {
      console.error("Failed to fetch appointment details", err);
      showStatus('error', 'Fetch Error', "Something went wrong while loading appointment details.");
      setActiveNotification(null);
    }
  };

  const handleApproveAppointment = async () => {
    if (!detailedAppointment?.id) return;
    
    const isWalkIn = detailedAppointment.source === 'Walk-in';
    
    if (!isWalkIn && !detailedAppointment.customers?.email) {
      setPendingAction('approve');
      setEmailInput("");
      setShowEmailPrompt(true);
      return;
    }
    setShowApprovalConfirm(true);
  };

  const confirmApproval = async () => {
    if (!detailedAppointment?.id) return;
    setIsProcessing(true);
    try {
      await Appointments.update(detailedAppointment.id, { status: 'Scheduled' });

      let checkoutUrl = "";
      const isWalkIn = detailedAppointment.source === 'Walk-in';

      if (!isWalkIn) {
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
      }

      if (activeNotification?.id) {
        await NotificationsDB.markRead(activeNotification.id);
      }

      window.dispatchEvent(new Event("notificationsUpdated"));
      window.dispatchEvent(new Event("appointmentsUpdated"));
      setShowApprovalConfirm(false);
      setActiveNotification(null);
      setShowDetails(false);
      
      showStatus('success', 'Appointment Approved', isWalkIn
        ? "Appointment approved successfully."
        : (checkoutUrl
          ? "Appointment approved, PayMongo link generated, and email sent successfully."
          : "Appointment approved and email sent. (Payment link generation failed)."));
    } catch (err) {
      console.error("Approval error:", err);
      showStatus('error', 'Approval Error', "Database updated, but email service failed. Please check system logs.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (!detailedAppointment?.id) return;
    
    const isWalkIn = detailedAppointment.source === 'Walk-in';

    if (!isWalkIn && !detailedAppointment.customers?.email) {
      setPendingAction('reject');
      setEmailInput("");
      setShowEmailPrompt(true);
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleSaveEmail = async () => {
    if (!detailedAppointment?.customer_id || !emailInput) return;
    setIsProcessing(true);
    try {
      await Customers.update(detailedAppointment.customer_id, { email: emailInput });

      setDetailedAppointment(prev => prev ? {
        ...prev,
        customers: {
          ...prev.customers,
          name: prev.customers?.name || prev.customer_name || "Valued Customer",
          email: emailInput
        }
      } : null);

      setShowEmailPrompt(false);
      if (pendingAction === 'approve') {
        setShowApprovalConfirm(true);
      } else if (pendingAction === 'reject') {
        setShowRejectConfirm(true);
      }
    } catch (err) {
      console.error("Failed to save customer email:", err);
      showStatus('error', 'Save Error', "Failed to save customer email. Please try again.");
    } finally {
      setIsProcessing(false);
      setPendingAction(null);
    }
  };

  const confirmRejection = async () => {
    if (!detailedAppointment?.id) return;
    setIsProcessing(true);
    try {
      await Appointments.update(detailedAppointment.id, { status: 'Cancelled' });

      if (detailedAppointment.source !== 'Walk-in') {
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
      }

      if (activeNotification?.id) {
        await NotificationsDB.markRead(activeNotification.id);
      }

      window.dispatchEvent(new Event("notificationsUpdated"));
      window.dispatchEvent(new Event("appointmentsUpdated"));
      setShowRejectConfirm(false);
      setRejectionReason("");
      setActiveNotification(null);
      setShowDetails(false);
      showStatus('success', 'Appointment Rejected', detailedAppointment.source === 'Walk-in' 
        ? "The appointment has been successfully cancelled." 
        : "The appointment has been successfully cancelled and the customer notified.");
    } catch (err) {
      console.error("Rejection error:", err);
      showStatus('error', 'Rejection Error', "Failed to complete the rejection workflow. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getCustomerName = () => {
    if (!activeNotification?.title) return "Valued Customer";
    return activeNotification.title.replace('New Appointment from ', '');
  };

  if (isAuthPage) return null;

  return (
    <>
      {/* --- 1. CUSTOMER NO-SHOW MODAL --- */}
      {activeNoShowAppt && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-pink-100 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Customer No-Show</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-200 inline-block mt-0.5">
                      Grace Period Expired
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  title="Close"
                  onClick={() => {
                    if (activeNoShowAppt.id) {
                      setAcknowledgedNoShowIds((prev) => new Set(prev).add(activeNoShowAppt.id!));
                      setPhoneNoticeMsg(null);
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors -mr-1 -mt-1"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              <p className="text-xs font-medium text-gray-700 leading-relaxed mb-3.5 bg-pink-50/60 p-3.5 rounded-2xl border border-pink-100">
                <span className="font-bold text-gray-900">
                  {activeNoShowAppt.customer_name || activeNoShowAppt.customers?.name || "Customer"}
                </span>{" "}
                did not arrive for their scheduled appointment. The 30-minute grace period has expired. Kindly contact the customer using the available contact information to confirm their slot.
              </p>

              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs mb-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Customer Name</span>
                  <span className="font-bold text-gray-900">
                    {activeNoShowAppt.customer_name || activeNoShowAppt.customers?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Contact Number</span>
                  <span className="font-bold text-gray-900">
                    {activeNoShowAppt.customers?.phone || activeNoShowAppt.phone || "No contact number recorded"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Service Booked</span>
                  <span className="font-bold text-gray-900">
                    {activeNoShowAppt.service_name || activeNoShowAppt.services?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Assigned Staff</span>
                  <span className="font-bold text-gray-900">
                    {activeNoShowAppt.staff_name || activeNoShowAppt.staff?.name || "Auto-assigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Scheduled Time</span>
                  <span className="font-bold text-gray-900">
                    {activeNoShowAppt.appointment_date} at {formatAMPM(activeNoShowAppt.appointment_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60">
                  <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                    No-Show
                  </span>
                </div>
              </div>

              {phoneNoticeMsg && (
                <div className="mb-3.5 p-2.5 rounded-xl bg-pink-50 border border-pink-200 text-xs font-bold text-pink-800 text-center animate-in fade-in">
                  {phoneNoticeMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => handleContactCustomer(activeNoShowAppt)}
                  className="flex-1 py-3 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Contact Customer
                </button>
                <button
                  onClick={() => handleAcknowledgeNoShow(activeNoShowAppt)}
                  className="flex-1 py-3 rounded-full bg-gray-900 hover:bg-black text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 1B. APPOINTMENT CANCELLED CONFIRMATION MODAL --- */}
      {cancelledConfirmAppt && (
        <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl border border-pink-100 overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-7 text-center">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto mb-4 text-pink-500 shadow-sm">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
              Appointment Cancelled
            </h3>

            <p className="text-xs font-medium text-gray-600 leading-relaxed mb-6 px-2">
              Appointment for{" "}
              <span className="font-bold text-gray-900">
                {cancelledConfirmAppt.customer_name || cancelledConfirmAppt.customers?.name || "Customer"}
              </span>{" "}
              has been cancelled due to no-show.
            </p>

            <button
              onClick={() => setCancelledConfirmAppt(null)}
              className="w-full py-3 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* --- 2. CUSTOMER IS LATE MODAL --- */}
      {activeLateAppt && !activeNoShowAppt && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-amber-200 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-pink-400 to-pink-600" />
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Clock className="w-7 h-7 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Customer Is Late</h3>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">30-Minute Grace Period Active</p>
                  </div>
                </div>
                <button
                  onClick={() => activeLateAppt.id && setMinimizedLateIds((prev) => new Set(prev).add(activeLateAppt.id!))}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  title="Minimize Alert"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm font-medium text-gray-600 leading-relaxed mb-6 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                <span className="font-bold text-gray-900">
                  {activeLateAppt.customer_name || activeLateAppt.customers?.name || "Customer"}
                </span>{" "}
                has not arrived for their scheduled appointment.
              </p>

              {/* Countdown Display Box */}
              {(() => {
                const { elapsedStr, remainingStr } = getLateMetrics(activeLateAppt);
                return (
                  <div className="mb-6 bg-gradient-to-br from-amber-50 to-pink-50 border border-amber-200 rounded-3xl p-6 text-center shadow-inner">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 block mb-1">
                      Remaining Grace Period
                    </span>
                    <div className="text-5xl font-black font-mono text-gray-900 tracking-wider my-1">
                      {remainingStr}
                    </div>
                    <span className="text-xs font-semibold text-gray-500 block">
                      {elapsedStr}
                    </span>
                  </div>
                );
              })()}

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Customer Name</span>
                  <span className="font-bold text-gray-900">
                    {activeLateAppt.customer_name || activeLateAppt.customers?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Contact Number</span>
                  <span className="font-bold text-gray-900">
                    {activeLateAppt.customers?.phone || activeLateAppt.phone || "No contact number recorded"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Service Booked</span>
                  <span className="font-bold text-gray-900">
                    {activeLateAppt.service_name || activeLateAppt.services?.name || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Assigned Staff</span>
                  <span className="font-bold text-gray-900">
                    {activeLateAppt.staff_name || activeLateAppt.staff?.name || "Auto-assigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Scheduled Time</span>
                  <span className="font-bold text-gray-900">
                    {activeLateAppt.appointment_date} at {formatAMPM(activeLateAppt.appointment_time)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleMarkArrived(activeLateAppt)}
                  className="flex-1 py-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <UserCheck className="w-5 h-5" />
                  Mark Customer as Arrived
                </button>
                <button
                  onClick={() => activeLateAppt.id && setMinimizedLateIds((prev) => new Set(prev).add(activeLateAppt.id!))}
                  className="py-4 px-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm transition-all active:scale-95 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. FLOATING GRACE-PERIOD BANNER (WHEN MINIMIZED) --- */}
      {minimizedLateAppt && !activeLateAppt && !activeNoShowAppt && (
        <div className="fixed bottom-6 right-6 z-[11000] animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 p-4 flex items-center gap-4 max-w-md">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                Customer Is Late: {minimizedLateAppt.customer_name || minimizedLateAppt.customers?.name || "Customer"}
              </p>
              <p className="text-[11px] font-mono font-bold text-amber-600">
                Grace: {getLateMetrics(minimizedLateAppt).remainingStr} remaining
              </p>
            </div>
            <button
              onClick={() => minimizedLateAppt.id && setMinimizedLateIds((prev) => {
                const next = new Set(prev);
                next.delete(minimizedLateAppt.id!);
                return next;
              })}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              View Alert
            </button>
          </div>
        </div>
      )}

      {/* 4. Daily Summary */}
      {dailySummary && !activeNoShowAppt && !activeLateAppt && (
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

                <div className="flex justify-between items-center text-rose-500">
                  <span className="font-bold">Cancelled</span>
                  <span className="font-black">{dailySummary.cancelled}</span>
                </div>
              </div>

              <button
                onClick={() => setDailySummary(null)}
                className="w-full py-4 rounded-full bg-gray-900 text-white font-black hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Appointment Reminders */}
      {reminderAppt && !activeNoShowAppt && !activeLateAppt && (
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
                  className="flex-1 py-4 rounded-full border-2 border-gray-100 text-gray-400 font-bold hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => { setReminderAppt(null); router.push("/appointment"); }}
                  className="flex-[2] py-4 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-black shadow-lg shadow-pink-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  View Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. New Appointment Alert / Message Alert */}
      {activeNotification && !activeNoShowAppt && !activeLateAppt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1px] overflow-hidden rounded-3xl shadow-2xl group">
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_6s_linear_infinite] opacity-40" />

            <div className="bg-white rounded-[1.4rem] w-[440px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

              <button aria-label="Close modal" onClick={() => setActiveNotification(null)} className="absolute top-6 right-8 text-gray-300 hover:text-gray-900 transition-colors z-20">
                <X className="w-6 h-6 stroke-[1.5]" />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${activeNotification.type === 'appointment' ? 'bg-rose-50 border-rose-100' : 'bg-pink-50 border-pink-100'}`}>
                    {activeNotification.type === 'appointment' ? <Calendar className="w-8 h-8 text-rose-500" /> : <Mail className="w-8 h-8 text-pink-500" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-normal text-gray-900 tracking-tight">
                      {activeNotification.title || (activeNotification.type === 'appointment' ? 'New Appointment' : 'Client Message')}
                    </h3>
                    <p className="text-[10px] font-bold text-brand-pink uppercase tracking-[0.2em] mb-0.5">Notification Alert</p>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-xl font-normal text-brand-pink mb-4 px-4 leading-tight">
                    {activeNotification.type === 'appointment' ? getCustomerName() : (activeNotification.title?.split(' from ')[1] || 'Guest Client')}
                  </h4>

                  <p className="text-gray-400 font-normal mb-10 px-8 leading-relaxed text-sm">
                    {activeNotification.message && !activeNotification.message.startsWith('ID:') 
                      ? activeNotification.message 
                      : (activeNotification.type === 'appointment' 
                          ? "A new booking request requires your attention and confirmation."
                          : (activeNotification.title?.replace('New Message: ', '').split(' from ')[0] || "You have a new direct inquiry from a client."))}
                  </p>

                  <button
                    onClick={activeNotification.type === 'appointment' ? handleViewAppointmentDetails : () => { router.push('/notifications'); setActiveNotification(null); }}
                    className="w-full py-4 rounded-full bg-brand-pink text-white font-medium text-sm transition-all shadow-xl hover:opacity-90 active:scale-[0.98]"
                  >
                    {activeNotification.type === 'appointment' ? "View booking details" : "Read Inquiry"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Sub-Modals (Details, Approval, Rejection) */}
      {showDetails && detailedAppointment && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[1.4rem] w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

            <button aria-label="Close modal" onClick={() => setShowDetails(false)} className="absolute top-6 right-8 text-gray-300 hover:text-gray-900 transition-colors z-20">
              <X className="w-6 h-6 stroke-[1.5]" />
            </button>

            <div className="p-10 pb-8">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-rose-100 bg-rose-50 shadow-inner">
                  <Calendar className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-normal text-gray-900 tracking-tight">
                    {detailedAppointment.customer_name}
                  </h3>
                  <p className="text-[10px] font-bold text-brand-pink uppercase tracking-[0.2em] mb-0.5">Booking Confirmation</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                      <Calendar className="w-5 h-5 text-brand-pink" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Date</p>
                      <p className="text-sm font-normal text-gray-800">{detailedAppointment.appointment_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                      <Clock className="w-5 h-5 text-brand-pink" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Time</p>
                      <p className="text-sm font-normal text-gray-800">{formatAMPM(detailedAppointment.appointment_time || "")}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                      <Scissors className="w-5 h-5 text-brand-pink" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Service</p>
                      <p className="text-sm font-normal text-gray-800 break-words leading-tight">{detailedAppointment.service_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-gray-100 font-bold text-brand-pink">₱</div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Price</p>
                      <p className="text-sm font-normal text-gray-800">₱{Number(detailedAppointment.price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-2">Customer Notes</span>
                <div className="px-6 py-5 rounded-2xl bg-pink-50/50 border border-pink-100/50 italic text-sm text-gray-600">
                  "{detailedAppointment.notes || "No special instructions provided."}"
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Action Confirmations */}
      {showApprovalConfirm && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 border border-emerald-100">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-4 tracking-tight">Send Confirmation?</h3>
            <p className="text-gray-400 font-normal text-sm leading-relaxed mb-10 px-8">
              We'll notify <span className="text-gray-900 font-bold">{detailedAppointment?.customers?.email}</span> that their visit is scheduled.
            </p>
            <div className="flex flex-col gap-3">
              <button
                disabled={isProcessing}
                onClick={confirmApproval}
                className="w-full py-4 rounded-full bg-brand-pink text-white font-medium shadow-xl shadow-pink-100 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
              >
                {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Yes, Send Email"}
              </button>
              <button onClick={() => setShowApprovalConfirm(false)} className="w-full py-4 rounded-full text-gray-400 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showRejectConfirm && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 sm:p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-500">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6 border border-rose-100">
              <XCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-3 tracking-tight">State Reason</h3>
            <p className="text-gray-400 font-normal text-xs leading-relaxed mb-6 px-4">
              Tell <span className="text-gray-900 font-bold">{detailedAppointment?.customer_name}</span> why we can't accept this booking.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Staff not available, or slot unavailable..."
              className="w-full h-24 p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs focus:ring-2 focus:ring-pink-500/20 focus:border-brand-pink transition-all resize-none mb-6"
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <button
                disabled={isProcessing}
                onClick={confirmRejection}
                className="w-full py-3 rounded-full bg-brand-pink text-white text-sm font-medium shadow-lg shadow-pink-100 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm Rejection"}
              </button>
              <button onClick={() => { setShowRejectConfirm(false); setRejectionReason(""); }} className="w-full py-3 rounded-full text-gray-400 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Prompt Modal (for walk-ins missing email) */}
      {showEmailPrompt && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-500 border border-pink-100">
            <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-8 border border-pink-100">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-4 tracking-tight">Email Required</h3>
            <p className="text-gray-400 font-normal text-sm leading-relaxed mb-8 px-4">
              This client is a walk-in. Please provide their email to send the confirmation.
            </p>
            
            <div className="relative mb-8">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-pink-300" />
              </div>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter customer email (Gmail)..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 border border-pink-100 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none font-medium"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={isProcessing || !emailInput || !emailInput.includes('@')}
                onClick={handleSaveEmail}
                className="w-full py-4 rounded-full bg-pink-500 text-white font-bold shadow-xl shadow-pink-100 hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
              >
                {isProcessing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Email"}
              </button>
              <button 
                onClick={() => { setShowEmailPrompt(false); setPendingAction(null); }} 
                className="w-full py-4 rounded-full text-gray-400 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Status Modal (Replaces browser alerts) */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-[15000] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-500 border border-gray-100">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 border ${
              statusModal.type === 'success' 
                ? 'bg-pink-50 text-pink-500 border-pink-100' 
                : 'bg-rose-50 text-rose-500 border-rose-100'
            }`}>
              {statusModal.type === 'success' ? <Check className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
            
            <h3 className="text-2xl font-light text-gray-900 mb-3 tracking-tight">
              {statusModal.title}
            </h3>
            
            <p className="text-gray-400 font-normal text-sm leading-relaxed mb-10 px-4">
              {statusModal.message}
            </p>

            <button
              onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              className={`w-full py-4 rounded-full font-bold shadow-xl transition-all active:scale-95 ${
                statusModal.type === 'success'
                  ? 'bg-brand-pink text-white shadow-pink-100 hover:opacity-90'
                  : 'bg-rose-500 text-white shadow-rose-100 hover:bg-rose-600'
              }`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
