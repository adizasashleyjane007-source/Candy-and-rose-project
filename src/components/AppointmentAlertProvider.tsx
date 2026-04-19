"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, X, Clock, User, Scissors, XCircle, Info } from "lucide-react";
import { Appointments, type Appointment } from "@/lib/db";


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

export default function AppointmentAlertProvider() {
  const [notification, setNotification] = useState<any>(null);
  const [appointmentDetails, setAppointmentDetails] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [isAddingReason, setIsAddingReason] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSendingRejection, setIsSendingRejection] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    console.log("DEBUG: AppointmentAlertProvider subscribing to notifications...");

    // Subscribe to INSERT on notifications table where type=appointment
    const channel = supabase
      .channel('appointment-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log("DEBUG: Received notification payload:", payload);
          if (payload.new?.type !== 'appointment') return;

          setNotification(payload.new);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("notificationsUpdated"));
          }
        }
      )
      .subscribe((status) => {
        console.log(`DEBUG: AppointmentAlertProvider subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log("DEBUG: Successfully subscribed to appointment alerts!");
        }
      });

    return () => {
      console.log("DEBUG: Cleaning up AppointmentAlertProvider subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewDetails = async () => {
    if (!notification?.message) return;

    const aptId = notification.message.replace('ID:', '');
    if (!aptId) return;

    try {
      const detailedApt = await Appointments.getById(aptId);
      console.log("DEBUG: detailedApt fetched:", detailedApt);
      if (detailedApt) {
        setAppointmentDetails(detailedApt);
        setShowDetails(true);
      }
    } catch (err) {
      console.error("Failed to fetch appointment details", err);
    }
  };

  const handleRejectAppointment = async () => {
    if (!appointmentDetails?.id) return;

    const customerEmail = appointmentDetails.customers?.email;
    if (!customerEmail) {
      alert("Error: Customer email is missing. Rejection requires an email to notify the customer.");
      return;
    }

    setShowRejectConfirm(true);
  };

  const handleFinalReject = async () => {
    if (!appointmentDetails?.id) return;

    setIsSendingRejection(true);
    try {
      // 1. Update DB Status to Cancelled
      await Appointments.update(appointmentDetails.id, { status: 'Cancelled' });

      // 2. Call our API to send the rejection email
      const response = await fetch('/api/appointment-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: appointmentDetails.customers?.email,
          customerName: appointmentDetails.customer_name,
          date: appointmentDetails.appointment_date,
          time: formatAMPM(appointmentDetails.appointment_time || ""),
          service: appointmentDetails.service_name,
          reason: rejectionReason
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send rejection email through API");
      }

      // 3. Cleanup and Success Feedback
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("appointmentsUpdated"));
      }

      setShowRejectConfirm(false);
      setRejectionReason("");
      setIsAddingReason(false);
      setNotification(null);
      setShowDetails(false);

      alert("Appointment has been rejected and cancellation email sent.");

    } catch (err) {
      console.error("Failed to finalize rejection", err);
      alert("Status updated, but there was an issue sending the email. Please check your configuration.");
    } finally {
      setIsSendingRejection(false);
    }
  };

  const handleApproveAppointment = async () => {
    if (!appointmentDetails?.id) return;

    const customerEmail = appointmentDetails.customers?.email;
    if (!customerEmail) {
      alert("Error: Customer email is missing. Please update the customer profile before approving to send the confirmation email.");
      return;
    }

    // Open the confirmation modal instead of immediate approval
    setShowApprovalConfirm(true);
  };

  const handleFinalSend = async () => {
    if (!appointmentDetails?.id) return;

    setIsSendingEmail(true);
    try {
      // 1. Update DB Status to Scheduled
      await Appointments.update(appointmentDetails.id, { status: 'Scheduled' });

      // 2. Call our API to send the official confirmation email
      const response = await fetch('/api/appointment-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: appointmentDetails.customers?.email,
          customerName: appointmentDetails.customer_name,
          date: appointmentDetails.appointment_date,
          time: formatAMPM(appointmentDetails.appointment_time || ""),
          service: appointmentDetails.service_name,
          price: appointmentDetails.price,
          staff: appointmentDetails.staff_name || appointmentDetails.staff?.name || "Assigned Professional"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send email through API");
      }

      // 3. Cleanup and Success Feedback
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("appointmentsUpdated"));
      }

      setShowApprovalConfirm(false);
      setNotification(null);
      setShowDetails(false);

      // Success Toast-like feedback
      alert("Success! Appointment approved and confirmation email sent to the customer.");

    } catch (err) {
      console.error("Failed to finalize approval", err);
      alert("Status updated, but there was an issue sending the email. Please check your Resend configuration.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Helper to extract customer name from notification title
  const getCustomerName = () => {
    if (!notification?.title) return "Valued Customer";
    // Usually "New Appointment from [Name]"
    const name = notification.title.replace('New Appointment from ', '');
    return name || "Valued Customer";
  };

  if (!notification) return null;

  return (
    <>
      {/* Main Alert Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="relative p-[1.5px] overflow-hidden rounded-[20px] shadow-[0_32px_128px_rgba(0,0,0,0.15),0_0_60px_rgba(255,51,153,0.1)] group">
          {/* Magic Border Animation */}
          <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-60" />

          <div className="bg-white rounded-[19px] w-[420px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
            {/* Top glow accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

            <button
              onClick={() => setNotification(null)}
              className="absolute top-4 right-5 text-slate-400 hover:text-slate-900 transition-colors z-20"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>

            <div className="p-8 pt-6">
              {/* Header Row: Professional Left-aligned Icon and Title */}
              <div className="flex items-center justify-start gap-4 mb-10">
                <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center border border-pink-100 shadow-inner">
                  <Calendar className="w-6 h-6 text-pink-500 stroke-[1.5]" />
                </div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">New Appointment</span>
              </div>

              <div className="text-center flex flex-col items-center">
                <h2 className="text-xl font-bold text-slate-900 leading-tight mb-2 px-2">
                  {getCustomerName()}
                </h2>

                <p className="text-slate-500 font-light mb-10 px-6 leading-relaxed text-sm">
                  A new appointment request has arrived and is waiting for your approval.
                </p>

                <div className="w-full">
                  <button
                    onClick={handleViewDetails}
                    className="w-full py-3.5 rounded-full bg-[#FF3399] text-white font-bold text-sm transition-all shadow-[0_10px_20px_rgba(255,51,153,0.2)] hover:shadow-[0_15px_30px_rgba(255,51,153,0.3)] active:scale-[0.98]"
                  >
                    View Booking Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Details Modal */}
      {showDetails && appointmentDetails && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1.5px] overflow-hidden rounded-[20px] shadow-[0_32px_128px_rgba(0,0,0,0.15),0_0_60px_rgba(255,51,153,0.1)]">
            {/* Magic Border Animation */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-60" />

            <div className="bg-white rounded-[19px] w-[520px] h-auto min-h-[460px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              {/* Soft pink top glow */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

              <div className="px-10 py-10 flex flex-col h-full">
                {/* Header: Name & Status */}
                <div className="flex justify-between items-start mb-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.3em] mb-3">Appointment Details</span>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                      {appointmentDetails.customer_name || "N/A"}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-pink-50 text-[#FF3399] rounded-full text-[10px] font-bold tracking-widest uppercase border border-pink-100 shadow-[0_4px_10px_rgba(255,51,153,0.1)]">
                      {appointmentDetails.status}
                    </span>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="text-slate-400 hover:text-slate-900 transition-colors ml-2"
                    >
                      <X className="w-6 h-6 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                {/* Grid: 2 Columns */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-10">
                  {/* Column 1: Date & Time */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                        <Calendar className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Date</span>
                        <span className="text-sm font-bold text-slate-800 leading-none">{appointmentDetails.appointment_date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                        <Clock className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Time</span>
                        <span className="text-sm font-bold text-slate-800 leading-none">{formatAMPM(appointmentDetails.appointment_time)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Service & Price */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                        <Scissors className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Service</span>
                        <span className="text-sm font-bold text-slate-800 leading-none truncate max-w-[140px]">{appointmentDetails.service_name || "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                        <div className="text-xs font-bold text-pink-500">₱</div>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Total Price</span>
                        <span className="text-sm font-bold text-slate-800 leading-none">₱{Number(appointmentDetails.price || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Note Section */}
                <div className="mb-10 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] block mb-3">Customer Note</span>
                  <p className="text-sm font-normal text-slate-600 leading-relaxed italic">
                    "{appointmentDetails.notes || "No special instructions provided for this appointment."}"
                  </p>
                </div>

                {/* Action Buttons: Always Fixed Colors */}
                <div className="mt-auto flex gap-6">
                  <button
                    onClick={handleApproveAppointment}
                    disabled={isApproving}
                    className="flex-1 py-4 rounded-full bg-[#FF3399] text-white font-bold text-sm transition-all shadow-[0_10px_25px_rgba(255,51,153,0.3)] hover:shadow-[0_15px_35px_rgba(255,51,153,0.45)] hover:bg-[#FF3399]/90 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={handleRejectAppointment}
                    className="flex-1 py-4 rounded-full bg-red-600 text-white font-bold text-sm transition-all shadow-[0_10px_25px_rgba(220,38,38,0.2)] hover:shadow-[0_15px_35px_rgba(220,38,38,0.35)] hover:bg-red-700 active:scale-[0.98]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Approval Confirmation Modal */}
      {showApprovalConfirm && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1.5px] overflow-hidden rounded-[20px] shadow-[0_32px_128px_rgba(0,0,0,0.2),0_0_60px_rgba(255,51,153,0.15)]">
            {/* Magic Border Animation */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-70" />

            <div className="bg-white rounded-[19px] w-[400px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              {/* Top glow accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

              <div className="p-8 pt-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-6 border border-pink-100 shadow-inner">
                  <Info className="w-8 h-8 text-pink-500 stroke-[1.5]" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">Send Confirmation?</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                  This will automatically send a confirmation email to <span className="text-slate-900 font-medium">{appointmentDetails?.customers?.email}</span>.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleFinalSend}
                    disabled={isSendingEmail}
                    className="w-full py-3.5 rounded-full bg-[#FF3399] text-white font-bold text-sm transition-all shadow-[0_10px_20px_rgba(255,51,153,0.2)] hover:shadow-[0_15px_30px_rgba(255,51,153,0.3)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : "Send Confirmation"}
                  </button>
                  <button
                    onClick={() => setShowApprovalConfirm(false)}
                    disabled={isSendingEmail}
                    className="w-full py-3.5 rounded-full bg-slate-50 text-slate-500 font-bold text-sm transition-all hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Rejection Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative p-[1.5px] overflow-hidden rounded-[20px] shadow-[0_32px_128px_rgba(220,38,38,0.2),0_0_60px_rgba(220,38,38,0.1)]">
            {/* Magic Border Animation (Red for Rejection) */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#dc2626_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-70" />

            <div className="bg-white rounded-[19px] w-[400px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
              {/* Top glow accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

              <div className="p-8 pt-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
                  <XCircle className="w-8 h-8 text-red-500 stroke-[1.5]" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">State Reason</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 px-4">
                  Please provide a reason for rejecting <span className="text-slate-900 font-medium">{appointmentDetails?.customer_name}</span>'s appointment.
                </p>

                <div className="mb-6">
                  {!isAddingReason ? (
                    <button
                      onClick={() => setIsAddingReason(true)}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-medium text-sm hover:border-red-200 hover:text-red-500 hover:bg-red-50/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Info className="w-4 h-4" />
                      Add Reason
                    </button>
                  ) : (
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Type the reason here (e.g., Staff unavailable)..."
                      className="w-full h-24 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none animate-in fade-in slide-in-from-top-2 duration-300"
                      autoFocus
                    />
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleFinalReject}
                    disabled={isSendingRejection}
                    className="w-full py-3.5 rounded-full bg-red-600 text-white font-bold text-sm transition-all shadow-[0_10px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_15px_30px_rgba(220,38,38,0.3)] hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingRejection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : "Send Rejection"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectConfirm(false);
                      setIsAddingReason(false);
                      setRejectionReason("");
                    }}
                    disabled={isSendingRejection}
                    className="w-full py-3.5 rounded-full bg-slate-50 text-slate-500 font-bold text-sm transition-all hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

