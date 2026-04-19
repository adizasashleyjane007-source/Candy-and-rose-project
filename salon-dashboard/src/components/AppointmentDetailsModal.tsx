"use client";

import { Calendar, X, Clock, User, Scissors, XCircle, Info, ExternalLink } from "lucide-react";

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
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

export default function AppointmentDetailsModal({ isOpen, onClose, appointment }: AppointmentDetailsModalProps) {
  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative p-[1.5px] overflow-hidden rounded-[20px] shadow-[0_32px_128px_rgba(0,0,0,0.15),0_0_60px_rgba(255,51,153,0.1)]">
        {/* Magic Border Animation */}
        <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0%,transparent_25%,#FF3399_50%,transparent_75%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-60" />

        <div className="bg-white rounded-[19px] w-[95vw] sm:w-[520px] h-auto min-h-[460px] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
          {/* Soft pink top glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3399]/40 to-transparent" />

          <div className="px-6 sm:px-10 py-8 sm:py-10 flex flex-col h-full">
            {/* Header: Name & Status */}
            <div className="flex justify-between items-start mb-8 sm:mb-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.3em] mb-3">Appointment Details</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {appointment.customer_name || appointment.customers?.name || "N/A"}
                </h2>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border shadow-[0_4px_10px_rgba(255,51,153,0.1)] ${appointment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  appointment.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-pink-50 text-[#FF3399] border-pink-100'
                  }`}>
                  {appointment.status}
                </span>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-6 h-6 stroke-[1.5]" />
                </button>
              </div>
            </div>

            {/* Grid: 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 sm:gap-y-8 mb-8 sm:mb-10">
              {/* Column 1: Date & Time */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                    <Calendar className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Date</span>
                    <span className="text-sm font-bold text-slate-800 leading-none">{appointment.appointment_date || appointment.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                    <Clock className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Time</span>
                    <span className="text-sm font-bold text-slate-800 leading-none">{formatAMPM(appointment.appointment_time || appointment.time)}</span>
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
                    <span className="text-sm font-bold text-slate-800 leading-none truncate max-w-[140px]">{appointment.service_name || appointment.services?.name || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                    <div className="text-xs font-bold text-pink-500">₱</div>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Total Price</span>
                    <span className="text-sm font-bold text-slate-800 leading-none">₱{Number(appointment.price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                  <User className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Staff Member</span>
                  <span className="text-sm font-bold text-slate-800 leading-none">{appointment.staff_name || appointment.staff?.name || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                  <ExternalLink className="w-5 h-5 text-pink-500 stroke-[1.5]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-1">Source</span>
                  <span className="text-sm font-bold text-slate-800 leading-none">{appointment.source || "Walk-in"}</span>
                </div>
              </div>
            </div>

            {/* Customer Note Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 mt-auto">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] block mb-3">Customer Note</span>
              <p className="text-sm font-normal text-slate-600 leading-relaxed italic">
                "{appointment.notes || "No special instructions provided for this appointment."}"
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-8 w-full py-4 rounded-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-pink-100"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
