"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, X, Clock, User, Scissors, ExternalLink, Eye, ZoomIn, CheckCircle2, ChevronDown, Loader2, AlertTriangle, Flag } from "lucide-react";
import { Appointments } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { calculateCustomerRisk, type CustomerRiskSummary } from "@/lib/customer-risk";
import { addNotification } from "@/lib/notifications";

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  customerRisk?: CustomerRiskSummary;
  onStatusChange?: (updatedAppointment: any) => void;
}

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

export function extractActualCustomerNote(rawNotes?: string | null): string {
  if (!rawNotes || typeof rawNotes !== "string") return "";

  // Split on pipe (|) or newline (\n)
  const segments = rawNotes.split(/\||\n/);
  const cleanSegments: string[] = [];

  for (const rawSeg of segments) {
    let seg = rawSeg.trim();
    if (!seg) continue;

    // Filter out automatically generated "Selected Design: ..." pattern
    if (/^Selected Design:/i.test(seg)) {
      continue;
    }

    // Filter out payment/screenshot technical system notes
    if (/^GCash Screenshot:/i.test(seg) || /^Payment Status:/i.test(seg) || /^Uploaded:/i.test(seg)) {
      continue;
    }

    // Strip inline "Selected Design: ..." if embedded in a sentence
    if (/Selected Design:/i.test(seg)) {
      seg = seg.replace(/Selected Design:\s*[^()]*(\([^)]*\))?/gi, "").trim();
    }

    if (seg) {
      cleanSegments.push(seg);
    }
  }

  return cleanSegments.join(" • ").trim();
}

