"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Customers, Appointments, DownpaymentDB, type Appointment } from "@/lib/db";

interface CustomerIsLateModalProps {
  lateAppts: Appointment[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  gracePeriodMinutes: number;
  currentTime: Date;
  onMarkArrived: (apt: Appointment) => Promise<void>;
  onSnooze: (aptId: string, minutes: number) => void;
  onMarkNoShow: (apt: Appointment, downpaymentResolution?: "Forfeited" | "Refunded") => Promise<void>;
  onPhoneUpdated?: (aptId: string, phone: string) => void;
  onReschedule?: (apt: Appointment) => void;
}

// Format timestamp in Asia/Manila (e.g. "Thu, Nov 12 · 8:00 AM")
function formatScheduledTimeManila(scheduledTs: number): string {
  try {
    const d = new Date(scheduledTs);
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Manila" }).format(d);
    const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(d);
    const timeStr = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" }).format(d);
    return `${weekday}, ${monthDay} · ${timeStr}`;
  } catch {
    return "Scheduled time unavailable";
  }
}

export default function CustomerIsLateModal({
  lateAppts,
  currentIndex,
  onNavigate,
  gracePeriodMinutes,
  currentTime,
  onMarkArrived,
  onSnooze,
  onMarkNoShow,
  onPhoneUpdated,
  onReschedule,
}: CustomerIsLateModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const activeAppt = lateAppts[currentIndex] || null;

  // Contact number editing state
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Submitting states
  const [isArriving, setIsArriving] = useState(false);
  const [isProcessingNoShow, setIsProcessingNoShow] = useState(false);

  // No-Show confirmation / Downpayment modal state
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [dpResolutionChoice, setDpResolutionChoice] = useState<"Forfeited" | "Refunded">("Forfeited");

  // Screen reader announcement state
  const [srAnnouncement, setSrAnnouncement] = useState("");
  const announcedEndedMap = useRef<Set<string>>(new Set());

  // Focus modal on mount or when active appointment changes
  useEffect(() => {
    if (activeAppt) {
      modalRef.current?.focus();
      setIsAddingPhone(false);
      setPhoneInput("");
      setShowNoShowConfirm(false);
      setCopiedPhone(false);
    }
  }, [activeAppt?.id]);

  // Esc key snoozes for 5 minutes
  useEffect(() => {
    if (!activeAppt?.id) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSnooze(activeAppt.id!, 5);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAppt?.id, onSnooze]);

  // Calculate Scheduled Timestamp in Asia/Manila
  const scheduledTs = useMemo(() => {
    if (!activeAppt?.appointment_date) return null;
    let year = 0, month = 0, day = 0;
    const cleanDate = (activeAppt.appointment_date || "").split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const d = new Date(activeAppt.appointment_date);
      if (isNaN(d.getTime())) return null;
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }

    let hours = 0, minutes = 0;
    const timeVal = activeAppt.appointment_time || activeAppt.time;
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

    // Force Manila timezone (UTC+8)
    const pad = (n: number) => n.toString().padStart(2, "0");
    const isoString = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+08:00`;
    const parsed = Date.parse(isoString);
    return isNaN(parsed) ? new Date(year, month, day, hours, minutes).getTime() : parsed;
  }, [activeAppt]);

  // Time & countdown calculations
  const nowMs = currentTime.getTime();
  const graceSecs = Math.max(60, gracePeriodMinutes * 60);

  const { elapsedSecs, elapsedMinutes, remainingSecs, percentRemaining, isGraceEnded, remainingStr } = useMemo(() => {
    if (!scheduledTs) {
      return { elapsedSecs: 0, elapsedMinutes: 0, remainingSecs: graceSecs, percentRemaining: 100, isGraceEnded: false, remainingStr: `${gracePeriodMinutes}:00` };
    }
    const diffSecs = Math.max(0, Math.floor((nowMs - scheduledTs) / 1000));
    const elMins = Math.floor(diffSecs / 60);
    const remSecs = Math.max(0, graceSecs - diffSecs);
    const pct = Math.min(100, Math.max(0, (remSecs / graceSecs) * 100));
    const ended = remSecs <= 0;

    const rMin = Math.floor(remSecs / 60);
    const rSec = remSecs % 60;
    const remFormatted = `${rMin.toString().padStart(2, "0")}:${rSec.toString().padStart(2, "0")}`;

    return {
      elapsedSecs: diffSecs,
      elapsedMinutes: elMins,
      remainingSecs: remSecs,
      percentRemaining: pct,
      isGraceEnded: ended,
      remainingStr: remFormatted,
    };
  }, [scheduledTs, nowMs, graceSecs, gracePeriodMinutes]);

  // Announce grace period ended once to screen readers
  useEffect(() => {
    if (activeAppt?.id && isGraceEnded && !announcedEndedMap.current.has(activeAppt.id)) {
      announcedEndedMap.current.add(activeAppt.id);
      const name = activeAppt.customer_name || activeAppt.customers?.name || "Customer";
      setSrAnnouncement(`Grace period ended for ${name}`);
    }
  }, [activeAppt?.id, isGraceEnded, activeAppt]);

  if (!activeAppt || typeof document === "undefined") return null;

  // Timer Color States
  // > 50%: green, 20% - 50%: amber, < 20% or ended: red
  let timerTextColor = "text-emerald-600";
  let topBarColor = "bg-emerald-500";
  if (isGraceEnded || percentRemaining < 20) {
    timerTextColor = "text-rose-600";
    topBarColor = "bg-rose-500";
  } else if (percentRemaining <= 50) {
    timerTextColor = "text-amber-600";
    topBarColor = "bg-amber-500";
  }

  // Customer Data
  const customerName = activeAppt.customer_name || activeAppt.customers?.name || "Valued Customer";
  const phone = (activeAppt.customers?.phone || activeAppt.phone || "").trim();
  const staffName = activeAppt.staff_name || activeAppt.staff?.name || "Auto-assigned";
  const servicesText = activeAppt.service_name || activeAppt.services?.name || "Hair & Salon Services";
  const formattedScheduledTime = scheduledTs ? formatScheduledTimeManila(scheduledTs) : (activeAppt.appointment_date || "Today");

  // Downpayment Status
  const dpAmount = Number(activeAppt.downpayment_amount || 0);
  const dpPaid = Number(activeAppt.downpayment_paid || 0);
  const dpStatus = activeAppt.downpayment_status || (dpAmount > 0 ? "Pending" : "Not Required");
  const hasPaidDeposit = dpStatus === "Paid" || dpPaid > 0;

  let dpBadgeText = "Not required";
  let dpBadgeClass = "bg-gray-100 text-gray-600 border-gray-200";
  if (hasPaidDeposit) {
    dpBadgeText = `Paid ₱${(dpPaid || dpAmount).toLocaleString()}`;
    dpBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (dpStatus === "Waived") {
    dpBadgeText = "Waived";
    dpBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (dpStatus === "Pending" || dpAmount > 0) {
    dpBadgeText = `Pending (₱${dpAmount.toLocaleString()})`;
    dpBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
  }

  // Copy phone handler
  const handleCopyPhone = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Add / Save phone handler
  const handleSavePhone = async () => {
    if (!phoneInput.trim() || !activeAppt.id) return;
    setSavingPhone(true);
    try {
      const cleanPhone = phoneInput.trim();
      if (activeAppt.customer_id) {
        await Customers.update(activeAppt.customer_id, { phone: cleanPhone }).catch(() => {});
      }
      await Appointments.update(activeAppt.id, { phone: cleanPhone });
      onPhoneUpdated?.(activeAppt.id, cleanPhone);
      setIsAddingPhone(false);
      setPhoneInput("");
    } catch (err) {
      console.error("Failed to save customer phone:", err);
    } finally {
      setSavingPhone(false);
    }
  };

  // Mark arrived handler
  const handleArrivedClick = async () => {
    setIsArriving(true);
    try {
      await onMarkArrived(activeAppt);
    } finally {
      setIsArriving(false);
    }
  };

  // Mark No-Show handler with downpayment & early check
  const handleExecuteNoShow = async () => {
    setIsProcessingNoShow(true);
    try {
      if (hasPaidDeposit && DownpaymentDB?.recordAction) {
        await DownpaymentDB.recordAction({
          appointmentId: activeAppt.id!,
          action: dpResolutionChoice === "Refunded" ? "REFUNDED" : "FORFEITED",
          amount: dpPaid || dpAmount,
          recordedBy: "Staff / Administrator",
          notes: `Customer No-Show (${dpResolutionChoice})`,
        }).catch(() => {});
      }
      await onMarkNoShow(activeAppt, hasPaidDeposit ? dpResolutionChoice : undefined);
      setShowNoShowConfirm(false);
    } finally {
      setIsProcessingNoShow(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Screen Reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>

      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="customer-late-title"
        aria-describedby="customer-late-subtitle"
        tabIndex={-1}
        className="bg-white rounded-[2rem] w-full max-w-[460px] max-h-[90vh] shadow-2xl border border-gray-100 overflow-hidden relative z-10 flex flex-col animate-in zoom-in-95 duration-200 focus:outline-none"
      >
        {/* Thin solid line whose colour follows timer state */}
        <div className={`h-1 w-full transition-colors duration-500 shrink-0 ${topBarColor}`} />

        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(90vh-4px)] flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="customer-late-title" className="text-xl font-bold text-gray-900 tracking-tight">
                  Customer is late
                </h3>
                {lateAppts.length > 1 && (
                  <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-[11px] font-semibold text-gray-600">
                    <span>{currentIndex + 1} of {lateAppts.length}</span>
                    <button
                      type="button"
                      aria-label="Previous customer"
                      onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className="hover:text-pink-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next customer"
                      onClick={() => onNavigate(Math.min(lateAppts.length - 1, currentIndex + 1))}
                      disabled={currentIndex >= lateAppts.length - 1}
                      className="hover:text-pink-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-0.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p id="customer-late-subtitle" className="text-xs font-semibold text-pink-500 mt-0.5">
                {gracePeriodMinutes}-minute grace period active
              </p>
            </div>

            {/* Close / Snooze (✕) */}
            <button
              type="button"
              aria-label="Snooze alert for 5 minutes"
              title="Snooze for 5 minutes"
              onClick={() => onSnooze(activeAppt.id!, 5)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors -mr-1 -mt-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timer Display */}
          <div className="py-3 px-4 rounded-2xl border border-gray-100 bg-gray-50/70 text-center my-3 transition-all">
            {isGraceEnded ? (
              <div>
                <div className="text-xl sm:text-2xl font-bold text-rose-600 tracking-tight">
                  Grace period ended
                </div>
                <span className="text-xs font-semibold text-gray-500 mt-0.5 block">
                  Late by {elapsedMinutes} min
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${timerTextColor}`}>
                  {remainingStr}
                </div>
                <div className="text-left border-l border-gray-200 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block leading-tight">
                    Remaining
                  </span>
                  <span className="text-xs font-semibold text-gray-600 block mt-0.5">
                    Late by {elapsedMinutes} min
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Details 2-Column List */}
          <div className="bg-gray-50/90 rounded-2xl p-3.5 border border-gray-100 space-y-2 text-xs mb-4">
            {/* Customer */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Customer</span>
              <span className="font-bold text-gray-900 text-right truncate">{customerName}</span>
            </div>

            {/* Contact */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Contact</span>
              {phone ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{phone}</span>
                  <a
                    href={`tel:${phone}`}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-700 underline transition-colors"
                  >
                    Call
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md hover:bg-gray-50 transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedPhone ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : isAddingPhone ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0917..."
                    className="w-24 px-2 py-0.5 text-xs bg-white border border-pink-200 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    disabled={savingPhone || !phoneInput.trim()}
                    className="px-2 py-0.5 text-[11px] font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-md disabled:opacity-50 cursor-pointer"
                  >
                    {savingPhone ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingPhone(false); setPhoneInput(""); }}
                    className="px-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 italic">No contact number</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingPhone(true)}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer"
                  >
                    Add number
                  </button>
                </div>
              )}
            </div>

            {/* Service(s) */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Service(s)</span>
              <span className="font-bold text-gray-900 text-right truncate max-w-[240px]" title={servicesText}>
                {servicesText}
              </span>
            </div>

            {/* Assigned Staff */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Assigned Staff</span>
              <span className="font-bold text-gray-900 text-right truncate">{staffName}</span>
            </div>

            {/* Scheduled Time */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Scheduled Time</span>
              <span className="font-bold text-gray-900">{formattedScheduledTime}</span>
            </div>

            {/* How Late */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Late By</span>
              <span className="font-bold text-rose-600">Late by {elapsedMinutes} min</span>
            </div>

            {/* Downpayment Status */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-gray-200/60">
              <span className="font-semibold text-gray-400 uppercase text-[10px] tracking-wider shrink-0">Downpayment</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${dpBadgeClass}`}>
                {dpBadgeText}
              </span>
            </div>
          </div>

          {/* No-Show Confirmation / Deposit Choice Step */}
          {showNoShowConfirm ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl mb-3 space-y-2.5 animate-in fade-in">
              <p className="text-xs font-bold text-rose-900">
                {!isGraceEnded
                  ? `Grace period is still active (${remainingStr} remaining). Confirm No-Show?`
                  : "Confirm marking this customer as No-Show?"}
              </p>

              {hasPaidDeposit && (
                <div className="space-y-1.5 pt-1 border-t border-rose-200/80">
                  <span className="text-[11px] font-bold text-gray-700 block">
                    Paid Downpayment: ₱{(dpPaid || dpAmount).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${dpResolutionChoice === 'Forfeited' ? 'border-rose-500 bg-white text-rose-700 shadow-2xs' : 'border-rose-200 text-gray-600 bg-rose-100/40'}`}>
                      <input
                        type="radio"
                        name="dpChoice"
                        value="Forfeited"
                        checked={dpResolutionChoice === "Forfeited"}
                        onChange={() => setDpResolutionChoice("Forfeited")}
                        className="sr-only"
                      />
                      <span>Forfeit Deposit</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${dpResolutionChoice === 'Refunded' ? 'border-rose-500 bg-white text-rose-700 shadow-2xs' : 'border-rose-200 text-gray-600 bg-rose-100/40'}`}>
                      <input
                        type="radio"
                        name="dpChoice"
                        value="Refunded"
                        checked={dpResolutionChoice === "Refunded"}
                        onChange={() => setDpResolutionChoice("Refunded")}
                        className="sr-only"
                      />
                      <span>Refund Deposit</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNoShowConfirm(false)}
                  disabled={isProcessingNoShow}
                  className="flex-1 py-1.5 rounded-full bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteNoShow}
                  disabled={isProcessingNoShow}
                  className="flex-1 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isProcessingNoShow ? "Updating..." : "Confirm No-Show"}
                </button>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary: Mark as arrived (no icon inside) */}
            <button
              type="button"
              onClick={handleArrivedClick}
              disabled={isArriving}
              className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isArriving ? "Updating..." : "Mark as arrived"}
            </button>

            {/* Snooze & Reschedule Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSnooze(activeAppt.id!, 5)}
                className="flex-1 py-2 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer text-center"
              >
                Remind me in 5 min
              </button>
              <button
                type="button"
                onClick={() => onSnooze(activeAppt.id!, 10)}
                className="py-2 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
                title="Snooze for 10 minutes"
              >
                10 min
              </button>
              {onReschedule && (
                <button
                  type="button"
                  onClick={() => onReschedule(activeAppt)}
                  className="py-2 px-3.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-600 font-semibold text-xs border border-pink-200 transition-colors cursor-pointer"
                >
                  Reschedule
                </button>
              )}
            </div>

            {/* Mark as No-Show */}
            {!showNoShowConfirm && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowNoShowConfirm(true)}
                  className={`w-full py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isGraceEnded
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                      : "bg-gray-50 hover:bg-rose-50 text-rose-600 border border-rose-200"
                  }`}
                >
                  {isGraceEnded ? "Mark as no-show" : "Mark as no-show (Early)"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