export default function AppointmentDetailsModal({ isOpen, onClose, appointment, customerRisk, onStatusChange }: AppointmentDetailsModalProps) {
  const [previewModal, setPreviewModal] = useState<{ url: string; label: string; title: string } | null>(null);
  const [status, setStatus] = useState(appointment?.status || "Scheduled");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState("");
  const [currentRisk, setCurrentRisk] = useState<CustomerRiskSummary | null>(customerRisk || null);

  const fetchCustomerRisk = useCallback(async () => {
    const custId = appointment?.customer_id;
    const custName = appointment?.customer_name || appointment?.customers?.name;
    if (!custId && !custName) return;

    try {
      const supabase = createClient();
      let query = supabase.from("appointments").select("id, status, appointment_date, created_at, date");
      if (custId) {
        query = query.eq("customer_id", custId);
      } else {
        query = query.eq("customer_name", custName);
      }
      const { data } = await query;
      if (data) {
        const summary = calculateCustomerRisk(data, { id: custId, name: custName });
        setCurrentRisk(summary);
        return summary;
      }
    } catch (err) {
      console.warn("Failed to load customer risk:", err);
    }
    return null;
  }, [appointment]);

  useEffect(() => {
    if (appointment?.status) {
      setStatus(appointment.status);
    }
  }, [appointment]);

  useEffect(() => {
    if (customerRisk) {
      setCurrentRisk(customerRisk);
    } else {
      fetchCustomerRisk();
    }
  }, [customerRisk, fetchCustomerRisk]);

  if (!isOpen || !appointment) return null;

  const actualCustomerNote = extractActualCustomerNote(appointment.notes);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!appointment?.id || newStatus === status) return;
    try {
      setIsUpdatingStatus(true);
      const custName = appointment?.customer_name || appointment?.customers?.name || "Customer";
      const wasFlagged = Boolean(currentRisk?.isFlagged);

      await Appointments.update(appointment.id, { status: newStatus as any });
      setStatus(newStatus);
      setStatusSuccessMsg("Status updated!");
      setTimeout(() => setStatusSuccessMsg(""), 2500);
      const updatedRisk = await fetchCustomerRisk();

      // Trigger system alert if customer newly transitioned from NOT FLAGGED to FLAGGED
      if (!wasFlagged && updatedRisk?.isFlagged) {
        await addNotification(
          "⚠️ Customer Flagged",
          `${custName} has reached 2 cancelled/no-show appointments and has been flagged for review.`,
          "customer"
        );
      }

      onStatusChange?.({ ...appointment, status: newStatus });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent('appointment-updated', { detail: { id: appointment.id, status: newStatus } }));
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update appointment status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      {/* ─── Main Appointment Details Modal ───────────────────────── */}
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative p-[1.5px] overflow-hidden rounded-[24px] shadow-[0_24px_80px_rgba(0,0,0,0.18),0_0_50px_rgba(255,51,153,0.12)] w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Magic Animated Gradient Border */}
          <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-60" />

          <div className="bg-white rounded-[23px] w-full max-h-[90vh] overflow-hidden relative z-10 flex flex-col">
            {/* Soft pink top highlight line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

            {/* Header: Customer Name & Status (Fixed Top) */}
            <div className="px-5 py-4 sm:px-8 sm:py-5 flex justify-between items-center border-b border-pink-50/80 bg-white/80 shrink-0">
              <div className="flex flex-col min-w-0 pr-3">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                  Appointment Details
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate mt-0.5">
                  {appointment.customer_name || appointment.customers?.name || "N/A"}
                </h2>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shadow-[0_2px_8px_rgba(255,51,153,0.08)] ${
                  status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                  status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  status === 'no_show' || status === 'No-Show' ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-pink-50 text-[#FF3399] border-pink-100'
                }`}>
                  {status === 'no_show' ? 'No-Show' : status}
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>
            </div>

            {/* Status Update Bar for Admins */}
            <div className="px-5 py-2.5 sm:px-8 bg-pink-50/50 border-b border-pink-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Update Status:
                </span>
                {statusSuccessMsg && (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3 h-3" /> {statusSuccessMsg}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status === "Completed" ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    Completed (Locked)
                  </span>
                ) : (
                  <div className="relative inline-flex items-center">
                    <select
                      value={status}
                      disabled={isUpdatingStatus}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      className="text-xs font-bold text-pink-700 bg-white border border-pink-200 rounded-lg px-2.5 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer disabled:opacity-50 appearance-none shadow-xs"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress / Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="no_show">No-Show</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-pink-500 absolute right-1.5 pointer-events-none" />
                  </div>
                )}
                {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />}
              </div>
            </div>

            {/* Flagged Customer Warning (Only for 5+ failed bookings) */}
            {currentRisk?.isFlagged && (
              <div className="px-5 py-3 sm:px-8 bg-red-50 border-b border-red-200 flex items-start gap-3 shrink-0 text-left animate-in fade-in">
                <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0 text-red-600 mt-0.5 font-bold">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-red-900 uppercase tracking-wide">
                      ⚠️ Flagged Customer
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-200 text-red-800">
                      High No-Show Risk
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-red-800 mt-1">
                    This customer has {currentRisk.failedAppointments} cancelled/no-show bookings.
                  </p>
                  <p className="text-[11px] font-medium text-red-700 mt-1">
                    Please review the customer&apos;s appointment history before approving this appointment.
                  </p>
                </div>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto px-5 py-4 sm:px-8 sm:py-5 space-y-4.5 flex-1 text-slate-800">
              {/* Grid 1: Date & Time, Service & Total Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                {/* Date */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <Calendar className="w-4.5 h-4.5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Date</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{appointment.appointment_date || appointment.date}</span>
                  </div>
                </div>

                {/* Service */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <Scissors className="w-4.5 h-4.5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Service</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug truncate" title={appointment.service_name || appointment.services?.name || "N/A"}>
                      {appointment.service_name || appointment.services?.name || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <Clock className="w-4.5 h-4.5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Time</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{formatAMPM(appointment.appointment_time || appointment.time)}</span>
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <span className="text-xs font-bold text-pink-500">₱</span>
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Total Price</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">₱{Number(appointment.price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Staff Member & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 pt-2 border-t border-pink-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <User className="w-4.5 h-4.5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Staff Member</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{appointment.staff_name || appointment.staff?.name || "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100/80">
                    <ExternalLink className="w-4.5 h-4.5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em]">Source</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{appointment.source || "Walk-in"}</span>
                  </div>
                </div>
              </div>

              {/* Selected Nail Design Section (With Thumbnail & "View Image" Button) */}
              {(appointment.design_name || appointment.design_id || appointment.design_image) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/90 via-pink-100/40 to-purple-50/40 border border-pink-200/80 flex items-center gap-3.5 shadow-2xs">
                  {/* Thumbnail */}
                  <div
                    className={`relative shrink-0 rounded-xl overflow-hidden border border-pink-200/90 shadow-2xs bg-white group ${appointment.design_image ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (appointment.design_image) {
                        setPreviewModal({
                          url: appointment.design_image,
                          label: "Selected Nail Design Preview",
                          title: appointment.design_name || "Custom Nail Design",
                        });
                      }
                    }}
                    title={appointment.design_image ? "Click to enlarge image" : undefined}
                  >
                    {appointment.design_image ? (
                      <>
                        <img
                          src={appointment.design_image}
                          alt={appointment.design_name || "Selected Design"}
                          className="w-18 h-18 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4 drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <div className="w-18 h-18 sm:w-20 sm:h-20 bg-pink-100/80 flex items-center justify-center font-bold text-pink-600 text-xs">
                        💅
                      </div>
                    )}
                  </div>

                  {/* Design Info & "View Image" Button */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-600 block mb-0.5">
                        Selected Nail Design
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-snug">
                        {appointment.design_name || "Custom Nail Design"}
                      </h4>
                    </div>

                    {appointment.design_image && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewModal({
                            url: appointment.design_image,
                            label: "Selected Nail Design Preview",
                            title: appointment.design_name || "Custom Nail Design",
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-bold tracking-wide shadow-xs hover:shadow transition-all w-fit cursor-pointer active:scale-95 mt-0.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Image
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Hairstyle Reference Image Section (For Kids/Men/Women Haircut) */}
              {appointment.hairstyle_reference_image && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/90 via-pink-100/40 to-rose-50/40 border border-pink-200/80 flex items-center gap-3.5 shadow-2xs">
                  {/* Thumbnail */}
                  <div
                    className="relative shrink-0 rounded-xl overflow-hidden border border-pink-200/90 shadow-2xs bg-white group cursor-pointer"
                    onClick={() =>
                      setPreviewModal({
                        url: appointment.hairstyle_reference_image,
                        label: "Hairstyle Reference Photo",
                        title: `${appointment.customer_name || "Customer"}'s Preferred Hairstyle`,
                      })
                    }
                    title="Click to enlarge hairstyle reference photo"
                  >
                    <img
                      src={appointment.hairstyle_reference_image}
                      alt="Hairstyle Reference"
                      className="w-18 h-18 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-4 h-4 drop-shadow" />
                    </div>
                  </div>

                  {/* Info & "View Image" Button */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-600 block mb-0.5">
                        Hairstyle Reference Image
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate leading-snug">
                        Preferred Hairstyle Inspiration
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        Uploaded by customer for {appointment.service_name || "Haircut"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewModal({
                          url: appointment.hairstyle_reference_image,
                          label: "Hairstyle Reference Photo",
                          title: `${appointment.customer_name || "Customer"}'s Preferred Hairstyle`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-bold tracking-wide shadow-xs hover:shadow transition-all w-fit cursor-pointer active:scale-95 mt-0.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Image
                    </button>
                  </div>
                </div>
              )}

              {/* Customer Note Section (Only displayed if customer provided actual instructions) */}
              {actualCustomerNote ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-1.5">
                    Customer Note
                  </span>
                  <p className="text-xs sm:text-sm font-normal text-slate-600 leading-relaxed italic">
                    "{actualCustomerNote}"
                  </p>
                </div>
              ) : null}
            </div>

            {/* Footer Action (Fixed Bottom) */}
            <div className="px-5 py-3.5 sm:px-8 sm:py-4 border-t border-pink-50 bg-white shrink-0">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-pink-500/20 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Lightbox / Enlarged Image Preview Modal ──────────────────────── */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="relative max-w-[92vw] max-h-[88vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl p-3 sm:p-4 border border-white/20 shadow-2xl flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between gap-4 px-2 py-1 mb-2 text-white">
              <div className="flex flex-col min-w-0">
                <span className="text-[9.5px] uppercase font-bold tracking-widest text-pink-400">
                  {previewModal.label}
                </span>
                <h4 className="text-sm sm:text-base font-semibold truncate text-white">
                  {previewModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preserved Aspect-Ratio Image Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black/50 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewModal.url}
                alt={previewModal.title}
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-xl select-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
